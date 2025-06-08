import { Context, Next } from "hono";
import { verify } from "hono/jwt";
import { getCookie } from "hono/cookie";
import { SafeUser } from "@/types";
import { userService } from "@/lib/services";

const jwtSecret = Bun.env.JWT_SECRET!;

// Define strict return types for verifyAndGetUser
type VerifyErrorResult = {
  error: string;
  statusCode: 401;
  safeUser?: undefined;
};

type VerifySuccessResult = {
  safeUser: SafeUser;
  error?: undefined;
  statusCode?: undefined;
};

type VerifyResult = VerifyErrorResult | VerifySuccessResult;

async function verifyAndGetUser(c: Context): Promise<VerifyResult> {
  const token =
    getCookie(c, "token") || c.req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return { error: "Authentication required", statusCode: 401 };
  }

  let tokenResult;
  try {
    tokenResult = await verify(token, jwtSecret);
  } catch (err) {
    return { error: `Invalid token: ${String(err)}`, statusCode: 401 };
  }

  if (tokenResult && tokenResult.id && typeof tokenResult.id === "number") {
    const safeUser = await userService.getUser(tokenResult.id);
    if (!safeUser) {
      return { error: "Invalid user", statusCode: 401 };
    }
    return { safeUser };
  } else {
    return { error: "Invalid token format", statusCode: 401 };
  }
}

export async function authenticate(c: Context, next: Next) {
  const result = await verifyAndGetUser(c);

  if ("error" in result) {
    return c.json({ success: false, message: result.error }, result.statusCode);
  }

  c.set("user", result.safeUser);
  await userService.setTokenCookie(c, result.safeUser.id);
  await next();
}

export async function authenticateAdmin(c: Context, next: Next) {
  const result = await verifyAndGetUser(c);

  if ("error" in result) {
    return c.json({ success: false, message: result.error }, result.statusCode);
  }

  if (result.safeUser.role !== "admin") {
    return c.json({ success: false, message: "Authentication required" }, 401);
  }

  c.set("user", result.safeUser);
  await userService.setTokenCookie(c, result.safeUser.id);
  await next();
}
