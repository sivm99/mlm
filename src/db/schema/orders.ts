import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  real,
  timestamp,
  pgEnum,
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
  userId: text("userId")
    .references(() => usersTable.id)
    .notNull(),
  status: orderStatusEnum("status").default("PENDING"),
  deliveryAddress: text("deliveryAddress"),
  totalAmount: real("totalAmount").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [ordersTable.userId],
    references: [usersTable.id],
  }),
  items: many(orderItemsTable),
}));
