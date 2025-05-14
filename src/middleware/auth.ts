import { Next } from "hono";
import { verify } from "hono/jwt";
import { getCookie } from "hono/cookie";
import { MyContext } from "@/types";
import UserService from "@/lib/userService";

const jwtSecret = process.env.JWT_SECRET!;
const us = new UserService();
export async function authenticate(c: MyContext, next: Next) {
  const token =
    getCookie(c, "token") || c.req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return c.json({ success: false, error: "Authentication required" }, 401);
  }
  const tr = await verify(token, jwtSecret);
  let safeUser;
  if (tr && tr.username && typeof tr.username === "string") {
    safeUser = await us.getUser(tr.username);
    c.set("user", safeUser);
  } else {
    return c.json({ success: false, error: "Invalid token" }, 401);
  }

  await next();
}
