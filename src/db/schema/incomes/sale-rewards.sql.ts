import {
  timestamp,
  real,
  pgTable,
  serial,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { ordersTable } from "../order";
import { usersTable } from "../user";

/**
 * Possible reward types for sale rewards
 * - payout: Reward associated with a monetary payout
 * - order: When they redeem the sale reward as an order
 * - na: Not applicable or undefined type
 */
export const rewardTypeValues = ["payout", "order", "na"] as const;
export const rewadTypeEnum = pgEnum("sale_reward_type", rewardTypeValues);

/**
 * Possible statuses for sale rewards
 * - pending: The reward is pending when they have not made any choice
 * - active: The reward is currently active only when its in payout type
 * - paused: The reward is temporarily paused by admin
 * - closed: The reward has been completed and closed
 */
export const rewardStatusValues = [
  "pending",
  "active",
  "paused",
  "closed",
] as const;
export const rewardStatusEnum = pgEnum(
  "sale_reward_status",
  rewardStatusValues,
);

/**
 * Table representing sales rewards in the system
 *
 * One record with pending state and na type is inserted when two direct acitve memebers are added
 * including their status, payment information, and relationships to orders and users.
 */
export const saleRewardsTable = pgTable("sale_rewards", {
  id: serial("id").primaryKey(),
  type: rewadTypeEnum("type").notNull().default("na"),
  status: rewardStatusEnum("status").notNull().default("pending"),
  amountPaid: real("amount_paid").notNull().default(0),
  nextPaymentDate: timestamp("next_payment_date", {
    mode: "date",
    precision: 3,
  })
    .notNull()
    .default(new Date("2020-01-01")),
  orderId: integer("order_id").references(() => ordersTable.id),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  claimedAt: timestamp("claimed_at", { mode: "date", precision: 3 }),
  completedAt: timestamp("completed_at", { mode: "date", precision: 3 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const rewardsRelations = relations(saleRewardsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [saleRewardsTable.orderId],
    references: [ordersTable.id],
  }),

  user: one(usersTable, {
    fields: [saleRewardsTable.userId],
    references: [usersTable.id],
  }),
}));

export type InsertReward = typeof saleRewardsTable.$inferInsert;
export type SelectReward = typeof saleRewardsTable.$inferSelect;
