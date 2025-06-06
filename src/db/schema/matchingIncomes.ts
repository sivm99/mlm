import { real, timestamp, integer, pgTable, serial } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const matchingIncomesTable = pgTable("matching_income", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  amountPaid: real("amount_paid").notNull(),
  matchingBv: integer("matching_bv").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertMatchingIncome = typeof matchingIncomesTable.$inferInsert;
export type SelectMatchingIncome = typeof matchingIncomesTable.$inferSelect;
