import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { ranksTable, usersTable } from "../user";
import { relations } from "drizzle-orm";

/**
 * Lifetime Rewards Table
 *
 * This table stores the rewards given to users based on their rank achievement.
 * The rank field references a rank from the ranks table, representing the user's achieved level.
 * The rewardAmount represents the total reward amount given to the user for reaching that rank.
 */
export const lifetimeRewardsTable = pgTable("lifetime_rewards", {
  id: serial("id").primaryKey(),

  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  rank: integer("rank")
    .notNull()
    .references(() => ranksTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),

  rewardAmount: integer("reward_amount").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lifetimeRewardsRelations = relations(
  lifetimeRewardsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [lifetimeRewardsTable.userId],
      references: [usersTable.id],
      relationName: "lifetime_rewards_user_relation",
    }),
    rank: one(ranksTable, {
      fields: [lifetimeRewardsTable.rank],
      references: [ranksTable.id],
      relationName: "lifetime_rewards_rank_relation",
    }),
  }),
);

export type SelectLifetimeReward = typeof lifetimeRewardsTable.$inferSelect;
export type InsertLifetimeReward = typeof lifetimeRewardsTable.$inferInsert;
