import { Next } from "hono";
import { verify } from "hono/jwt";
import { getCookie } from "hono/cookie";
import { MyContext } from "@/types";
import UserService from "@/lib/UserService";

const jwtSecret = process.env.JWT_SECRET!;
const userService = new UserService();
export async function authenticate(c: MyContext, next: Next) {
  const token =
    getCookie(c, "token") || c.req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return c.json({ success: false, error: "Authentication required" }, 401);
  }
  const tokenResult = await verify(token, jwtSecret);
  let safeUser;
  if (tokenResult && tokenResult.id && typeof tokenResult.id === "string") {
    safeUser = await userService.getUser(tokenResult.id);
    c.set("user", safeUser);
  } else {
    return c.json({ success: false, error: "Invalid token" }, 401);
  }

  await next();
}
export async function authenticateAdmin(c: MyContext, next: Next) {
  const token =
    getCookie(c, "token") || c.req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return c.json({ success: false, error: "Authentication required" }, 401);
  }
  const tokenResult = await verify(token, jwtSecret);
  let safeUser;
  if (tokenResult && tokenResult.id && typeof tokenResult.id === "string") {
    safeUser = await userService.getUser(tokenResult.id);
    if (safeUser.role !== "ADMIN")
      return c.json({ success: false, error: "Authentication required" }, 401);
    c.set("user", safeUser);
  } else {
    return c.json({ success: false, error: "Invalid token" }, 401);
  }

  await next();
}
