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
import { payoutsTable } from "./payouts";
import { treeTable } from "./trees";
import { walletsTable } from "./wallets";
import { addressesTable } from "./addresses";
import { ordersTable } from "./orders";
import { arHistoryTable } from "./arHistory";

export const userRole = pgEnum("user_role", ["admin", "sub_admin", "user"]);

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
    isComplementoryId: boolean("is_complementory_id").notNull().default(false),

    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("user"),
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

  arHistories: many(arHistoryTable, {
    relationName: "userArHistoryRelation",
  }),
}));
