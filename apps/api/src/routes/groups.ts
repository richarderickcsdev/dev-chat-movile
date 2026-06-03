import { Router } from 'express';
import * as groupController from '../controllers/group.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/', authenticate, groupController.create);
router.get('/', authenticate, groupController.list);
router.get('/:id', authenticate, groupController.getById);
router.post('/:id/members', authenticate, groupController.addMembers);
router.delete('/:id/members/:userId', authenticate, groupController.removeMember);

export default router;
