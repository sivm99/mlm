import { SelectPayout } from "@/db/schema";
import { Reward } from "./sales.reward";
import { UserId } from "./user";

export type Payout = SelectPayout;

export type IncomePayoutArgs = {
  userId: UserId;
  rewardId: Reward["id"];
  status: Payout["status"];
};
