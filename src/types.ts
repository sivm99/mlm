import { UserSelectSchema } from "@/db/schema/users";
import {
  OTPEmail,
  RegisterUser,
  ResetPassword,
} from "@/validation/auth.validations";
import { Context } from "hono";
import {
  BulkAdd,
  UpdateUser,
  UpdateUserByAdmin,
} from "./validation/user.validation";
import { OTPTYPE } from "./db/schema";

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
  | "email"
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
  | "position"
>;

export type EmailData = Record<string, string | number | undefined>;

export type UpdateFromUser = UpdateUser;
export type UpdateFromAdmin = UpdateUserByAdmin;
export type Variables = {
  otpEmail: OTPEmail;
  registerUser: RegisterUser;
  registerUsers: RegisterUser[];
  user: SafeUser;
  loginUser: LoginUser;
  updatedUser: UpdateFromUser | UpdateFromAdmin;
  bulkAdd: BulkAdd;
  side: Side | "FULL";
  id: SafeUser["id"];
  resetPassword: ResetPassword;
};

export type Side = User["position"];
export type MyContext = Context<{ Variables: Variables }>;

export type OTP = OTPTYPE;
