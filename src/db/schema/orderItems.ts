import { pgTable, real, serial, integer } from "drizzle-orm/pg-core";
import { index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { productsTable } from "./products";
import { ordersTable } from "./orders";

export const orderItemsTable = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .references(() => ordersTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    productId: integer("product_id").references(() => productsTable.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
    quantity: integer("quantity").notNull(),
    price: real("price").notNull(),
  },
  (table) => {
    return [
      index("idx_orderItems_orderId").on(table.orderId),
      index("idx_orderItems_productId").on(table.productId),
    ];
  },
);

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderItemsTable.orderId],
    references: [ordersTable.id],
  }),
  product: one(productsTable, {
    fields: [orderItemsTable.productId],
    references: [productsTable.id],
  }),
}));

export type InsertOrderItems = typeof orderItemsTable.$inferInsert;
export type SelectOrderItems = typeof orderItemsTable.$inferSelect;
