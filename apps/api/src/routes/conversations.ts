import { Router } from 'express';
import * as conversationController from '../controllers/conversation.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

/**
 * @openapi
 * /conversations:
 *   post:
 *     tags: [Conversations]
 *     summary: Crear conversacion con otro usuario
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [participantId]
 *             properties:
 *               participantId: { type: string, example: "user-id-2" }
 *     responses:
 *       201:
 *         description: Conversacion creada o existente
 */
router.post('/', authenticate, conversationController.create);

/**
 * @openapi
 * /conversations:
 *   get:
 *     tags: [Conversations]
 *     summary: Listar conversaciones del usuario
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de conversaciones
 */
router.get('/', authenticate, conversationController.list);

/**
 * @openapi
 * /conversations/{id}/messages:
 *   get:
 *     tags: [Conversations]
 *     summary: Mensajes de una conversacion (paginacion cursor)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: before
 *         schema: { type: string }
 *         description: messageId del mensaje mas viejo para paginar
 *     responses:
 *       200:
 *         description: Lista de mensajes
 */
router.get('/:id/messages', authenticate, conversationController.getMessages);

router.delete('/:id', authenticate, conversationController.remove);

export default router;
