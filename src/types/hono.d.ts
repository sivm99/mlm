import { BulkAdd, OTPEmail, RegisterUser, ResetPassword } from "@/validation";
import {
  LoginUser,
  SafeUser,
  Side,
  UpdateFromAdmin,
  UpdateFromUser,
} from "./user";
import { Context } from "hono";
import { OTPTYPE } from "@/db/schema";
import { WalletOperation } from "./wallet";
import { TrasferALPoints } from "@/validation/wallet.validations";

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
  walletOperation: WalletOperation;
  transferAlPoints: TrasferALPoints;
  convertIncomeToAlp: Pick<TrasferALPoints, "amount" | "otp">;
};
export type MyContext = Context<{ Variables: Variables }>;
export type OTP = OTPTYPE;
