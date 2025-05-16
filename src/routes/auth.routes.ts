import { getOtp, loginUser, registerUser } from "@/controller/auth.controller";
import { Hono } from "hono";
import {
  getVerifyEmailOtpValidate,
  loginValidate,
  registerValidate,
} from "@/validation/auth.validations";

const router = new Hono()
  .post("/signup", registerValidate, registerUser)
  .post("/login", loginValidate, loginUser)
  .get("/get-otp", getVerifyEmailOtpValidate, getOtp)
  .post("forget-password", (c) => c.text("sorry about that"));
export default router;
