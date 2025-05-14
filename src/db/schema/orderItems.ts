import { pgTable, real, serial, integer } from "drizzle-orm/pg-core";
import { index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { productsTable } from "./products";
import { ordersTable } from "./orders";

export const orderItemsTable = pgTable(
  "orderItems",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId")
      .references(() => ordersTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    productId: integer("productId")
      .references(() => productsTable.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      })
      .notNull(),
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
