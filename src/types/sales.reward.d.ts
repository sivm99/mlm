import { SelectReward } from "@/db/schema";
import { UserId } from "./user";

export type Reward = SelectReward;
export type RewardClaimOption = Exclude<Reward["type"], "na">;

export type PayoutProcessResult = {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: string[];
};

export type RewardEligibilityCheck = {
  isEligible: boolean;
  reason?: string;
  currentWeek?: number;
  amountPaid?: number;
  remainingAmount?: number;
};

export type CreateRewardPayload = {
  userId: UserId;
  type: "payout" | "order";
  orderId?: number;
};

export type ClaimPayoutResult = {
  success: boolean;
  rewardId: number;
  nextPaymentDate?: Date;
  message: string;
};

export type ClaimOrderResult = {
  success: boolean;
  rewardId: number;
  orderId: number;
  message: string;
};

export type EligiblePayoutRecord = Pick<
  Reward,
  "id" | "userId" | "amountPaid" | "nextPaymentDate"
>;
