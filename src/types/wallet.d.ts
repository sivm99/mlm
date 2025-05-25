import { SelectTransaction, SelectWallet } from "@/db/schema";
import { User } from "./user";

export type TransferParams = {
  fromUserId: string;
  toUserId: string;
  amount: number;
  type: "alpoints_transfer";
  description: string | undefined;
  otp: string | undefined;
};

export type Wallet = SelectWallet;

export type ConvertIncomeParams = {
  userId: string;
  amount: number;
  type: "income_to_alpoints" | "income_payout";
  otp: string;
};

export type WalletTransaction = {
  type: SelectTransaction["type"];
  fromUserId: User["id"] | undefined;
  toUserId: User["id"] | undefined;
  fromWalletType: SelectTransaction["fromWalletType"] | undefined;
  toWalletType: SelectTransaction["toWalletType"] | undefined;
  amount: number;
  deductionPercentage: number | undefined;
  description: string | undefined;
  reference: string | undefined;
  metadata: Record<string, unknown> | undefined;
  requiresOtp: boolean | undefined;
};
