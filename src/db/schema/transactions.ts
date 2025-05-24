import {
  pgTable,
  serial,
  text,
  real,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income_payout",
  "income_to_alpoints",
  "alpoints_transfer",
  "id_activation",
  "weekly_payout_earned",
  "matching_income_earned",
  "fund_addition",
  "admin_adjustment",
]);

export const walletTypeEnum = pgEnum("wallet_type", [
  "alpoints",
  "income_wallet",
  "bv",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "completed",
  "failed",
  "cancelled",
]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").notNull().default("pending"),

  // User info
  fromUserId: text("fromUserId").references(() => usersTable.id),
  toUserId: text("toUserId").references(() => usersTable.id),

  // Wallet info
  fromWalletType: walletTypeEnum("fromWalletType"),
  toWalletType: walletTypeEnum("toWalletType"),

  // Amount details
  amount: real("amount").notNull(),
  deductionAmount: real("deductionAmount").default(0),
  netAmount: real("netAmount").notNull(),
  deductionPercentage: real("deductionPercentage").default(0),

  // Additional info
  description: text("description"),
  reference: text("reference"), // For external references
  metadata: text("metadata"), // JSON string for additional data

  // OTP verification (if required)
  otpVerified: boolean("otpVerified").default(false),
  requiresOtp: boolean("requiresOtp").default(false),

  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type InsertTransaction = typeof transactionsTable.$inferInsert;
export type SelectTransaction = typeof transactionsTable.$inferSelect;
