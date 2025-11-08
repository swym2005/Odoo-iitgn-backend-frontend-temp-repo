import mongoose from 'mongoose';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';

export const myProjects = async (req, res, next) => {
  try {
    const uid = new mongoose.Types.ObjectId(req.user.id);
    const projects = await Project.find({ teamMembers: uid })
      .select('name client status budget deadline manager teamMembers')
      .lean();
    res.json({ success: true, projects });
  } catch (e) { next(e); }
};

export const myTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ assignee: req.user.id }).populate('project','name').lean();
    res.json({ success: true, tasks });
  } catch (e) { next(e); }
};

export const createMyTask = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findOne({ _id: projectId, teamMembers: req.user.id });
    if (!project) { const err = new Error('Forbidden'); err.status = 403; throw err; }
    const { title, description, priority = 'medium', dueDate } = req.body;
    if(!title){ const err = new Error('Title is required'); err.status = 400; throw err; }
    const created = await Task.create({ title, description, priority, dueDate, project: projectId, assignee: req.user.id, status: 'todo' });
    res.status(201).json({ success: true, task: created });
  } catch (e) { next(e); }
};
