import { Router } from 'express';
import * as groupController from '../controllers/group.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

/**
 * @openapi
 * /groups:
 *   post:
 *     tags: [Groups]
 *     summary: Crear un grupo
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, memberIds]
 *             properties:
 *               name: { type: string, example: "Amigos" }
 *               memberIds:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["user-id-2", "user-id-3"]
 *     responses:
 *       201:
 *         description: Grupo creado
 */
router.post('/', authenticate, groupController.create);

/**
 * @openapi
 * /groups:
 *   get:
 *     tags: [Groups]
 *     summary: Listar grupos del usuario
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de grupos
 */
router.get('/', authenticate, groupController.list);

/**
 * @openapi
 * /groups/{id}:
 *   get:
 *     tags: [Groups]
 *     summary: Detalle del grupo
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Datos del grupo
 */
router.get('/:id', authenticate, groupController.getById);

/**
 * @openapi
 * /groups/{id}/members:
 *   post:
 *     tags: [Groups]
 *     summary: Agregar miembros al grupo
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memberIds]
 *             properties:
 *               memberIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Miembros agregados
 */
router.post('/:id/members', authenticate, groupController.addMembers);

/**
 * @openapi
 * /groups/{id}/members/{userId}:
 *   delete:
 *     tags: [Groups]
 *     summary: Eliminar miembro del grupo (solo creador)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Miembro eliminado
 */
router.delete('/:id/members/:userId', authenticate, groupController.removeMember);

export default router;
