import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth';
import { upload } from '../config/uploads';

const router = Router();

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Obtener perfil propio
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Perfil del usuario
 */
router.get('/me', authenticate, userController.getMe);

/**
 * @openapi
 * /users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Actualizar nombre y bio
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "Alice" }
 *               bio: { type: string, example: "Hola!" }
 *     responses:
 *       200:
 *         description: Perfil actualizado
 */
router.patch('/me', authenticate, userController.updateMe);

/**
 * @openapi
 * /users/me/avatar:
 *   post:
 *     tags: [Users]
 *     summary: Subir avatar
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Avatar actualizado
 */
router.post('/me/avatar', authenticate, upload.single('avatar'), userController.uploadAvatar);

/**
 * @openapi
 * /users/search:
 *   get:
 *     tags: [Users]
 *     summary: Buscar usuarios por telefono
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de usuarios encontrados
 */
router.get('/search', authenticate, userController.searchUsers);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Perfil publico de un usuario
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Perfil publico
 */
router.get('/:id', userController.getUserById);

export default router;
