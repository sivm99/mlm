import {
  getForgetPasswordOtp,
  getOtp,
  loginUser,
  registerUser,
  resetPassword,
} from "@/controller/auth.controller";
import { Hono } from "hono";
import {
  getVerifyEmailOtpValidate,
  loginValidate,
  registerValidate,
  forgetPasswordValidate,
  resetPasswordValidate,
} from "@/validation/auth.validations";

const router = new Hono()
  .post("/signup", registerValidate, registerUser)
  .post("/login", loginValidate, loginUser)
  .get("/get-otp", getVerifyEmailOtpValidate, getOtp)
  .post("forget-password", forgetPasswordValidate, getForgetPasswordOtp)
  .post("reset-password", resetPasswordValidate, resetPassword);
export default router;
