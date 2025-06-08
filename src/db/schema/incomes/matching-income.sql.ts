import { real, timestamp, integer, pgTable, serial } from "drizzle-orm/pg-core";
import { usersTable } from "../user";
import { relations } from "drizzle-orm";
import { matchingBonusTable } from "./matching-bonus.sql";

/**
 * Matching Incomes Table
 *
 * This table stores the matching income payments made to users.
 * The amountPaid field represents the monetary value paid to the user.
 * The matchingBv field represents the business volume points associated with the matching income.
 * Each record is tied to a specific user through the userId foreign key.
 */
export const matchingIncomesTable = pgTable("matching_income", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  amountPaid: real("amount_paid").notNull(),
  matchingBv: integer("matching_bv").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const matchingIncomesRelations = relations(
  matchingIncomesTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [matchingIncomesTable.userId],
      references: [usersTable.id],
      relationName: "matching_incomes_user_relation",
    }),

    matchingBonus: one(matchingBonusTable),
  }),
);

export type InsertMatchingIncome = typeof matchingIncomesTable.$inferInsert;
export type SelectMatchingIncome = typeof matchingIncomesTable.$inferSelect;
