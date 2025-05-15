import { UserSelectSchema } from "@/db/schema/users";
import { ForgetPassword, RegisterUser } from "@/validation/auth.validations";
import { Context } from "hono";
import { BulkAdd, UpdateUser } from "./validation/user.validation";

export type User = UserSelectSchema;

// Create a new type that excludes auto-generated fields
export type NewUser = Omit<User, "id" | "sponsor" | "passwordHash"> & {
  password: string;
};
export type LoginUser = {
  id: string;
  password: string;
};
export type SafeUser = Pick<
  User,
  | "id"
  | "name"
  | "mobile"
  | "country"
  | "dialCode"
  | "sponsor"
  | "position"
  | "leftUser"
  | "rightUser"
  | "role"
  | "permissions"
  | "redeemedTimes"
  | "associatedUsersCount"
  | "associatedActiveUsersCount"
  | "isActive"
  | "isBlocked"
  | "wallet"
>;

export type TreeUser = Pick<
  User,
  | "id"
  | "name"
  | "leftUser"
  | "role"
  | "rightUser"
  | "sponsor"
  | "redeemedTimes"
  | "associatedUsersCount"
  | "associatedActiveUsersCount"
  | "isBlocked"
  | "isActive"
  | "wallet"
  | "position"
>;

export type Variables = {
  registerUser: RegisterUser;
  registerUsers: RegisterUser[];
  user: SafeUser;
  loginUser: LoginUser;
  forgetPassword: ForgetPassword;
  updatedUser: UpdateUser;
  bulkAdd: BulkAdd;
};

export type Side = User["position"];
export type MyContext = Context<{ Variables: Variables }>;
