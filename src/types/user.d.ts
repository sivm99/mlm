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

export type EmailData = Record<string, string | number | undefined>;

export type UpdateFromUser = UpdateUser;
export type UpdateFromAdmin = UpdateUserByAdmin;

export type Side = ReferralSelect["position"];
export type UserWithWallet = SafeUserReturn & {
  bv: number;
  alpoints: number;
  incomeWallet: number;
};

export type SponsorIncrementArgs = {
  id: User["id"];
  directCount: 1 | 0;
  activeDirectCount: 1 | 0;
};

export type ToggleAccountArgs = {
  id: User["id"];
  isActive: User["isActive"];
  // addBv: boolean;
};

export type UserId = User["id"];
