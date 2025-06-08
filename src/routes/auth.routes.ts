import { Hono } from "hono";
import {
  getVerifyEmailOtpValidate,
  loginValidate,
  registerValidate,
  resetPasswordValidate,
  getSponserDetailValidate,
  forgotPasswordValidate,
} from "@/validation/auth.validations";
import { authController } from "@/controller";

const router = new Hono()
  .post("/signup", registerValidate, authController.registerUser)
  .post("/login", loginValidate, authController.loginUser)
  .get("/get-otp", getVerifyEmailOtpValidate, authController.getOtp)
  .get("/sponsor", getSponserDetailValidate, authController.getSponserDetails)
  .post(
    "/forgot-password",
    forgotPasswordValidate,
    authController.getForgotPasswordOtp,
  )
  .post("/reset-password", resetPasswordValidate, authController.resetPassword);
export default router;
