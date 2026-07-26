import { SignJWT, jwtVerify } from "jose";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || "fallback_access_secret"
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret"
);

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

// --- Access token ---

export async function signAccessToken(payload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXPIRES_IN)
    .sign(ACCESS_SECRET);
}

export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, ACCESS_SECRET);
  return payload; // throws on invalid/expired — caller handles it
}

// --- Refresh token ---

export async function signRefreshToken(payload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRES_IN)
    .sign(REFRESH_SECRET);
}

export async function verifyRefreshToken(token) {
  const { payload } = await jwtVerify(token, REFRESH_SECRET);
  return payload;
}