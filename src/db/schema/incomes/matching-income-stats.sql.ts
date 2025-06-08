import { integer, real, pgTable, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "../user";
import { relations } from "drizzle-orm";

/**
 * Matching Income Stats Table
 *
 * This table stores aggregate statistics about matching incomes for users.
 * The count field tracks the number of matching income payments received.
 * The amountPaid field represents the total monetary value paid to the user.
 * The maxBv field tracks the maximum business volume points received in a single day.
 * This entry will only be created when a user activates their ID, and is used for daily capping.
 */
export const matchingIncomeStatsTable = pgTable("matching_income_stats", {
  id: integer("id")
    .primaryKey()
    .references(() => usersTable.id),
  count: integer("count").notNull().default(0),
  amountPaid: real("amount_paid").notNull().default(0),
  totalMatchingBv: integer("total_matching_bv").notNull().default(0),
  maxBv: integer("max_bv").notNull().default(0),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const matchingIncomeStatsRelations = relations(
  matchingIncomeStatsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [matchingIncomeStatsTable.id],
      references: [usersTable.id],
      relationName: "matching_income_stats_user_relation",
    }),
  }),
);

export type InsertMatchingIncomeStats =
  typeof matchingIncomeStatsTable.$inferInsert;
export type SelectMatchingIncomeStats =
  typeof matchingIncomeStatsTable.$inferSelect;
