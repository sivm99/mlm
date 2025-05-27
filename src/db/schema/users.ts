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
import { paymentsTable } from "./payments";
import { payoutsTable } from "./payouts";

export const userRole = pgEnum("userRole", ["ADMIN", "SUB_ADMIN", "USER"]);
export const userPosition = pgEnum("userPosition", ["LEFT", "RIGHT"]);

export const usersTable = pgTable(
  "users",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    mobile: text("mobile").notNull(),
    email: text("email").notNull(),
    country: text("country").notNull(),
    dialCode: text("dialCode").notNull(),
    image: text("image"),

    sponsor: integer("sponsor")
      .notNull()
      .references((): AnyPgColumn => usersTable.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    leftUser: integer("leftUser").references((): AnyPgColumn => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    rightUser: integer("rightUser").references(
      (): AnyPgColumn => usersTable.id,
      {
        onDelete: "set null",
        onUpdate: "cascade",
      },
    ),
    parentUser: integer("parentUser").references(
      (): AnyPgColumn => usersTable.id,
      {
        onDelete: "cascade",
        onUpdate: "cascade",
      },
    ),
    // .notNull(),
    // stats which we will update use the queue n jobs
    // if anyone below comes we will udpate them until upto the parent
    leftCount: integer("leftCount").notNull().default(0),
    rightCount: integer("rightCount").notNull().default(0),
    leftActiveCount: integer("leftActiveCount").notNull().default(0),
    rightActiveCount: integer("rightActiveCount").notNull().default(0),
    leftBv: real("leftBv").notNull().default(0),
    rightBv: real("rightBv").notNull().default(0),

    isActive: boolean("isActive").notNull().default(false),
    isBlocked: boolean("isBlocked").notNull().default(false),

    redeemedCount: integer("redeemedCount").notNull().default(0),
    directUsersCount: integer("directUsersCount").notNull().default(0), // number of referrad users

    activeDirectUsersCount: integer("activeDirectUsersCount")
      .notNull()
      .default(0), // number of users who was referrad and activated their account as well
    passwordHash: text("passwordHash"),
    role: userRole("role").notNull().default("USER"),
    permissions: jsonb("permissions").notNull().default({}),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => {
    return [
      index("idx_users_sponsor").on(table.sponsor),
      index("idx_users_email").on(table.email),
    ];
  },
);

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

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
