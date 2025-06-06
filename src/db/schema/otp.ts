import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Define an enum for OTP types to ensure type safety
export const otpTypeEnum = pgEnum("otp_type", [
  "email_verify",
  "forget_password",
  "profile_edit",
  "fund_transfer",
  "usdt_withdrawal",
  "convert_income_wallet",
  "add_wallet_address",
  "ticket_raise_for_wallet",
]);

export const otpTable = pgTable("otp", {
  id: serial("id").primaryKey(),
  type: otpTypeEnum("type").notNull(),
  userId: integer("user_id").references(() => usersTable.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  code: text("code").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(), // When the OTP was generated
  expiresAt: timestamp("expires_at").notNull(), // When the OTP will expire and become invalid
  isValid: boolean("is_valid").default(true).notNull(), // Whether OTP can still be used (false if expired, used, or invalidated)
  isVerified: boolean("is_verified").default(false), // Whether OTP was successfully verified
  // When an OTP is verified, isVerified becomes true and isValid should become false
});

export type InsertOTP = typeof otpTable.$inferInsert;
export type SelectOTP = typeof otpTable.$inferSelect;
export type OTP = SelectOTP;
