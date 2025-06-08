import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  json,
} from "drizzle-orm/pg-core";
import { usersTable } from "../user";
import { transactionsTable } from "../wallet";
import { relations } from "drizzle-orm";

/**
 * Logs Table
 *
 * This table tracks system logs and user actions.
 * It stores information about events, their severity, and related entities.
 */
export const logsTable = pgTable("logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull().default("info"),
  action: text("action").notNull(),

  userId: integer("user_id").references(() => usersTable.id),
  transactionId: integer("transaction_id").references(
    () => transactionsTable.id,
  ),

  message: text("message").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const logsRelations = relations(logsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [logsTable.userId],
    references: [usersTable.id],
    relationName: "logs_user_relation",
  }),
  transaction: one(transactionsTable, {
    fields: [logsTable.transactionId],
    references: [transactionsTable.id],
    relationName: "logs_transaction_relation",
  }),
}));

export type SelectLog = typeof logsTable.$inferSelect;
export type InsertLog = typeof logsTable.$inferInsert;
