import { UserSelectSchema } from "@/db/schema";
import { RegisterUser } from "@/validation/user.validations";

export type User = UserSelectSchema;

// Create a new type that excludes auto-generated fields
export type NewUser = Omit<User, "username" | "sponsor" | "passwordHash"> & {
  password: string;
};
export type LoginUser = {
  username: string;
  password: string;
};

export type Variables = {
  registerUsers: RegisterUser[];
};
