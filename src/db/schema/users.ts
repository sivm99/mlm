import { relations } from "drizzle-orm";
import {
  AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
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
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    mobile: text("mobile").notNull(),
    email: text("email").notNull(),
    country: text("country").notNull(),
    dialCode: text("dialCode").notNull(),

    sponsor: text("sponsor")
      .notNull()
      .references((): AnyPgColumn => usersTable.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    position: userPosition("position").notNull(),
    leftUser: text("leftUser").references((): AnyPgColumn => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    rightUser: text("rightUser").references((): AnyPgColumn => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),

    isActive: boolean("isActive").notNull().default(false),
    isBlocked: boolean("isBlocked").notNull().default(false),

    redeemedTimes: integer("redeemedTimes").notNull().default(0),
    associatedUsersCount: integer("associatedUsersCount").notNull().default(0), // number of referrad users

    associatedActiveUsersCount: integer("associatedActiveUsersCount")
      .notNull()
      .default(0), // number of users who was referrad and activated their account as well
    passwordHash: text("passwordHash"),
    role: userRole("role").notNull().default("USER"),
    permissions: jsonb("permissions").notNull().default({}),

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
    references: [usersTable.id],
    relationName: "userSponsor",
  }),
  leftUserRelation: one(usersTable, {
    fields: [usersTable.leftUser],
    references: [usersTable.id],
    relationName: "userLeft",
  }),
  rightUserRelation: one(usersTable, {
    fields: [usersTable.rightUser],
    references: [usersTable.id],
    relationName: "userRight",
  }),
  payments: many(paymentsTable),
  payouts: many(payoutsTable),
  // orders: many(orderItemsTable),
}));
