import { serial, integer, real, timestamp, pgTable } from "drizzle-orm/pg-core";
import { usersTable } from "../user";
import { payoutStatusEnum } from "./payouts.sql";
import { relations } from "drizzle-orm";

/**
 * Income Withdrawl Table
 *
 * This table stores the withdrawal requests made by users from their income.
 * The status field tracks the current state of the withdrawal process.
 * The amountPaid represents the total amount paid to the user, while adminFee
 * represents the fee deducted for processing the withdrawal.
 */
export const incomeWithdrawlTable = pgTable("income_withdrawl", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  amountPaid: real("amount_paid").notNull(),
  adminFee: real("admin_fee").notNull(),
  matchingBv: integer("matching_bv").notNull(),
  status: payoutStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const incomeWithdrawlRelations = relations(
  incomeWithdrawlTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [incomeWithdrawlTable.userId],
      references: [usersTable.id],
      relationName: "income_withdrawl_user_relation",
    }),
  }),
);

export type SelectIncomeWithdrawl = typeof incomeWithdrawlTable.$inferSelect;
export type InsertIncomeWithdrawl = typeof incomeWithdrawlTable.$inferInsert;
