import { pgTable, real, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { relations } from "drizzle-orm";

export const walletsTable = pgTable("wallets", {
  id: integer("id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .primaryKey(),

  alpoints: real("alpoints").notNull().default(0),
  bv: real("bv").notNull().default(0),
  incomeWallet: real("income_wallet").notNull().default(0),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const walleteRelations = relations(walletsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [walletsTable.id],
    references: [usersTable.id],
  }),
}));

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
