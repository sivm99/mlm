import { User } from "@/types";

export type UserEmail = {
  userId?: User["id"];
  name?: User["name"];
  email: User["email"];
  password?: string;
};

type EmailData = Record<string, string | number | undefined>;

type EmailOptions = {
  to: string;
  slug: string;
  subject?: string;
  data?: EmailData;
};

export default class EmailService {
  #host = process.env.EMAIL_HOST || "http://[::1]:7979";
  #expireTimeInMinutes = Number(process.env.OTP_EXPIRE_TIME_IN_MINUTES) || 5;

  /**
   * Internal utility to send email through centralized email API
   */
  async #sendEmail({
    to,
    slug,
    subject,
    data,
  }: EmailOptions): Promise<Response> {
    const params = new URLSearchParams({
      to,
      slug,
    });

    if (subject) params.append("subject", subject);
    if (data) params.append("data", JSON.stringify(data));

    const url = `${this.#host}/send?${params.toString()}`;
    return fetch(url);
  }

  /**
   * Send a welcome/signup email
   */
  async sendSignupSuccessEmail(user: UserEmail): Promise<Response> {
    return this.#sendEmail({
      to: user.email,
      slug: "signup",
      subject: "Welcome to our platform!",
      data: {
        Name: user.name,
        UserID: user.userId,
        Password: user.password,
        LoginURL: "https://alprimus.com/login",
        Year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send OTP email for login or verification
   */
  async sendOtpEmail(
    user: UserEmail,
    otp: string,
    subject = "Your verification code",
    slug = "otp",
  ): Promise<Response> {
    return this.#sendEmail({
      to: user.email,
      slug,
      subject,
      data: {
        Name: user.name,
        OTP: otp,
        ExpiryMinutes: this.#expireTimeInMinutes,
        Year: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send password reset email with a token
   */
  async sendPasswordResetEmail(
    user: UserEmail,
    resetToken: string,
  ): Promise<Response> {
    return this.#sendEmail({
      to: user.email,
      slug: "reset-password",
      subject: "Reset your password",
      data: {
        name: user.name,
        resetToken,
        Year: new Date().getFullYear(),
      },
    });
  }
}
