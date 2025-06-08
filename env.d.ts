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
  AdminAddALP,
  ConvertIncomeToALP,
  TransactionListing,
  TrasferALPoints,
  VerifyWalletOtp,
} from "@/validation";
import { LoginUser, SafeUser, Side, UpdateFromAdmin, UserId } from "@/types";
import { WalletOperations } from "@/db/schema";
declare module "bun" {
  interface Env {
    DATABASE_URL: string;
    PORT: string | number;
    JWT_SECRET: string;
    HOST: string;
    EXPIRE_TIME_IN_MINUTES: string | number;
    OTP_EXPIRE_TIME_IN_MINUTES: string | number;
    ADMIN_ID: string;
    ADMIN_EMAIL: string;
    ADMIN_PASSWORD: string;
    EMAIL_HOST: string;
    FRONTEND_HOST: string;
    REDIS_URL: string;
  }
}
declare module "hono" {
  interface ContextVariableMap {
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
  }
}
