import { pgTable, integer, timestamp, real, serial } from "drizzle-orm/pg-core";
import { usersTable } from "../user";
import { relations } from "drizzle-orm";
import { matchingIncomesTable } from "./matching-income.sql";

/**
 * Matching Bonus Table
 *
 * This table stores the matching bonuses paid to users from their downline.
 * The userId field represents the user who is getting paid.
 * The incomeFrom field represents the user from whom they are getting the income.
 * The level field represents the generation (1-5) at which they are getting the income.
 * The paidAmount represents the actual amount which was paid to the user.
 */
export const matchingBonusTable = pgTable("matching_bonus", {
  id: serial("id").primaryKey(),

  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),

  matchingIncomeId: integer("matching_icome_id")
    .notNull()
    .references(() => matchingIncomesTable.id),

  level: integer("level").notNull(),
  paidAmount: real("paid_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const matchingBonusRelations = relations(
  matchingBonusTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [matchingBonusTable.userId],
      references: [usersTable.id],
      relationName: "matching_bonus_user_relation",
    }),
    matchingIncome: one(matchingIncomesTable, {
      fields: [matchingBonusTable.matchingIncomeId],
      references: [matchingIncomesTable.id],
      relationName: "matching_bonus_income_relation",
    }),
  }),
);

export type SelectMatchingBonus = typeof matchingBonusTable.$inferSelect;
export type InsertMatchingBonus = typeof matchingBonusTable.$inferInsert;
