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
import { arHistoryTable } from "./ar-history.sql";
import { payoutsTable } from "../incomes";
import { walletsTable } from "../wallet";
import { treeTable } from "./trees.sql";
import { ordersTable } from "../order";
import { addressesTable } from "./addresses.sql";

export const userRoles = ["admin", "sub_admin", "user"] as const;
export const userRoleEnum = pgEnum("user_role", userRoles);
/**
 * User Table
 *
 * The main users talbe which will have all the important
 * fields about the user as well as the id, the id is used in
 * so many tables directly as primary key where we know there is one to one
 * relation with the user such as wallet each user will only have one wallet
 * and there is no use having two ids for that
 */
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
    activatedAt: timestamp("activated_at"),

    isBlocked: boolean("is_blocked").notNull().default(false),
    isComplementoryId: boolean("is_complementory_id").notNull().default(false),

    rank: integer("rank").notNull().default(0),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("user"),
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

export const usersRelations = relations(usersTable, ({ one, many }) => ({
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

  addedByRelation: many(addressesTable, {
    relationName: "addedByAddresses",
  }),

  arHistories: many(arHistoryTable, {
    relationName: "userArHistoryRelation",
  }),
}));

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;
