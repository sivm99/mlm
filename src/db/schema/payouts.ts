import {
  integer,
  pgEnum,
  pgTable,
  real,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { index } from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";
import { saleRewardsTable } from "./saleRewards";
import { matchingIncomesTable } from "./matchingIncomes";

export const payoutStatusEnum = pgEnum("payout_status", [
  "pending",
  "processed",
  "failed",
]);
export const payoutType = [
  "sale_reward",
  "matching_income",
  "income_withdrawl",
] as const;
export const payoutTypeEnum = pgEnum("payout_type", payoutType);

export const payoutsTable = pgTable(
  "payouts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, {
        onDelete: "set null",
        onUpdate: "cascade",
      }),
    type: payoutTypeEnum("type").notNull(),
    saleRewardId: integer("sale_reward_id").references(
      () => saleRewardsTable.id,
      {
        onDelete: "set null",
        onUpdate: "cascade",
      },
    ),

    matchingIncomeId: integer("matching_income_id").references(
      () => matchingIncomesTable.id,
      {
        onDelete: "set null",
        onUpdate: "cascade",
      },
    ),

    amount: real("amount").notNull(),
    status: payoutStatusEnum("status").default("pending"),
    payoutDate: timestamp("payout_date").notNull(),
    adminFee: real("admin_fee").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return [
      index("idx_payouts_userId").on(table.userId),
      index("idx_payouts_status").on(table.status),
      index("idx_payouts_createdAt").on(table.createdAt),
    ];
  },
);

// Define payout relations
export const payoutsRelations = relations(payoutsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [payoutsTable.userId],
    references: [usersTable.id],
  }),
}));

export type InsertPayout = typeof payoutsTable.$inferInsert;
export type SelectPayout = typeof payoutsTable.$inferSelect;
