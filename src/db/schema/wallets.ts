import { pgTable, serial, real, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  alpoints: real("alpoints").notNull().default(0),
  bv: real("bv").notNull().default(0),
  incomeWallet: real("incomeWallet").notNull().default(0),
  userId: text("userId")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type InsertWallet = typeof walletsTable.$inferInsert;
export type SelectWallet = typeof walletsTable.$inferSelect;

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

export const walletOperation = ["transfer", "convert", "payout"] as const;

export type WalletOperations = typeof walletOperation;
