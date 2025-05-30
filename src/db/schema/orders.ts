import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  real,
  timestamp,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { addressesTable } from "./addresses";

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "PROCESSING",
  "DELIVERED",
  "CANCELLED",
]);
export const deliveryMethodEnum = pgEnum("delivery_method", [
  "self_collect",
  "shipping",
]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),

  userId: integer("user_id")
    .references(() => usersTable.id)
    .notNull(),

  status: orderStatusEnum("status").default("PENDING"),
  deliveryAddress: integer("delivery_address").references(
    () => addressesTable.id,
  ),
  deliveryMethod: deliveryMethodEnum("delivery_method").default("self_collect"),
  totalAmount: real("total_amount").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const ordersRelations = relations(ordersTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [ordersTable.userId],
    references: [usersTable.id],
  }),
  address: one(addressesTable, {
    fields: [ordersTable.deliveryAddress],
    references: [addressesTable.id],
  }),
}));

export type SelectOrder = typeof ordersTable.$inferSelect;
export type InsertOrder = typeof ordersTable.$inferInsert;
