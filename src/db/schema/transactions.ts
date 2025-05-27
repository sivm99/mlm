import {
  pgTable,
  serial,
  text,
  real,
  boolean,
  timestamp,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const trasactionType = [
  "income_payout",
  "income_to_alpoints",
  "alpoints_transfer",
  "id_activation",
  "weekly_payout_earned",
  "matching_income_earned",
  "fund_addition",
  "admin_adjustment",
] as const;
export const transactionTypeEnum = pgEnum("transaction_type", trasactionType);

export const walletType = ["alpoints", "income_wallet", "bv"] as const;
export const walletTypeEnum = pgEnum("wallet_type", walletType);

export const transactionStatus = [
  "pending",
  "completed",
  "failed",
  "cancelled",
] as const;
export const transactionStatusEnum = pgEnum(
  "transaction_status",
  transactionStatus,
);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").notNull().default("pending"),

  // User info
  fromUserId: integer("from_user_id").references(() => usersTable.id),
  toUserId: integer("to_user_id").references(() => usersTable.id),

  // Wallet info
  fromWalletType: walletTypeEnum("from_wallet_type"),
  toWalletType: walletTypeEnum("to_wallet_type"),

  // Amount details
  amount: real("amount").notNull(),
  deductionAmount: real("deduction_amount").default(0),
  netAmount: real("net_amount").notNull(),
  deductionPercentage: real("deduction_percentage").default(0),

  // Additional info
  description: text("description"),
  reference: text("reference"), // For external references
  metadata: text("metadata"), // JSON string for additional data

  // OTP verification (if required)
  otpVerified: boolean("otp_verified").default(false),
  requiresOtp: boolean("requires_otp").default(false),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type InsertTransaction = typeof transactionsTable.$inferInsert;
export type SelectTransaction = typeof transactionsTable.$inferSelect;
