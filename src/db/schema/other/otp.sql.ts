import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { usersTable } from "../user";
import { relations } from "drizzle-orm";

/**
 * OTP Type Enum
 *
 * Define an enum for OTP types to ensure type safety across various authentication
 * and verification scenarios.
 */
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

/**
 * OTP Table
 *
 * This table stores one-time passwords (OTPs) for various verification purposes.
 * It tracks OTP generation, expiration, and verification status.
 * When an OTP is verified, isVerified becomes true and isValid should become false.
 */
export const otpTable = pgTable("otp", {
  id: serial("id").primaryKey(),
  type: otpTypeEnum("type").notNull(),
  userId: integer("user_id").references(() => usersTable.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  code: text("code").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isValid: boolean("is_valid").default(true).notNull(),
  isVerified: boolean("is_verified").default(false),
});

export const otpRelations = relations(otpTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [otpTable.userId],
    references: [usersTable.id],
    relationName: "otp_user_relation",
  }),
}));

export type InsertOTP = typeof otpTable.$inferInsert;
export type SelectOTP = typeof otpTable.$inferSelect;
export type OTP = SelectOTP;
