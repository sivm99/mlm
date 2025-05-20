import EmailService from "@/lib/EmailService";
import OtpService from "@/lib/OtpService";
import { MyContext } from "@/types";
import UserService from "@/lib/UserService";
import ReferralService from "@/lib/ReferralService";

export default class AuthController {
  private static userService = new UserService();
  private static emailService = new EmailService();
  private static otpService = new OtpService(this.emailService);
  private static referralService = new ReferralService();

  static async registerUser(c: MyContext) {
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

      const otpVerifyResult = await this.otpService.verifyOtp({
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

      const { success, users } =
        await this.userService.registerUsers(validUser);
      const newUser = users[0];
      await this.userService.setTokenCookie(c, newUser.id);

      this.emailService.sendSignupSuccessEmail({
        userId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        password: validUser[0].password,
      });
      if (validUser[0].referralCode)
        this.referralService.recordRegistration(validUser[0].referralCode);
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

  static async loginUser(c: MyContext) {
    const validated = c.get("loginUser");
    try {
      const { success, user } = await this.userService.loginUser(validated);
      await this.userService.setTokenCookie(c, user.id);
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
  static async getOtp(c: MyContext) {
    const { email } = c.get("otpEmail");

    try {
      // The email is now sent automatically inside the generateOtp method
      await this.otpService.generateOtp({
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
  static async getForgetPasswordOtp(c: MyContext) {
    const id = c.get("id");
    try {
      const user = await this.userService.getUser(id);
      // we can also show here that email was delivered if it exists
      if (!user) {
        return c.json(
          {
            success: false,
            message: `There exists no such user with the ID ${id}`,
          },
          404,
        );
      }

      // Email is sent automatically inside generateOtp
      await this.otpService.generateOtp({
        type: "forget_password",
        email: user.email,
        userId: user.id,
        name: user.name,
      });

      return c.json({
        success: true,
        message: `Password reset OTP has been sent to ${user.email}. Please check your spam folder as well`,
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

  static async resetPassword(c: MyContext) {
    const { id, newPassword, otp, email } = c.get("resetPassword");

    const { success, message } = await this.otpService.verifyOtp({
      type: "forget_password",
      code: otp,
      email,
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
      await this.userService.updateUserPassword(id, newPassword);
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
}
