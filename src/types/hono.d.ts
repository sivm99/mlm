import { BulkAdd, OTPEmail, RegisterUser, ResetPassword } from "@/validation";
import { LoginUser, SafeUser, Side, UpdateFromAdmin } from "./user";
import { Context } from "hono";
import { OTPTYPE, WalletOperations } from "@/db/schema";
import {
  AdminAddALP,
  TransactionListing,
  TrasferALPoints,
} from "@/validation/wallet.validations";

export type Variables = {
  otpEmail: OTPEmail;
  registerUser: RegisterUser;
  registerUsers: RegisterUser[];
  user: SafeUser;
  loginUser: LoginUser;
  updatedUser: UpdateFromAdmin;
  bulkAdd: BulkAdd;
  side: Side | "FULL";
  id: SafeUser["id"];
  ids: SafeUser["id"][];
  resetPassword: ResetPassword;
  walletOperation: WalletOperations[number];
  transferAlPoints: TrasferALPoints;
  convertIncomeToAlp: Pick<TrasferALPoints, "amount" | "otp">;
  adminAddAlpoints: AdminAddALP;
  transactionListing: TransactionListing;
};
export type MyContext = Context<{ Variables: Variables }>;
export type OTP = OTPTYPE;
