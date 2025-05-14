import { loginUser, registerUser } from "@/controller/auth.controller";
import { Hono } from "hono";
import { loginValidate, registerValidate } from "@/validation/user.validations";

const router = new Hono()
  .post("/signup", registerValidate, registerUser)
  .post("/register", registerValidate, registerUser)
  .post("/login", loginValidate, loginUser);
export default router;
