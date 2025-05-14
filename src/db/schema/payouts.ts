import {
  pgEnum,
  pgTable,
  real,
  serial,
  text,
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

export const payoutsTable = pgTable(
  "payouts",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => usersTable.username, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    amount: real("amount").notNull(),
    status: payoutStatusEnum("status").default("PENDING"),
    payoutDate: timestamp("payoutDate").notNull(),
    adminFee: real("adminFee").notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
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
    references: [usersTable.username],
  }),
}));
