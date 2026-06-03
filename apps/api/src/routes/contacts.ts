import { Router } from 'express';
import * as contactController from '../controllers/contact.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

/**
 * @openapi
 * /contacts/sync:
 *   post:
 *     tags: [Contacts]
 *     summary: Sincronizar agenda del celular
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phones]
 *             properties:
 *               phones:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["+51999000001", "+51999000002"]
 *     responses:
 *       200:
 *         description: Contactos sincronizados
 */
router.post('/sync', authenticate, contactController.sync);

/**
 * @openapi
 * /contacts:
 *   get:
 *     tags: [Contacts]
 *     summary: Lista de contactos
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de contactos
 */
router.get('/', authenticate, contactController.list);

/**
 * @openapi
 * /contacts/{id}:
 *   delete:
 *     tags: [Contacts]
 *     summary: Eliminar un contacto
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contacto eliminado
 */
router.delete('/:id', authenticate, contactController.remove);

export default router;
