import { timestamp, integer, pgTable, serial, real } from "drizzle-orm/pg-core";
import { usersTable } from "../user";
import { relations } from "drizzle-orm";

/**
 * Rank Achievement Income Table
 *
 * This table tracks income earned from rank achievements.
 * It records payments made to users based on rank advancements.
 */
export const rankAchievementIncomeTable = pgTable("rank_achievement_income", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),

  amountPaid: real("amount_paid").notNull(),
  activatedUserId: integer("activated_user_id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const rankAchievementIncomeRelations = relations(
  rankAchievementIncomeTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [rankAchievementIncomeTable.userId],
      references: [usersTable.id],
      relationName: "rank_achievement_income_user_relation",
    }),
    activatedUser: one(usersTable, {
      fields: [rankAchievementIncomeTable.activatedUserId],
      references: [usersTable.id],
      relationName: "rank_achievement_income_activated_user_relation",
    }),
  }),
);

export type SelectRankAchievementIncome =
  typeof rankAchievementIncomeTable.$inferSelect;
export type InsertRankAchievementIncome =
  typeof rankAchievementIncomeTable.$inferInsert;
