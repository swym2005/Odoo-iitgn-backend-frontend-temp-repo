import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { myProjects, myTasks, createMyTask } from '../controllers/team.controller.js';

const router = express.Router();
router.use(requireAuth);

router.get('/projects', myProjects);
router.get('/tasks', myTasks);
router.post('/projects/:projectId/tasks', createMyTask);

export default router;
