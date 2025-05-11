import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// for any kind of enum we need to export const them as well so that we can have types for them
export const userRole = pgEnum("userRole", ["ADMIN", "USER"]);

// we wont be using any varchar with lenght rather we will enforce them using our own checks let the postgresql handle itself
export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    userName: text("username").notNull(),
    age: integer("age").notNull(),
    email: text("email").notNull(),
  },
  (table) => {
    return {
      emailIndex: uniqueIndex("emailIndex").on(table.email),
      // uniqueNameAndAge,
    };
  },
);
// one to one relation one user wil have only one preferences table
export const userPreferencesTable = pgTable("userPreferences", {
  id: serial("id").primaryKey(),
  emailUpdates: boolean("emailUpdates").notNull().default(false),
  userId: integer("userId")
    .references(() => usersTable.id)
    .notNull(),
});

// one to many relation

export const postTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  averageRating: real("averageRating").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
  authorId: integer("authorId")
    .references(() => usersTable.id)
    .notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

// many to many relation
// we can use here composit key as our primary key since the post and category combination will always be unique
export const postCategoryTable = pgTable(
  "postCategory",
  {
    postId: integer("postId").references(() => postTable.id),
    categoryId: integer("categoryId").references(() => categories.id),
  },
  (table) => {
    return {
      pk: primaryKey({
        columns: [table.postId, table.categoryId],
      }),
    };
  },
);
