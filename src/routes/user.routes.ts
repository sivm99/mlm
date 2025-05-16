import { bulkAdd, getUser, getUserTree } from "@/controller/user.controller";
import { authenticate, authenticateAdmin } from "@/middleware/auth";
import { MyContext } from "@/types";
import { bulkAddValidate } from "@/validation/user.validation";
import { Hono } from "hono";

const router = new Hono()
  .use("*", authenticate)
  .get("/", getUser)
  .get(
    "/get-full-tree",
    async (c: MyContext, n) => {
      c.set("side", "FULL");
      await n();
    },
    getUserTree,
  )
  .get(
    "/get-left-tree",
    async (c: MyContext, n) => {
      c.set("side", "LEFT");
      await n();
    },
    getUserTree,
  )
  .get(
    "/get-right-tree",
    async (c: MyContext, n) => {
      c.set("side", "RIGHT");
      await n();
    },
    getUserTree,
  )
  .post("/admin/bulk-add", authenticateAdmin, bulkAddValidate, bulkAdd);

export default router;
