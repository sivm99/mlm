import db from "@/db";
import { InsertPayout, payoutsTable } from "@/db/schema";
import { IncomePayoutArgs } from "@/types";

export default class PayoutService {
  #REWARD_CONFIG = {
    WEEKLY_PAYOUT_AMOUNT: 3, // $3 per week
    MAX_WEEKS: 104, // 104 weeks maximum
    TOTAL_PAYOUT_AMOUNT: 312, // $3 * 104 weeks = $312
    ORDER_IMMEDIATE_CLOSE: true,
    ADMIN_FEE: 0,
  } as const;

  async insertPayoutRecord(record: InsertPayout) {
    await db.insert(payoutsTable).values(record).execute();
  }

  async insertRewardPayout({
    userId,
    saleRewardId,
    matchingIncomeId,
    status,
  }: IncomePayoutArgs) {
    // Create payout record
    await db.insert(payoutsTable).values({
      userId,
      saleRewardId,
      matchingIncomeId,
      amount: this.#REWARD_CONFIG.WEEKLY_PAYOUT_AMOUNT,
      status,
      payoutDate: new Date(),
      adminFee: this.#REWARD_CONFIG.ADMIN_FEE,
    });
  }
}

export const payoutService = new PayoutService();
