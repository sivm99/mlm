import {
  serial,
  pgTable,
  text,
  timestamp,
  index,
  real,
  integer,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { packagesTable } from "./packages";
import { relations } from "drizzle-orm";

// Payments table
export const paymentsTable = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => usersTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    amount: real("amount").notNull(),
    packageId: integer("packageId").references(() => packagesTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    status: text("status").notNull(),
    transactionId: text("transactionId"),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (table) => {
    return [
      index("idx_payments_userId").on(table.userId),
      index("idx_payments_packageId").on(table.packageId),
      index("idx_payments_createdAt").on(table.createdAt),
    ];
  },
);

// Define payment relations
export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [paymentsTable.userId],
    references: [usersTable.id],
  }),
  package: one(packagesTable, {
    fields: [paymentsTable.packageId],
    references: [packagesTable.id],
  }),
}));
