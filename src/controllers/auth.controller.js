import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  logoutAllDevices,
} from "../services/auth.service.js";
import { registerSchema, loginSchema } from "../validators/auth.validator.js";

const isProd = process.env.NODE_ENV === "production";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: isProd ? true : false,
  secure: isProd,
  sameSite: "lax",
  path: "/", // only sent to auth routes, not every request
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  try {
    const { accessToken, refreshToken, user } = await registerUser(parsed.data);

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    return res.status(201).json({ accessToken, user });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  try {
    const { accessToken, refreshToken, user } = await loginUser(parsed.data);

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    return res.status(200).json({ accessToken, user });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

export async function refresh(req, res) {
  try {
    const { accessToken } = await refreshAccessToken(req.cookies?.refreshToken);
    return res.status(200).json({ accessToken });
  } catch (err) {
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    return res.status(err.status || 500).json({ error: err.message });
  }
}

export async function logout(req, res) {
  await logoutUser(req.cookies?.refreshToken);
  res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
  return res.status(200).json({ message: "Logged out" });
}

export async function logoutAll(req, res) {
  await logoutAllDevices(req.user.id);
  res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
  return res.status(200).json({ message: "Logged out of all devices" });
}

export async function me(req, res) {
  return res.status(200).json({ user: req.user });
}