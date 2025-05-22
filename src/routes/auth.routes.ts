import AuthController from "@/controller/AuthController";

import { Hono } from "hono";
import {
  getVerifyEmailOtpValidate,
  loginValidate,
  registerValidate,
  resetPasswordValidate,
  getSponserDetailValidate,
  forgotPasswordValidate,
} from "@/validation/auth.validations";

const router = new Hono()
  .post("/signup", registerValidate, AuthController.registerUser)
  .post("/login", loginValidate, AuthController.loginUser)
  .get("/get-otp", getVerifyEmailOtpValidate, AuthController.getOtp)
  .get("/sponsor", getSponserDetailValidate, AuthController.getSponserDetails)
  .post(
    "/forgot-password",
    forgotPasswordValidate,
    AuthController.getForgotPasswordOtp,
  )
  .post("/reset-password", resetPasswordValidate, AuthController.resetPassword);
export default router;
