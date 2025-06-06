import {
  ActivateUserId,
  BulkAdd,
  CreateAddress,
  ListAddresses,
  ListArHistory,
  OTPEmail,
  RedeemSaleReward,
  RegisterUser,
  ResetPassword,
  UpdateAddress,
} from "@/validation";
import { LoginUser, SafeUser, Side, UpdateFromAdmin, UserId } from "./user";
import { Context } from "hono";
import { WalletOperations } from "@/db/schema";
import {
  AdminAddALP,
  ConvertIncomeToALP,
  TransactionListing,
  TrasferALPoints,
  VerifyWalletOtp,
} from "@/validation/wallet.validations";

export type Variables = {
  // auth context
  otpEmail: OTPEmail;
  registerUser: RegisterUser;
  registerUsers: RegisterUser[];
  resetPassword: ResetPassword;

  // user context
  user: SafeUser;
  loginUser: LoginUser;
  updatedUser: UpdateFromAdmin;
  bulkAdd: BulkAdd;
  side: Side | "full";
  activateUserIdPayload: ActivateUserId;
  id: UserId;
  ids: UserId[];

  // wallet context
  walletOperation: WalletOperations[number];
  verifyWalletOtp: VerifyWalletOtp;
  transferAlPoints: TrasferALPoints;
  convertIncomeToAlp: ConvertIncomeToALP;
  adminAddAlpoints: AdminAddALP;
  transactionListing: TransactionListing;

  // address context
  createAddress: CreateAddress;
  updateAddress: UpdateAddress;
  listAddresses: ListAddresses;
  listArHistory: ListArHistory;

  // reward context
  redeemReward: RedeemSaleReward;
};
export type MyContext = Context<{ Variables: Variables }>;
