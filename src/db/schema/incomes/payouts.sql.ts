import {
  integer,
  pgEnum,
  pgTable,
  real,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { index } from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";
import { usersTable } from "../user";

export const payoutStatusEnum = pgEnum("payout_status", [
  "pending",
  "processed",
  "failed",
]);
export const payoutType = [
  "sale_reward",
  "matching_income",
  "matching_bonus",
  "lifetime_reward",
  "rank_achievement_income",
  "income_withdrawl",
] as const;
export const payoutTypeEnum = pgEnum("payout_type", payoutType);

/**
 * Payout Table
 * This will have the record of all the payout with their income type or withdrawl
 * it will also have the reference id of that type
 */
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
    referenceId: integer("reference_id"),

    amount: real("amount").notNull(),
    status: payoutStatusEnum("status").notNull().default("pending"),
    adminFee: real("admin_fee").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return [
      index("idx_payouts_userId").on(table.userId),
      index("idx_payouts_status").on(table.status),
      index("idx_payouts_createdAt").on(table.createdAt),
    ];
  },
);

export const payoutsRelations = relations(payoutsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [payoutsTable.userId],
    references: [usersTable.id],
  }),
}));

export type InsertPayout = typeof payoutsTable.$inferInsert;
export type SelectPayout = typeof payoutsTable.$inferSelect;
