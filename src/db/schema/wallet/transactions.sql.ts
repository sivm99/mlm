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
import { usersTable } from "../user";
import { relations } from "drizzle-orm";

/**
 * Transaction Types
 *
 * Defines the various types of transactions that can occur in the system.
 * These include payouts, transfers, and various system operations.
 */
export const transactionType = [
  "income_payout",
  "income_to_alpoints",
  "alpoints_transfer",
  "id_activation",
  "weekly_payout_earned",
  "matching_income_earned",
  "fund_addition",
  "admin_adjustment",
  "increase_wallet_limit",
  "order_partial_payment", // the partial payment for the order itself
] as const;
export const transactionTypeEnum = pgEnum("transaction_type", transactionType);

/**
 * Wallet Types
 *
 * Defines the different types of wallets available in the system.
 */
export const walletType = ["alpoints", "income_wallet", "bv"] as const;
export const walletTypeEnum = pgEnum("wallet_type", walletType);

/**
 * Transaction Statuses
 *
 * Defines the possible states of a transaction in the system.
 */
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

/**
 * Transactions Table
 *
 * This table stores all financial transactions within the system.
 * Each transaction has a type, status, amount details, and may involve
 * transfers between users and different wallet types.
 *
 * The table tracks both the source and destination of funds, as well as
 * any deductions that may apply to the transaction.
 * Additional metadata and verification requirements are also stored.
 */
export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").notNull().default("pending"),

  // User info
  fromUserId: integer("from_user_id").references(() => usersTable.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  toUserId: integer("to_user_id").references(() => usersTable.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),

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
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

/**
 * Transactions Relations
 *
 * Defines the relationships between transactions and users.
 * Each transaction can be linked to a source user (fromUser) and a destination user (toUser).
 */
export const transactionsRelations = relations(
  transactionsTable,
  ({ one }) => ({
    fromUser: one(usersTable, {
      fields: [transactionsTable.fromUserId],
      references: [usersTable.id],
      relationName: "transaction_from_user_relation",
    }),
    toUser: one(usersTable, {
      fields: [transactionsTable.toUserId],
      references: [usersTable.id],
      relationName: "transaction_to_user_relation",
    }),
  }),
);

export type InsertTransaction = typeof transactionsTable.$inferInsert;
export type SelectTransaction = typeof transactionsTable.$inferSelect;
