import { ReferralSelect, SelectUser } from "@/db/schema";
import { SafeUserReturn } from "@/lib/services";
import { UpdateUser, UpdateUserByAdmin } from "@/validation";

export type User = SelectUser;

// Create a new type that excludes auto-generated fields
export type NewUser = Omit<User, "id" | "sponsor" | "passwordHash"> & {
  password: string;
};
export type LoginUser = Pick<User, "id"> & {
  password: string;
};
export type SafeUser = SafeUserReturn;

export type TreeUser = SafeUser; // for now it is just safe user;
// export type TreeUser = SafeUser & TreeStats;

export type EmailData = Record<string, string | number | undefined>;

export type UpdateFromUser = UpdateUser;
export type UpdateFromAdmin = UpdateUserByAdmin;

export type Side = ReferralSelect["position"];
export type UserWithWallet = SafeUserReturn & {
  bv: number;
  alpoints: number;
  incomeWallet: number;
};
