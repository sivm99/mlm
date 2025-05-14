import { relations } from "drizzle-orm";
import {
  AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { paymentsTable } from "./payments";
import { payoutsTable } from "./payouts";

export const userRole = pgEnum("userRole", ["ADMIN", "SUB_ADMIN", "USER"]);
export const userPosition = pgEnum("userPosition", ["LEFT", "RIGHT"]);

export const usersTable = pgTable(
  "users",
  {
    username: text("username").primaryKey(),
    name: text("name").notNull(),
    mobile: text("mobile").notNull(),
    email: text("email").notNull(),
    country: text("country").notNull(),
    dialCode: text("dialCode").notNull(),

    sponsor: text("sponsor")
      .notNull()
      .references((): AnyPgColumn => usersTable.username, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    position: userPosition("position").notNull(),
    leftUser: text("leftUser").references(
      (): AnyPgColumn => usersTable.username,
      {
        onDelete: "set null",
        onUpdate: "cascade",
      },
    ),
    rightUser: text("rightUser").references(
      (): AnyPgColumn => usersTable.username,
      {
        onDelete: "set null",
        onUpdate: "cascade",
      },
    ),

    isActive: boolean("isActive").default(false),
    isBlocked: boolean("isBlocked").default(false),
    wallet: real("wallet").default(0),
    redeemedTimes: integer("redeemedTimes").default(0),
    associatedUsersCount: integer("associatedUsersCount").default(0),

    passwordHash: text("passwordHash"),
    role: userRole("role").default("USER"),
    permissions: jsonb("permissions").default({}),

    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => {
    return [
      index("idx_users_sponsor").on(table.sponsor),
      index("idx_users_email").on(table.email),
    ];
  },
);

export const userSelectSchema = createSelectSchema(usersTable);

export type UserSelectSchema = typeof userSelectSchema._type;
export const usersRelations = relations(usersTable, ({ one, many }) => ({
  sponsorUser: one(usersTable, {
    fields: [usersTable.sponsor],
    references: [usersTable.username],
    relationName: "userSponsor",
  }),
  leftUserRelation: one(usersTable, {
    fields: [usersTable.leftUser],
    references: [usersTable.username],
    relationName: "userLeft",
  }),
  rightUserRelation: one(usersTable, {
    fields: [usersTable.rightUser],
    references: [usersTable.username],
    relationName: "userRight",
  }),
  payments: many(paymentsTable),
  payouts: many(payoutsTable),
  // orders: many(orderItemsTable),
}));
