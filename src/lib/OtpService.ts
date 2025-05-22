import db from "@/db";
import { otpTable } from "@/db/schema";
import { OTP, User } from "@/types";
import { eq, and } from "drizzle-orm";
import { generateRandomDigits } from "./cr";
import EmailService, { UserEmail } from "./EmailService";
import { emailVerifyOtpTemplate, passwordResetTemplate } from "@/templates";

export default class OtpService {
  #expireTimeInMinutes = Number(process.env.OTP_EXPIRE_TIME_IN_MINUTES) || 5;
  #emailService: EmailService;

  constructor(emailService: EmailService) {
    this.#emailService = emailService;
  }

  /**
   * Generates an OTP for the specified type and email
   * For email_verify type, userId is optional
   * For all other types, userId is required
   * Automatically sends the appropriate email based on OTP type
   */
  async generateOtp(params: {
    type: OTP["type"];
    email: string;
    userId?: string;
    name?: User["name"];
  }) {
    const { type, email, userId, name } = params;

    // Validate that userId is provided for all types except email_verify
    if (type !== "email_verify" && !userId) {
      throw new Error(`userId is required for OTP type: ${type}`);
    }

    // Invalidate any existing valid OTPs for this user/email and type
    await this.invalidateExistingOtps({ type, email, userId });

    // Generate a random 6-digit OTP code
    const code = generateRandomDigits(6, "string");

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.#expireTimeInMinutes);

    // Create new OTP record
    const newOtp = await db
      .insert(otpTable)
      .values({
        type,
        code,
        email,
        userId: userId || null,
        expiresAt,
        isValid: true,
        isVerified: false,
      })
      .returning()
      .execute();

    // Send appropriate email based on OTP type
    const userEmail: UserEmail = {
      email,
      userId,
      name,
    };
    await this.sendOtpEmail(type, userEmail, code);
    return newOtp[0];
  }

  /**
   * Sends the appropriate email based on OTP type
   */
  private async sendOtpEmail(
    type: OTP["type"],
    userEmail: UserEmail,
    otpCode: string,
  ): Promise<void> {
    // Configure subject and slug based on OTP type
    let subject: string;
    let template = "";

    switch (type) {
      case "email_verify":
        subject = "Verify your email address";
        template = emailVerifyOtpTemplate;
        break;
      case "forget_password":
        subject = "Reset your password";
        template = passwordResetTemplate;
        break;
      case "profile_edit":
        subject = "Verify profile changes";
        break;
      case "fund_transfer":
        subject = "Verify fund transfer";
        break;
      case "usdt_withdrawal":
        subject = "Verify USDT withdrawal";
        break;
      case "convert_income_wallet":
        subject = "Verify wallet conversion";
        break;
      case "add_wallet_address":
        subject = "Verify new wallet address";
        break;
      case "ticket_raise_for_wallet":
        subject = "Verify ticket for wallet";
        break;
      default:
        subject = "Your verification code";
    }

    await this.#emailService.sendOtpEmail(
      userEmail,
      otpCode,
      subject,
      template,
    );
  }

  /**
   * Verifies an OTP for the given type and email
   */
  async verifyOtp(params: { type: OTP["type"]; email: string; code: string }) {
    const { type, email, code } = params;

    // Find the OTP record
    const otp = await db.query.otpTable.findFirst({
      where: and(
        eq(otpTable.type, type),
        eq(otpTable.email, email),
        eq(otpTable.code, code),
        eq(otpTable.isValid, true),
      ),
    });

    if (!otp) {
      return { success: false, message: "Invalid OTP" };
    }

    // Check if OTP has expired
    if (new Date() > new Date(otp.expiresAt)) {
      await this.invalidateOtp(otp.id);
      return { success: false, message: "OTP has expired" };
    }

    // Mark OTP as verified and invalid (used)
    await db
      .update(otpTable)
      .set({ isVerified: true, isValid: false })
      .where(eq(otpTable.id, otp.id))
      .execute();

    return { success: true, message: "OTP verified successfully" };
  }

  /**
   * Invalidates an OTP by ID
   */
  async invalidateOtp(otpId: number) {
    await db
      .update(otpTable)
      .set({ isValid: false })
      .where(eq(otpTable.id, otpId))
      .execute();
  }

  /**
   * Invalidates all existing valid OTPs for a user/email and type
   */
  async invalidateExistingOtps(params: {
    type: OTP["type"];
    email: string;
    userId?: string;
  }) {
    const { type, email, userId } = params;

    const conditions = [
      eq(otpTable.type, type),
      eq(otpTable.email, email),
      eq(otpTable.isValid, true),
    ];

    // Add userId condition if provided
    if (userId) {
      conditions.push(eq(otpTable.userId, userId));
    }

    await db
      .update(otpTable)
      .set({ isValid: false })
      .where(and(...conditions))
      .execute();
  }
}
