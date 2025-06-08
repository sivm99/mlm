import { relations } from "drizzle-orm";
import { index } from "drizzle-orm/pg-core";
import {
  pgTable,
  serial,
  text,
  real,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { orderItemsTable } from "./order-items.sql";
/**
 * Products table
 * keeps all the products which we sell
 */
export const productsTable = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    price: real("price").notNull(),
    stock: integer("stock").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return [index("idx_products_name").on(table.name)];
  },
);

// Products relations
export const productsRelations = relations(productsTable, ({ many }) => ({
  orderItems: many(orderItemsTable),
}));

export type InsertProduct = typeof productsTable.$inferInsert;
export type SelectProduct = typeof productsTable.$inferSelect;
