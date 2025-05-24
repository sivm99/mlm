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
export type SafeUser = Omit<User, "passwordHash">;

export type TreeUser = SafeUser; // for now it is just safe user;
export type EmailData = Record<string, string | number | undefined>;

export type UpdateFromUser = UpdateUser;
export type UpdateFromAdmin = UpdateUserByAdmin;

export type Side = User["position"];
