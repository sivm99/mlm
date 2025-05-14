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
import { orderItemsTable } from "./orderItems";

// Products table
export const productsTable = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    price: real("price").notNull(),
    stock: integer("stock").default(0),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => {
    return [index("idx_products_name").on(table.name)];
  },
);

// Products relations
export const productsRelations = relations(productsTable, ({ many }) => ({
  orderItems: many(orderItemsTable),
}));
