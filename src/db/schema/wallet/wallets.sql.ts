import { pgTable, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { real } from "drizzle-orm/pg-core";
import { usersTable } from "../user";

/**
 * Wallets Table
 *
 * This table stores the different types of wallet balances for each user.
 * The id field references the user id, making a one-to-one relationship between users and wallets.
 * Different wallet types include alpoints, bv (business volume), and income wallet with its associated limits.
 * The table also tracks income withdrawn and daily matching income capping for user rewards.
 */
export const walletsTable = pgTable("wallets", {
  id: integer("id")
    .references(() => usersTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .primaryKey(),

  alpoints: real("alpoints").notNull().default(0),
  bv: real("bv").notNull().default(0),
  incomeWallet: real("income_wallet").notNull().default(0),
  incomeWalletLimit: real("income_wallet_limit").notNull().default(0),

  dailyMatchingIncomeCapping: real("daily_matching_income_capping")
    .notNull()
    .default(500),
  incomeWithdrawn: real("income_withdrawn").notNull().default(0),

  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const walletsRelations = relations(walletsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [walletsTable.id],
    references: [usersTable.id],
    relationName: "wallet_user_relation",
  }),
}));

export type InsertWallet = typeof walletsTable.$inferInsert;
export type SelectWallet = typeof walletsTable.$inferSelect;

/**
 * Maps wallet type identifiers to their corresponding property keys in the wallet object
 */
export const walletTypeToWalletKeyMap = {
  alpoints: "alpoints",
  bv: "bv",
  income_wallet: "incomeWallet",
} as const;

type WalletTypeKeyMap = typeof walletTypeToWalletKeyMap;
export type WalletType = keyof WalletTypeKeyMap; // "alpoints" | "bv" | "income_wallet"
export type WalletKey = SelectWallet[Extract<
  keyof SelectWallet,
  "alpoints" | "bv" | "incomeWallet"
>]; // number

/**
 * Valid wallet operations that can be performed
 */
export const walletOperation = ["transfer", "convert", "payout"] as const;

export type WalletOperations = typeof walletOperation;
