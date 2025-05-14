import { Context, Next } from "hono";
import { verify } from "hono/jwt";

const jwtSecret = process.env.JWT_SECRET!;

import { getCookie } from "hono/cookie";

export async function authenticate(c: Context, next: Next) {
  const token =
    getCookie(c, "token") || c.req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return c.json({ error: "Authentication required" }, 401);
  }
  const tokenResult = await verify(token, jwtSecret);
  console.log(tokenResult);
  await next();
}
