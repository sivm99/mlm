import {
  ActivateUserId,
  BulkAdd,
  CreateAddress,
  ListAddresses,
  ListArHistory,
  OTPEmail,
  RegisterUser,
  ResetPassword,
  UpdateAddress,
} from "@/validation";
import { LoginUser, SafeUser, Side, UpdateFromAdmin, UserId } from "./user";
import { Context } from "hono";
import { OTPTYPE, WalletOperations } from "@/db/schema";
import {
  AdminAddALP,
  ConvertIncomeToALP,
  TransactionListing,
  TrasferALPoints,
  VerifyWalletOtp,
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
  id: UserId;
  ids: UserId[];
  resetPassword: ResetPassword;
  walletOperation: WalletOperations[number];
  verifyWalletOtp: VerifyWalletOtp;
  transferAlPoints: TrasferALPoints;
  convertIncomeToAlp: ConvertIncomeToALP;
  adminAddAlpoints: AdminAddALP;
  transactionListing: TransactionListing;
  activateUserIdPayload: ActivateUserId;
  createAddress: CreateAddress;
  updateAddress: UpdateAddress;
  listAddresses: ListAddresses;
  listArHistory: ListArHistory;
};
export type MyContext = Context<{ Variables: Variables }>;
export type OTP = OTPTYPE;
