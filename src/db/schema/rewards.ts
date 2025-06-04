import {
  timestamp,
  real,
  pgTable,
  serial,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";
import { usersTable } from "./users";
import { relations } from "drizzle-orm";

export const rewardTypeValues = ["payout", "order", "na"] as const;
export const rewadTypeEnum = pgEnum("reward_type", rewardTypeValues);

export const rewardStatusValues = [
  "active",
  "pending",
  "closed",
  "paused",
] as const;
export const rewardStatusEnum = pgEnum("reward_status", rewardStatusValues);

export const rewardsTable = pgTable("rewards", {
  id: serial("id").notNull().primaryKey(),
  type: rewadTypeEnum("type").notNull().default("na"),
  status: rewardStatusEnum("status").notNull().default("pending"),

  amountPaid: real("amount_paid").notNull().default(0),
  nextPaymentDate: timestamp("next_payment_date", {
    mode: "date",
    precision: 3,
  })
    .notNull()
    .default(new Date("2020-01-01")), // by default they wont have any next payment date

  orderId: integer("order_id").references(() => ordersTable.id),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),

  compoletedAt: timestamp("completed_at", { mode: "date", precision: 3 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const rewardsRelations = relations(rewardsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [rewardsTable.orderId],
    references: [ordersTable.id],
  }),
  user: one(usersTable, {
    fields: [rewardsTable.userId],
    references: [usersTable.id],
  }),
}));

export type InsertReward = typeof rewardsTable.$inferInsert;
export type SelectReward = typeof rewardsTable.$inferSelect;
