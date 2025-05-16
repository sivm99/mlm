import {
  bulkAdd,
  getUser,
  getUserTree,
  updateUser,
} from "@/controller/user.controller";
import { authenticate, authenticateAdmin } from "@/middleware/auth";
import {
  bulkAddValidate,
  getTreeListValidate,
  updateUserByAdminValidate,
  updateUserValidate,
} from "@/validation/user.validation";
import { Hono } from "hono";

const router = new Hono()
  .use("*", authenticate)
  .get("/", getUser)
  .patch("/", updateUserValidate, updateUser)
  .get("/tree-list", getTreeListValidate, getUserTree)
  .post("/admin/bulk-add", authenticateAdmin, bulkAddValidate, bulkAdd)
  .patch(
    "/admin/update",
    authenticateAdmin,
    updateUserByAdminValidate,
    updateUser,
  );
export default router;
