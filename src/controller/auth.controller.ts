import EmailService from "@/lib/EmailService";
import OtpService from "@/lib/OtpService";
import UserService from "@/lib/UserService";
import { MyContext } from "@/types";

const userService = new UserService();
const emailService = new EmailService();
const otpService = new OtpService();
export async function registerUser(c: MyContext) {
  try {
    const validUser = Array(c.get("registerUser"));
    const otp = validUser[0].otp;
    if (!otp)
      return c.json({
        success: false,
        message: "You must provide OTP sent on your email",
      });

    const otpVerifyResult = await otpService.verifyOtp({
      type: "email_verify",
      code: otp,
      email: validUser[0].email,
    });

    if (!otpVerifyResult.success)
      return c.json({
        success: false,
        message: otpVerifyResult.message,
      });

    const { success, users } = await userService.registerUsers(validUser);
    const newUser = users[0];
    await userService.setTokenCookie(c, newUser.id);
    await emailService.sendSignupSuccessEmail({
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

export async function loginUser(c: MyContext) {
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

export async function getOtp(c: MyContext) {
  const { email } = c.get("otpEmail");
  try {
    const otp = await otpService.generateOtp({
      type: "email_verify",
      email,
    });
    await emailService.sendOtpEmail(
      {
        email,
      },
      otp.code,
    );
    return c.json({
      success: true,
      message: `OTP has been sent to ${email}. Please Check your spam folder as well`,
    });
  } catch (err) {
    console.error("there was an error during", err);
    return c.json({
      success: false,
      message: String(err),
    });
  }
}
