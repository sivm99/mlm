import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "../user";
import { relations } from "drizzle-orm";

/**
 * Lifetime Reward Stats Table
 *
 * This table tracks the cumulative reward statistics for users.
 * It stores the total rewards earned by a user over time.
 */
export const lifetimeRewardsStatsTable = pgTable("lifetime_reward_stats", {
  id: integer("id")
    .primaryKey()
    .references(() => usersTable.id),

  totalRewards: integer("total_reward").notNull().default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const lifetimeRewardsStatsRelations = relations(
  lifetimeRewardsStatsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [lifetimeRewardsStatsTable.id],
      references: [usersTable.id],
      relationName: "lifetime_rewards_stats_user_relation",
    }),
  }),
);

export type SelectLifetimeRewardStats =
  typeof lifetimeRewardsStatsTable.$inferSelect;
export type InsertLifetimeRewardStats =
  typeof lifetimeRewardsStatsTable.$inferInsert;
