import { SelectUser } from "@/db/schema";
import { UpdateUser, UpdateUserByAdmin } from "@/validation";

export type User = SelectUser;

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

export type Side = User["position"];
