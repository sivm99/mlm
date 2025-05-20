import AuthController from "@/controller/AuthController";

import { Hono } from "hono";
import {
  getVerifyEmailOtpValidate,
  loginValidate,
  registerValidate,
  forgetPasswordValidate,
  resetPasswordValidate,
} from "@/validation/auth.validations";

const router = new Hono()
  .post("/signup", registerValidate, AuthController.registerUser)
  .post("/login", loginValidate, AuthController.loginUser)
  .get("/get-otp", getVerifyEmailOtpValidate, AuthController.getOtp)
  .post(
    "/forget-password",
    forgetPasswordValidate,
    AuthController.getForgetPasswordOtp,
  )
  .post("/reset-password", resetPasswordValidate, AuthController.resetPassword);
export default router;
