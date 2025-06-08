import { emailService, userService, otpService } from "@/lib/services";
import { Context } from "hono";

export default class AuthController {
  async registerUser(c: Context) {
    try {
      const validUser = Array(c.get("registerUser"));

      const otp = validUser[0].otp;
      if (!otp)
        return c.json(
          {
            success: false,
            message: "You must provide OTP sent on your email",
          },
          400,
        );
      const otpVerifyResult = await otpService.verifyOtp({
        type: "email_verify",
        code: otp,
        email: validUser[0].email,
      });
      if (!otpVerifyResult.success)
        return c.json(
          {
            success: false,
            message: otpVerifyResult.message,
          },
          400,
        );

      const { success, users } = await userService.registerUsers(validUser);
      const newUser = users[0];
      await userService.setTokenCookie(c, newUser.id);

      emailService.sendSignupSuccessEmail({
        userId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        password: validUser[0].password,
      });

      return c.json({
        success,
        data: newUser,
        message: "User was registered",
      });
    } catch (error) {
      console.error("Error registering user:", error);
      return c.json(
        {
          success: false,
          message: "Failed to register user",
        },
        500,
      );
    }
  }

  async loginUser(c: Context) {
    const validated = c.get("loginUser");
    try {
      const { success, user } = await userService.loginUser(validated);
      await userService.setTokenCookie(c, user.id);
      return c.json({
        success,
        message: "User was logged in",
        data: user,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      return c.json(
        {
          success: false,
          message: errorMessage,
        },
        400,
      );
    }
  }

  /**
   * Send verification OTP to email
   */
  async getOtp(c: Context) {
    const { email } = c.get("otpEmail");

    try {
      await otpService.generateOtp({
        type: "email_verify",
        email,
      });
      return c.json({
        success: true,
        message: `OTP has been sent to ${email}. Please Check your spam folder as well`,
      });
    } catch (err) {
      console.error("There was an error during OTP generation:", err);
      return c.json(
        {
          success: false,
          message: String(err),
        },
        500,
      );
    }
  }

  /**
   * Send password reset OTP
   */
  async getForgotPasswordOtp(c: Context) {
    const user = c.get("user");
    try {
      otpService.generateOtp({
        type: "forget_password",
        email: user.email,
        userId: user.id,
        name: user.name,
      });

      return c.json({
        success: true,
        message: `Password reset OTP has been sent to your registered email`,
      });
    } catch (err) {
      console.error(
        "There was an error during password reset OTP generation:",
        err,
      );
      return c.json(
        {
          success: false,
          message: String(err),
        },
        500,
      );
    }
  }

  async resetPassword(c: Context) {
    const { newPassword, otp } = c.get("resetPassword");
    const user = c.get("user");

    const { success, message } = await otpService.verifyOtp({
      type: "forget_password",
      code: otp,
      email: user.email,
    });
    if (!success)
      return c.json(
        {
          success: false,
          message,
        },
        403,
      );

    try {
      await userService.updateUserPassword(user.id, newPassword);
      // we will send one more email here to the user saying
      // your password was successfully changed
      return c.json({
        success: true,
        message: "Your password was successfully reset",
      });
    } catch (err) {
      return c.json(
        {
          success: false,
          message: String(err),
        },
        500,
      );
    }
  }

  async getSponserDetails(c: Context) {
    const id = c.get("id");
    const data = await userService.getUser(id);
    if (!data)
      return c.json(
        {
          success: false,
          message: "Sponsor dont exist",
        },
        404,
      );
    return c.json({
      success: true,
      message: "User reterieved Successfully",
      data: data.name,
    });
  }
}

export const authController = new AuthController();
