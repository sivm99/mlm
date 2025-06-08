import { relations } from "drizzle-orm";
import { pgTable, integer, real, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "../user";

/**
 * Matching Bonus Stats Table
 *
 * This table stores the aggregated total rewards for each user.
 * Each user will have only one entry in this table.
 * bonus coming from different levels
 * The userId serves as the primary key since one user can have only one stats record.
 */
export const matchingBonusStatsTable = pgTable("matching_bonus_stats", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => usersTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),

  level1Bonus: real("level1_bonus").notNull().default(0),
  level2Bonus: real("level2_bonus").notNull().default(0),
  level3Bonus: real("level3_bonus").notNull().default(0),
  level4Bonus: real("level4_bonus").notNull().default(0),
  level5Bonus: real("level5_bonus").notNull().default(0),

  totalRewards: real("total_rewards").notNull().default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const matchingBonusStatsRelations = relations(
  matchingBonusStatsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [matchingBonusStatsTable.userId],
      references: [usersTable.id],
      relationName: "matching_bonus_stats_user_relation",
    }),
  }),
);

export type SelectMatchingBonusStats =
  typeof matchingBonusStatsTable.$inferSelect;
export type InsertMatchingBonusStats =
  typeof matchingBonusStatsTable.$inferInsert;
