import AuthController from "@/controller/AuthController";

import { Hono } from "hono";
import {
  getVerifyEmailOtpValidate,
  loginValidate,
  registerValidate,
  forgetPasswordValidate,
  resetPasswordValidate,
  getSponserDetailValidate,
} from "@/validation/auth.validations";

const router = new Hono()
  .post("/signup", registerValidate, AuthController.registerUser)
  .post("/login", loginValidate, AuthController.loginUser)
  .get("/get-otp", getVerifyEmailOtpValidate, AuthController.getOtp)
  .get("/sponsor", getSponserDetailValidate, AuthController.getSponserDetails)
  .post(
    "/forget-password",
    forgetPasswordValidate,
    AuthController.getForgetPasswordOtp,
  )
  .post("/reset-password", resetPasswordValidate, AuthController.resetPassword);
export default router;
