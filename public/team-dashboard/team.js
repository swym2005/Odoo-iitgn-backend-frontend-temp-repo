// Team Dashboard logic (restricts to tasks assigned to the team member without hitting PM-only routes excessively)
(function(){
  const { api, ui } = window.FlowIQ;
  function currentUser(){ try{return JSON.parse(localStorage.getItem('flowiq_user')||'null');}catch{return null;} }
  const me = currentUser();
  const tbody = () => document.querySelector('#tblMyTasks tbody');
  let myProjects = [];

  async function fetchProjects(){
    // Use dedicated team endpoint (no PM role required)
    try {
      const res = await api.get('/team/projects');
      myProjects = res.projects || [];
    } catch(e){ myProjects = []; }
    return myProjects;
  }

  function enforceRoleAccess(){
    // Ensure only team members / managers see this dashboard
    const u = me;
    if(!u){ window.location.href='/'; return; }
    // If user role is admin or finance etc, optionally redirect; adjust based on roles list
    if(['Admin','Finance','PM'].includes(u.role)){
      // They have dedicated dashboards; redirect them out
      window.location.href = '/';
    }
  }

  async function fetchTasks(){
    // Get tasks assigned to me across projects
    try{
      const res = await api.get('/team/tasks');
      return res.tasks || [];
    }catch(e){ return []; }
  }

  function render(list){
    tbody().innerHTML='';
    let open=0, done=0;
    list.forEach(t=>{
      if(t.status==='done') done++; else open++;
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${t.title}</td><td>${t.status}</td><td>${t.priority}</td><td>${t.dueDate? new Date(t.dueDate).toISOString().slice(0,10):''}</td><td>${t.project?.name||''}</td>`;
      tbody().appendChild(tr);
    });
    document.getElementById('kpiOpen').textContent=open;
    document.getElementById('kpiDone').textContent=done;
    // hours KPI optional via timesheets aggregation; skipping for now
  }

  async function populateProjectSelect(){
    const select = document.getElementById('tProjectSelect');
    select.innerHTML='';
    myProjects.forEach(p=>{
      const opt=document.createElement('option');
      opt.value=p._id; opt.textContent=p.name; select.appendChild(opt);
    });
    if(!myProjects.length){
      const opt=document.createElement('option'); opt.textContent='No accessible projects'; opt.disabled=true; select.appendChild(opt);
    }
    const newBtn = document.getElementById('btnNewTask');
    if(newBtn){
      if(!myProjects.length){
        newBtn.setAttribute('disabled','disabled');
        newBtn.title='No accessible projects to create tasks';
      } else {
        newBtn.removeAttribute('disabled');
        newBtn.title='Create a task in a selected project';
      }
    }
  }

  async function createTask(){
    const title = document.getElementById('tTitle').value.trim();
    if(!title) return alert('Title required');
    const desc = document.getElementById('tDesc').value.trim();
    const due = document.getElementById('tDue').value || null;
    const priority = document.getElementById('tPriority').value || 'medium';
    if(!myProjects.length){ alert('No accessible project found'); return; }
    const projectId = document.getElementById('tProjectSelect').value;
    const payload = { title, description: desc, assignee: me?._id, dueDate: due, priority };
    try {
      await api.post(`/team/projects/${projectId}/tasks`, payload);
      ui.closeModal('modalTask');
      start();
    } catch(e){ alert(e.message); }
  }

  async function start(){
    // load projects first so user sees selectable list
    await fetchProjects();
    await populateProjectSelect();
    const tasks = await fetchTasks();
    render(tasks);
  }
  document.addEventListener('DOMContentLoaded',()=>{
    enforceRoleAccess();
    document.getElementById('btnNewTask').addEventListener('click',()=> {
      populateProjectSelect();
      ui.openModal('modalTask');
    });
    document.getElementById('tCreateBtn').addEventListener('click', createTask);
    ui.bindClose();
    start();
  });
})();