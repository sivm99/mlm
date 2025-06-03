import {
  integer,
  pgEnum,
  pgTable,
  real,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { index } from "drizzle-orm/pg-core";
export const payoutStatusEnum = pgEnum("payoutStatus", [
  "PENDING",
  "PROCESSED",
  "FAILED",
]);

import { relations } from "drizzle-orm";
import { rewardsTable } from "./rewards";

export const payoutsTable = pgTable(
  "payouts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),

    rewardId: integer("reward_id")
      .notNull()
      .references(() => rewardsTable.id),

    amount: real("amount").notNull(),
    status: payoutStatusEnum("status").default("PENDING"),
    payoutDate: timestamp("payout_date").notNull(),
    adminFee: real("admin_fee").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return [
      index("idx_payouts_userId").on(table.userId),
      index("idx_payouts_status").on(table.status),
      index("idx_payouts_createdAt").on(table.createdAt),
    ];
  },
);

// Define payout relations
export const payoutsRelations = relations(payoutsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [payoutsTable.userId],
    references: [usersTable.id],
  }),
}));
