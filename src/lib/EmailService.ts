import { User } from "@/types";

export type UserEmail = {
  userId?: User["id"];
  name?: User["name"];
  email: User["email"];
  password?: string;
};

type EmailOptions = {
  to: string;
  slug: string;
  subject?: string;
  data?: Record<string, unknown>;
};

export default class EmailService {
  #host = process.env.EMAIL_HOST || "http://[::1]:7979";

  #expireTimeInMinutes = Number(process.env.OTP_EXPIRE_TIME_IN_MINUTES) || 5;
  /**
   * Private method to send email by constructing the URL with query parameters
   */
  async #sendEmail({
    to,
    slug,
    subject,
    data,
  }: EmailOptions): Promise<Response> {
    let url = `${this.#host}/send?to=${to}&slug=${slug}`;

    if (subject) {
      url += `&subject=${encodeURIComponent(subject)}`;
    }

    if (data) {
      url += `&data=${encodeURIComponent(JSON.stringify(data))}`;
    }

    return fetch(url);
  }

  /**
   * Send a signup success email to the user
   */
  async sendSignupSuccessEmail(userEmail: UserEmail): Promise<Response> {
    return this.#sendEmail({
      to: userEmail.email,
      slug: "signup",
      subject: "Welcome to our platform!",
      data: {
        Name: userEmail.name,
        UserID: userEmail.userId,
        Password: userEmail.password,
        LoginURL: "https://alprimus.com/login",
        Year: "2025",
      },
    });
  }

  /**
   * Send an OTP verification email with custom subject
   */
  async sendOtpEmail(
    userEmail: UserEmail,
    otp: string,
    subject = "Your verification code",
    slug = "otp",
  ): Promise<Response> {
    return this.#sendEmail({
      to: userEmail.email,
      slug,
      subject,
      data: {
        Name: userEmail.name,
        OTP: otp,
        ExpiryMinutes: this.#expireTimeInMinutes,
        Year: "2025",
      },
    });
  }

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(
    userEmail: UserEmail,
    resetToken: string,
  ): Promise<Response> {
    return this.#sendEmail({
      to: userEmail.email,
      slug: "reset-password",
      subject: "Reset your password",
      data: {
        name: userEmail.name,
        resetToken,
      },
    });
  }
}
