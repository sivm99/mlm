import { bulkAdd, getUser, getUserTree } from "@/controller/user.controller";
import { authenticate, authenticateAdmin } from "@/middleware/auth";
import { bulkAddValidate } from "@/validation/user.validation";
import { Hono } from "hono";

const router = new Hono()
  .use("*", authenticate)
  .get("/", getUser)
  .get("/get-full-tree", getUserTree)
  .post("/admin/bulk-add", authenticateAdmin, bulkAddValidate, bulkAdd);

export default router;
