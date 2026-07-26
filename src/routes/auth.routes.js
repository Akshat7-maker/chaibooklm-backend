import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
} from "../controllers/auth.controller.js";
import rateLimit from "express-rate-limit";
import {requireAuth} from "../middlewares/auth.middleware.js";

const router = Router();

// Throttle auth endpoints specifically — this is where brute-force attempts happen
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { error: "Too many attempts, please try again later" },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/logout-all", requireAuth, logoutAll);
router.get("/me", requireAuth, me);

export default router;