import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "../user";
import { relations } from "drizzle-orm";

/**
 * Rank Achievement Income Stats Table
 *
 * This table tracks the income statistics from rank achievements for users.
 * It stores the data related to income earned through rank advancements.
 */
export const rankAchievementIncomeStatsTable = pgTable(
  "rank_achievement_income_stats",
  {
    id: integer("id")
      .primaryKey()
      .references(() => usersTable.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
);

export const rankAchievementIncomeStatsRelations = relations(
  rankAchievementIncomeStatsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [rankAchievementIncomeStatsTable.id],
      references: [usersTable.id],
      relationName: "rank_achievement_income_stats_user_relation",
    }),
  }),
);

export type SelectRankAchievementIncomeStats =
  typeof rankAchievementIncomeStatsTable.$inferSelect;
export type InsertRankAchievementIncomeStats =
  typeof rankAchievementIncomeStatsTable.$inferInsert;
