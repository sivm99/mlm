import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./users.sql";
/**
 * Address Table
 *
 * The address of the user the address can be added by any one from the upline since
 * they can also activate the id
 */
export const addressesTable = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, {
      onUpdate: "cascade",
      onDelete: "cascade",
    }),
  title: text("title").notNull(), // the name of the biller
  mobile: text("mobile").notNull(),

  address1: text("address1").notNull(),
  address2: text("address2"),
  address3: text("address3"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  country: text("country").notNull(),

  addedBy: integer("added_by").references(() => usersTable.id, {
    onUpdate: "set null",
    onDelete: "set null",
  }),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const addressRelations = relations(addressesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [addressesTable.userId],
    references: [usersTable.id],
    relationName: "address_user_relation",
  }),
  addedByUser: one(usersTable, {
    fields: [addressesTable.addedBy],
    references: [usersTable.id],
    relationName: "added_by_user_relation",
  }),
}));

export type SelectAddress = typeof addressesTable.$inferSelect;
export type InsertAddress = typeof addressesTable.$inferInsert;
