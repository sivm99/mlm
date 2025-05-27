import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { transactionsTable } from "./transactions";

// Logs table for admin monitoring
export const logsTable = pgTable("logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull().default("info"), // info, warn, error
  action: text("action").notNull(),
  userId: integer("user_id").references(() => usersTable.id),
  transactionId: integer("transaction_id").references(
    () => transactionsTable.id,
  ),
  message: text("message").notNull(),
  metadata: text("metadata"), // JSON string
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
