import { Router } from 'express';
import * as conversationController from '../controllers/conversation.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/', authenticate, conversationController.create);
router.get('/', authenticate, conversationController.list);
router.get('/:id/messages', authenticate, conversationController.getMessages);

export default router;
