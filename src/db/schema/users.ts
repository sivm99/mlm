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
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  tree: one(treeTable),
  wallet: one(walletsTable),
  // orders: many(orderItemsTable),
}));
