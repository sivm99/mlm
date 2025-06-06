import { User } from "@/types";
import { signupTemplate } from "@/templates";

export type UserEmail = {
  userId?: User["id"];
  name?: User["name"];
  email: User["email"];
  password?: string;
};

type Placeholder = {
  key: string;
  value: string | number;
};

type EmailOptions = {
  to: string;
  subject: string;
  template: string;
  placeholders: Placeholder[];
};

export default class EmailService {
  #host = Bun.env.EMAIL_HOST || "http://email-alias:7979";
  #expireTimeInMinutes = Number(Bun.env.OTP_EXPIRE_TIME_IN_MINUTES) || 5;

  /**
   * Internal utility to send email through centralized email API
   */
  async #sendEmail({
    to,
    subject,
    template,
    placeholders,
  }: EmailOptions): Promise<Response> {
    const url = `${this.#host}/send`;

    const requestBody = {
      to,
      subject,
      template,
      placeholders,
    };
    const emailRequest = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!emailRequest.ok)
      throw new Error(
        "Error during the mail sending please fix: " + emailRequest.statusText,
      );

    return emailRequest;
  }

  /**
   * Send a welcome/signup email
   */
  async sendSignupSuccessEmail(user: UserEmail): Promise<Response> {
    return this.#sendEmail({
      to: user.email,
      subject: "Welcome to The World of ALPRIMUS!",
      template: signupTemplate,
      placeholders: [
        { key: "Name", value: user.name || "" },
        { key: "UserID", value: user.userId || "" },
        { key: "Password", value: user.password || "" },
        { key: "LoginURL", value: "https://asilocloud.ink/login" },
        { key: "Year", value: new Date().getFullYear() },
      ],
    });
  }

  /**
   * Send OTP email for login or verification
   */
  async sendOtpEmail(
    user: UserEmail,
    otp: string,
    subject = "Your verification code for signup on asilocloud.inkm",
    template: string,
  ): Promise<Response> {
    return this.#sendEmail({
      to: user.email,
      subject,
      template,
      placeholders: [
        { key: "Name", value: user.name || "" },
        { key: "OTP", value: otp },
        { key: "ExpiryMinutes", value: this.#expireTimeInMinutes },
        { key: "Year", value: "2025" },
      ],
    });
  }

  /**
   * Send password reset email with a token
   */
  async sendPasswordResetEmail(
    user: UserEmail,
    resetToken: string,
    template: string,
  ): Promise<Response> {
    return this.#sendEmail({
      to: user.email,
      subject: "Reset your password",
      template,
      placeholders: [
        { key: "Name", value: user.name || "" },
        { key: "resetToken", value: resetToken },
        { key: "Year", value: new Date().getFullYear() },
      ],
    });
  }

  /**
   * Send User activation Email
   */

  async sendIdActivationEmail(user: UserEmail, template: string) {
    return this.#sendEmail({
      to: user.email,
      subject: "Your ID was activated successfully",
      template,
      placeholders: [
        { key: "Name", value: user.name || "" },
        { key: "UserId", value: user.userId || "" },
        { key: "Year", value: 2025 },
      ],
    });
  }
}

export const emailService = new EmailService();
