import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createSelectSchema } from "drizzle-zod";

// Define an enum for OTP types to ensure type safety
export const otpTypeEnum = pgEnum("otp_type", [
  "email_verify",
  "profile_edit",
  "fund_transfer",
  "usdt_withdrawal",
  "convert_income_wallet",
  "add_wallet_address",
  "ticket_raise_for_wallet",
]);

export const otpTable = pgTable("otp", {
  id: serial().primaryKey(),
  type: otpTypeEnum("type").notNull(),
  userId: text().references(() => usersTable.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  code: text().notNull(),
  email: text().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(), // When the OTP was generated
  expiresAt: timestamp("expiresAt").notNull(), // When the OTP will expire and become invalid
  isValid: boolean("isValid").default(true).notNull(), // Whether OTP can still be used (false if expired, used, or invalidated)
  isVerified: boolean("isVerified").default(false), // Whether OTP was successfully verified
  // When an OTP is verified, isVerified becomes true and isValid should become false
});

export const otpSchema = createSelectSchema(otpTable);

export type OTPTYPE = typeof otpSchema._type;
