import { Router } from 'express';
import { login, register, getMe, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);
router.patch('/me/password', protect, changePassword);

export default router;
