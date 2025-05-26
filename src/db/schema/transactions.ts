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
  fromUserId: integer("fromUserId").references(() => usersTable.id),
  toUserId: integer("toUserId").references(() => usersTable.id),

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
