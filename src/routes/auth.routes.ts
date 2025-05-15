import { loginUser, registerUser } from "@/controller/auth.controller";
import { Hono } from "hono";
import { loginValidate, registerValidate } from "@/validation/auth.validations";

const router = new Hono()
  .post("/signup", registerValidate, registerUser)
  .post("/login", loginValidate, loginUser)
  .post("forget-password", (c) => c.text("sorry about that"));
export default router;
