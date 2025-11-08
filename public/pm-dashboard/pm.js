(function(){
  const { api, ui } = window.FlowIQ;
  const tbody = () => document.querySelector('#tblProjects tbody');
  let selected=null;

  async function loadProjects(){
    const res = await api.get('/pm/projects');
    return res.projects || [];
  }

  async function loadKPIs(){
    const res = await api.get('/pm/dashboard');
    const k = res.KPIs || {};
    document.getElementById('kpiActive').textContent = k.activeProjects ?? '0';
    document.getElementById('kpiProfit').textContent = ((k.profitPercent||0)*100).toFixed(1)+'%';
    document.getElementById('kpiHours').textContent = (k.hoursLogged||0)+'h'; // default (all projects)
    document.getElementById('kpiPending').textContent = k.pendingApprovals ?? '0';
  }

  async function updateHoursForSelected(){
    if(!selected) return;
    try{
      const res = await api.get(`/pm/projects/${selected._id}/timesheets`);
      const total = (res.timesheets||[]).reduce((s,t)=> s + Number(t.hours||0), 0);
      document.getElementById('kpiHours').textContent = total + 'h';
    }catch(e){ /* keep default if fails */ }
  }

  function render(list){
    tbody().innerHTML='';
    if(!Array.isArray(list) || list.length===0){
      const tr=document.createElement('tr');
      tr.innerHTML="<td colspan='7' style='padding:1.2rem;text-align:center;opacity:.6'>No projects found for your scope. If you just added projects, ensure the backend restarted (nodemon) and your role is 'Project Manager'.</td>";
      tbody().appendChild(tr);
      return;
    }
    list.forEach(p=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${p.name}</td><td>${p.client||''}</td><td>${p.status}</td><td>₹ ${(p.budget||0).toLocaleString()}</td><td>${p.revenue? ((p.revenue-p.cost)/p.revenue*100).toFixed(1)+'%':'--'}</td><td>${p.deadline? new Date(p.deadline).toISOString().slice(0,10):''}</td><td><button class='table-btn btn-select' data-id='${p._id}'>Select</button></td>`;
  tr.addEventListener('click',()=>{ selected=p; document.querySelectorAll('#tblProjects tbody tr').forEach(r=>r.classList.remove('row-selected')); tr.classList.add('row-selected'); updateHoursForSelected(); });
      tbody().appendChild(tr);
    });
    // bind select buttons
  document.querySelectorAll('.btn-select').forEach(btn=> btn.addEventListener('click',e=>{ e.stopPropagation(); const id=btn.dataset.id; const proj=list.find(x=> String(x._id)===id); if(proj){ selected=proj; document.querySelectorAll('#tblProjects tbody tr').forEach(r=>r.classList.remove('row-selected')); btn.closest('tr').classList.add('row-selected'); updateHoursForSelected(); } }));
  }

  function buildProjectKanban(projects){
    const container=document.getElementById('projectKanban');
    if(!container) return;
    const statuses=['planning','active','on-hold','completed','cancelled'];
    container.innerHTML='';
    statuses.forEach(st=>{
      const col=document.createElement('div');
      col.className='project-col';
      col.style.cssText='background:#141e2e;border:1px solid #26344a;border-radius:16px;padding:.7rem .75rem;display:flex;flex-direction:column;gap:.6rem;min-height:200px;';
      col.innerHTML=`<h3 style='margin:.2rem 0 .4rem;font-size:.7rem;letter-spacing:.5px;text-transform:uppercase;color:#9aa9bd'>${st}</h3>`;
      const wrap=document.createElement('div'); wrap.className='proj-cards'; wrap.style.cssText='display:flex;flex-direction:column;gap:.55rem;';
      // Enable drop for status change
      wrap.dataset.status = st;
      wrap.addEventListener('dragover',e=>{ e.preventDefault(); wrap.style.outline='2px dashed #4f9fff55'; });
      wrap.addEventListener('dragleave',()=>{ wrap.style.outline='none'; });
      wrap.addEventListener('drop',async e=>{
        e.preventDefault(); wrap.style.outline='none';
        const id = e.dataTransfer.getData('text/plain');
        if(!id) return;
        try{ await api.patch(`/pm/projects/${id}`, { status: st }); start(); }catch(err){ alert('Failed to move project: '+err.message); }
      });
      projects.filter(p=>p.status===st).forEach(p=>{
        const card=document.createElement('div');
        card.className='proj-card';
        card.style.cssText='background:#182335;border:1px solid #26344a;border-radius:12px;padding:.6rem .65rem;font-size:.68rem;display:grid;gap:.3rem;cursor:pointer;';
        card.setAttribute('draggable','true');
        card.addEventListener('dragstart',e=>{ e.dataTransfer.setData('text/plain', p._id); });
        const profit = p.revenue? ((p.revenue-p.cost)/p.revenue*100).toFixed(1)+'%':'--';
        card.innerHTML=`<div style='font-weight:600;font-size:.72rem'>${p.name}</div>
          <div style='display:flex;justify-content:space-between;gap:.4rem'>
            <span style='opacity:.7'>Client:</span><span>${p.client||'—'}</span>
          </div>
          <div style='display:flex;justify-content:space-between;gap:.4rem'>
            <span style='opacity:.7'>Budget:</span><span>₹ ${(p.budget||0).toLocaleString()}</span>
          </div>
          <div style='display:flex;justify-content:space-between;gap:.4rem'>
            <span style='opacity:.7'>Profit:</span><span>${profit}</span>
          </div>
          <div style='display:flex;justify-content:space-between;gap:.4rem'>
            <span style='opacity:.7'>Deadline:</span><span>${p.deadline? new Date(p.deadline).toISOString().slice(0,10):'—'}</span>
          </div>`;
        card.addEventListener('click',()=>{
          selected=p;
          updateHoursForSelected();
          // highlight selection (optional visual)
          document.querySelectorAll('.proj-card').forEach(c=> c.style.outline='none');
          card.style.outline='2px solid #4f9fff55';
        });
        wrap.appendChild(card);
      });
      col.appendChild(wrap);
      container.appendChild(col);
    });
  }

  function charts(){ api.get('/pm/analytics').then(res=>{ if(!window.Chart) return; const cvr=document.getElementById('chartCvR'); const util=document.getElementById('chartUtil'); const cvrLabels=res.projectProgress.map(p=>p.name); const costData=res.costVsRevenue.map(x=>x.cost); const revData=res.costVsRevenue.map(x=>x.revenue); new Chart(cvr,{ type:'line', data:{ labels:cvrLabels, datasets:[{ label:'Cost', data:costData, borderColor:'#ef4444', backgroundColor:'#ef444433' },{ label:'Revenue', data:revData, borderColor:'#10b981', backgroundColor:'#10b98133' }] }, options:{ plugins:{legend:{labels:{color:'#e6edf5'}}}, scales:{x:{ticks:{color:'#9aa9bd'}},y:{ticks:{color:'#9aa9bd'}}}} }); const utilLabels=res.utilization.map(u=>u.userId); const utilData=res.utilization.map(u=> Math.round(u.utilization*100)); new Chart(util,{ type:'bar', data:{ labels:utilLabels, datasets:[{ label:'Utilization %', data:utilData, backgroundColor:'#4f9fff55', borderColor:'#4f9fff' }] }, options:{ plugins:{legend:{labels:{color:'#e6edf5'}}}, scales:{x:{ticks:{color:'#9aa9bd'}},y:{ticks:{color:'#9aa9bd'}}}} }); }).catch(()=>{}); }

  async function createProject(){
    const name=document.getElementById('pName').value.trim(); if(!name) return alert('Project name required');
    const desc=document.getElementById('pDesc').value.trim();
    const budget=Number(document.getElementById('pBudget').value||0);
    const deadline=document.getElementById('pDeadline').value||null;
    // parse team emails if provided (optional enhancement later to map to ids)
    const teamRaw = (document.getElementById('pTeam').value||'').trim();
    const manager = (window.FlowIQ.auth.user() && (window.FlowIQ.auth.user()._id || window.FlowIQ.auth.user().id)) || undefined;
    const payload = { name, description:desc, budget, deadline, manager };
    try{ await api.post('/pm/projects', payload); ui.closeModal('modalProject'); start(); }catch(e){ alert(e.message); }
  }

  async function loadPendingExpenses(){
    if(!selected) return alert('Select a project');
    try{ const res = await api.get(`/pm/projects/${selected._id}/expenses`); const pend=(res.expenses||[]).filter(e=> e.status==='pending'); const body=document.querySelector('#tblPendExp tbody'); body.innerHTML=''; pend.forEach(e=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${e.description||e.expenseName||''}</td><td>₹ ${(e.amount||0).toLocaleString()}</td><td>${e.submittedBy?.name||''}</td><td>${e.date? new Date(e.date).toISOString().slice(0,10):''}</td><td><button class='table-btn approve' data-id='${e._id}'>Approve</button><button class='table-btn reject' data-id='${e._id}'>Reject</button></td>`; body.appendChild(tr); }); body.querySelectorAll('.approve').forEach(b=> b.addEventListener('click',()=> changeExpenseStatus(b.dataset.id,'approve'))); body.querySelectorAll('.reject').forEach(b=> b.addEventListener('click',()=> changeExpenseStatus(b.dataset.id,'reject'))); ui.openModal('modalExp'); }catch(err){ alert('Failed to load expenses'); }
  }
  async function changeExpenseStatus(id,action){
    try{ await api.post(`/pm/projects/${selected._id}/expenses/${id}/${action==='approve'?'approve':'reject'}`,{}); await loadPendingExpenses(); }catch(e){ alert('Update failed'); }
  }

  function bind(){
    document.getElementById('btnNewProj').addEventListener('click',()=> { 
      // reset form for create
      document.getElementById('pName').value='';
      document.getElementById('pDesc').value='';
      document.getElementById('pBudget').value='';
      document.getElementById('pDeadline').value='';
      const btn=document.getElementById('pCreateBtn');
      btn.textContent='Create';
      btn.onclick=createProject;
      ui.openModal('modalProject');
    });
    document.getElementById('pCreateBtn').addEventListener('click', createProject);
    ui.bindClose();
    document.getElementById('btnView').addEventListener('click',()=>{ if(!selected) return alert('Select a project'); window.location.href='/project-detail/?id='+selected._id; });
    document.getElementById('btnTask').addEventListener('click',()=>{ if(!selected) return alert('Select a project'); window.location.href='/tasks/?projectId='+selected._id; });
    const approveBtn=document.getElementById('btnApprove'); if(approveBtn){ approveBtn.addEventListener('click', loadPendingExpenses); }
    const editBtn=document.getElementById('btnEdit'); if(editBtn){ editBtn.addEventListener('click',()=>{ if(!selected) return alert('Select a project'); openEditModal(selected); }); }
    const delBtn=document.getElementById('btnDelete'); if(delBtn){ delBtn.addEventListener('click',()=>{ if(!selected) return alert('Select a project'); if(confirm('Delete project? This cannot be undone.')) deleteProject(selected._id); }); }
    const toggleList=document.getElementById('toggleList'); const toggleKanban=document.getElementById('toggleKanban');
    if(toggleList && toggleKanban){
      toggleList.addEventListener('click',()=>{
        document.getElementById('projectsListSection').classList.remove('hidden');
        document.getElementById('projectsKanbanSection').classList.add('hidden');
      });
      toggleKanban.addEventListener('click',()=>{
        document.getElementById('projectsKanbanSection').classList.remove('hidden');
        document.getElementById('projectsListSection').classList.add('hidden');
      });
    }
  }

  function openEditModal(p){
    // reuse create modal fields for edit for simplicity
    ui.openModal('modalProject');
    document.getElementById('pName').value=p.name||'';
    document.getElementById('pDesc').value=p.description||'';
    document.getElementById('pBudget').value=p.budget||0;
    document.getElementById('pDeadline').value=p.deadline? new Date(p.deadline).toISOString().slice(0,10):'';
    // Replace create button handler
    const btn=document.getElementById('pCreateBtn');
    btn.textContent='Save';
    btn.onclick=async ()=>{
      const payload={
        name:document.getElementById('pName').value.trim(),
        description:document.getElementById('pDesc').value.trim(),
        budget:Number(document.getElementById('pBudget').value||0),
        deadline:document.getElementById('pDeadline').value||null,
      };
      try{ await api.patch(`/pm/projects/${p._id}`, payload); ui.closeModal('modalProject'); btn.textContent='Create'; btn.onclick=createProject; start(); }catch(e){ alert(e.message); }
    };
  }

  async function deleteProject(id){
    try{ await api.del(`/pm/projects/${id}`); selected=null; start(); }catch(e){ alert('Delete failed: '+e.message); }
  }

  async function start(){
    try{ const projects = await loadProjects(); render(projects); buildProjectKanban(projects); await loadKPIs(); charts(); }catch(e){ alert('Failed to load projects: '+e.message); }
  }
  document.addEventListener('DOMContentLoaded',()=>{ bind(); start(); });
})();
