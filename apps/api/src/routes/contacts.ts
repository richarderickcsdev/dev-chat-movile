import { Router } from 'express';
import * as contactController from '../controllers/contact.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/sync', authenticate, contactController.sync);
router.get('/', authenticate, contactController.list);
router.delete('/:id', authenticate, contactController.remove);

export default router;
