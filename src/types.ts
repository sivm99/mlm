import { UserSelectSchema } from "@/db/schema/users";
import { RegisterUser } from "@/validation/user.validations";
import { Context } from "hono";

export type User = UserSelectSchema;

// Create a new type that excludes auto-generated fields
export type NewUser = Omit<User, "username" | "sponsor" | "passwordHash"> & {
  password: string;
};
export type LoginUser = {
  username: string;
  password: string;
};
export type SafeUser = Pick<
  User,
  | "username"
  | "name"
  | "mobile"
  | "country"
  | "dialCode"
  | "sponsor"
  | "role"
  | "permissions"
  | "isActive"
  | "isBlocked"
>;

export type Variables = {
  registerUsers: RegisterUser[];
  user: SafeUser;
  loginUser: LoginUser;
};

export type MyContext = Context<{ Variables: Variables }>;
