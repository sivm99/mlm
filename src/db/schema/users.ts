import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { paymentsTable } from "./payments";
import { payoutsTable } from "./payouts";
import { treeTable } from "./trees";
import { walletsTable } from "./wallets";
import { addressesTable } from "./addresses";
import { ordersTable } from "./orders";
import { arHistoryTable } from "./arHistory";

export const userRole = pgEnum("userRole", ["ADMIN", "SUB_ADMIN", "USER"]);

export const usersTable = pgTable(
  "users",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    mobile: text("mobile").notNull(),
    email: text("email").notNull(),
    country: text("country").notNull(),
    dialCode: text("dial_code").notNull(),
    image: text("image"),

    isActive: boolean("is_active").notNull().default(false),
    isBlocked: boolean("is_blocked").notNull().default(false),
    redeemedCount: integer("redeemed_count").notNull().default(0),

    directUsersCount: integer("direct_users_count").notNull().default(0),
    activeDirectUsersCount: integer("active_direct_users_count")
      .notNull()
      .default(0),

    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("USER"),
    permissions: jsonb("permissions").notNull().default({}),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return [index("idx_users_email").on(table.email)];
  },
);

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  payments: many(paymentsTable),
  payouts: many(payoutsTable),
  wallet: one(walletsTable),
  tree: one(treeTable, {
    fields: [usersTable.id],
    references: [treeTable.id],
    relationName: "userTree",
  }),
  parentUsers: many(treeTable, {
    relationName: "parentUserTree",
  }),
  leftUsers: many(treeTable, {
    relationName: "leftUserTree",
  }),
  rightUsers: many(treeTable, {
    relationName: "rightUserTree",
  }),
  orders: many(ordersTable),
  addresses: many(addressesTable, {
    relationName: "userAddresses",
  }),
  addedByAddress: many(addressesTable, { relationName: "addedByAddresses" }),
  arHistories: many(arHistoryTable, {
    relationName: "userArHistoryRelation",
  }),
}));
