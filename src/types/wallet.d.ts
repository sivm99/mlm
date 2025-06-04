import { SelectTransaction, SelectWallet } from "@/db/schema";
import { UserId } from "./user";
import { Reward } from "./sales.reward";

export type TransferParams = {
  fromUserId: UserId;
  toUserId: UserId;
  amount: number;
  // type: "alpoints_transfer";
  description: string | undefined;
  otp: string | undefined;
};

export type Wallet = SelectWallet;
export type Transaction = SelectTransaction;
export type ConvertIncomeParams = {
  userId: UserId;
  amount: number;
  type: "income_to_alpoints" | "income_payout";
  otp: string;
};

export type WalletTransaction = {
  type: SelectTransaction["type"];
  fromUserId: UserId | undefined;
  toUserId: UserId | undefined;
  fromWalletType: SelectTransaction["fromWalletType"] | undefined;
  toWalletType: SelectTransaction["toWalletType"] | undefined;
  amount: number;
  deductionPercentage: number | undefined;
  description: string | undefined;
  reference: string | undefined;
  metadata: Record<string, unknown> | undefined;
  requiresOtp: boolean | undefined;
};

export type AddIncomeArgs = {
  userId: UserId;
  amount: number;
  type: "weekly_payout_earned" | "matching_income_earned";
  description?: string;
  rewardId?: Reward["id"];
};
