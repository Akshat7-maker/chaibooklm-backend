import bcrypt from "bcrypt";
import { prisma } from "../utils/db.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt.js";

const SALT_ROUNDS = 12;

function parseExpiryToDate(expiresIn) {
  // supports "7d", "15m", "1h" style strings
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error("Invalid expiresIn format");

  const [, value, unit] = match;
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit] * Number(value);
  return new Date(Date.now() + ms);
}

export async function registerUser({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error("An account with this email already exists");
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { name, email, password: passwordHash },
  });

  return issueTokens(user);
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Same error for "no user" and "wrong password" — don't leak which one it was
  if (!user) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  return issueTokens(user);
}

async function issueTokens(user) {
  const payload = { userId: user.id, email: user.email };

  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: parseExpiryToDate(Bun.env.JWT_REFRESH_EXPIRES_IN || "7d"),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email },
  };
}

export async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    const err = new Error("No refresh token provided");
    err.status = 401;
    throw err;
  }

  let payload;
  try {
    payload = await verifyRefreshToken(refreshToken);
  } catch {
    const err = new Error("Invalid or expired refresh token");
    err.status = 401;
    throw err;
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    const err = new Error("Refresh token is no longer valid");
    err.status = 401;
    throw err;
  }

  const accessToken = await signAccessToken({ userId: payload.userId, email: payload.email });

  return { accessToken };
}

export async function logoutUser(refreshToken) {
  if (!refreshToken) return;

  await prisma.refreshToken.updateMany({
    where: { token: refreshToken },
    data: { revoked: true },
  });
}

export async function logoutAllDevices(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { revoked: true },
  });
}