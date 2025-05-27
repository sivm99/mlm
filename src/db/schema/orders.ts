import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  real,
  timestamp,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { orderItemsTable } from "./orderItems";

export const orderStatusEnum = pgEnum("orderStatus", [
  "PENDING",
  "PROCESSING",
  "DELIVERED",
  "CANCELLED",
]);
export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => usersTable.id)
    .notNull(),
  status: orderStatusEnum("status").default("PENDING"),
  deliveryAddress: text("delivery_address"),
  totalAmount: real("total_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [ordersTable.userId],
    references: [usersTable.id],
  }),
  items: many(orderItemsTable),
}));
