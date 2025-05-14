import { getUser } from "@/controller/user.controller";
import { authenticate } from "@/middleware/auth";
import { Hono } from "hono";

const router = new Hono().use("*", authenticate).get("/", getUser);

export default router;
