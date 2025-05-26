import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { transactionsTable } from "./transactions";

// Logs table for admin monitoring
export const logsTable = pgTable("logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull().default("info"), // info, warn, error
  action: text("action").notNull(),
  userId: integer("userId").references(() => usersTable.id),
  transactionId: integer("transactionId").references(
    () => transactionsTable.id,
  ),
  message: text("message").notNull(),
  metadata: text("metadata"), // JSON string
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
