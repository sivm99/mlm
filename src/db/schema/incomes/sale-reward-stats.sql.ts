import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "../user";
import { relations } from "drizzle-orm";

/**
 * Sale Rewards Stats Table
 *
 * This table tracks the cumulative sale reward statistics for users.
 * It stores information about achieved, redeemed and paid out rewards.
 */
export const saleRewardsStatsTable = pgTable("sale_rewards_stats", {
  id: integer("id")
    .primaryKey()
    .references(() => usersTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),

  achievedCount: integer("achieved_count").notNull().default(0),
  redeemedCount: integer("redeemed_count").notNull().default(0),
  payoutCount: integer("payout_count").notNull().default(0),
  payoutToRedeemCount: integer("payout_to_redeem_count").default(0),
  totalPaidAmount: integer("total_paid_amount").notNull().default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const saleRewardsStatsRelations = relations(
  saleRewardsStatsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [saleRewardsStatsTable.id],
      references: [usersTable.id],
      relationName: "sale_rewards_stats_user_relation",
    }),
  }),
);

export type SelectSaleRewardsStats = typeof saleRewardsStatsTable.$inferSelect;
export type InsertSaleRewardsStats = typeof saleRewardsStatsTable.$inferInsert;
