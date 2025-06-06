import { SelectMatchingIncome, SelectPayout } from "@/db/schema";
import { Reward } from "./sale.rewards";
import { UserId } from "./user";

export type Payout = SelectPayout;

export type IncomePayoutArgs = {
  userId: UserId;
  saleRewardId?: Reward["id"];
  matchingIncomeId?: MatchingIncome["id"];
  status: Payout["status"];
};

export type CalculateMatchingIncomeArgs = {
  userId: UserId;
  leftBv: number;
  rightBv: number;
  cfLeftBv: number;
  cfRightBv: number;
  todayLeftBv: number;
  todayRightBv: number;
};

export type MatchingIncome = SelectMatchingIncome;

/**
 * Result interface for daily matching income processing
 */
type DailyMatchingProcessResult = {
  success: boolean;
  processedCount: number;
  failedCount: number;
  totalRewardAmount: number;
  errors: string[];
};
