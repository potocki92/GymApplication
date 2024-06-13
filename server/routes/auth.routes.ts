import express, { Router } from "express";
import { signup } from "../controllers/user.controller";
import {
  addUserValidator,
  addUserValidatorHandler,
} from "../middlewares/users/usersValidator";
import { sendVerificationEmail } from "../middlewares/users/varifyEmail";

const router: Router = express.Router();
/**
 * @swagger
 * /auth/users/signup:
 *   post:
 *     summary: User sign-up
 *     description: Register a new user.
 *     tags:
 *       - User
 *     parameters:
 *       - in: body
 *         name: user
 *         description: The user to create.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             username:
 *               type: string
 *               example: mpotokci
 *             email:
 *               type: string
 *               example: mateusz.potocki92@gmail.com
 *             password:
 *               type: string
 *               example: 123123
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: Created
 *                 code:
 *                   type: integer
 *                   example: 201
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         email:
 *                           type: string
 *                           example: user@example.com
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Validation error message
 *       409:
 *         description: Conflict
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: Error
 *                 code:
 *                   type: integer
 *                   example: 409
 *                 message:
 *                   type: string
 *                   example: Email in use
 *                 data:
 *                   type: string
 *                   example: Conflict
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: Error
 *                 code:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: Server error
 */
router.post(
  "/signup",
  addUserValidator,
  addUserValidatorHandler,
  signup,
  sendVerificationEmail
);

export default router;
