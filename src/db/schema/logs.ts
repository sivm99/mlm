import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  json,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { transactionsTable } from "./transactions";

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
