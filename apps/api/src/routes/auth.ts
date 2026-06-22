import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authLimiter, refreshLimiter } from '../middlewares/security';

const router = Router();

/**
 * @openapi
 * /auth/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Envia codigo OTP al telefono
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone: { type: string, example: "+51999000001" }
 *     responses:
 *       200:
 *         description: Codigo enviado (revisar logs en dev)
 */
router.post('/send-otp', authLimiter, authController.sendOtp);

/**
 * @openapi
 * /auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verifica OTP y devuelve tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, code]
 *             properties:
 *               phone: { type: string, example: "+51999000001" }
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId: { type: string }
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 */
router.post('/verify-otp', authLimiter, authController.verifyOtp);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renueva el access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Token renovado
 */
router.post('/refresh', refreshLimiter, authController.refreshToken);

export default router;
