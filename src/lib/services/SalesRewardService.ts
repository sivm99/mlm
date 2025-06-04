import db, { adminId } from "@/db";
import {
  rewardsTable,
  SelectReward,
  ordersTable,
  InsertOrder,
  userStatsTable,
} from "@/db/schema";
import {
  AddIncomeArgs,
  ClaimOrderResult,
  PayoutProcessResult,
  Reward,
  UserId,
} from "@/types";
import { eq, and, lte, count } from "drizzle-orm";
import { walletService } from "./WalletService";
import { ClaimPayoutResult } from "@/types";
import { orderService } from "./OrderService";
import { sql } from "drizzle-orm";
import { inArray } from "drizzle-orm";

/**
 * SalesRewardService handles the complete sales reward system including
 * payout rewards, order rewards, eligibility checks, and cron job processing
 */
export default class SalesRewardService {
  /**
   * Configuration constants for the sales reward system
   */

  #REWARD_CONFIG = {
    WEEKLY_PAYOUT_AMOUNT: 3, // $3 per week
    MAX_WEEKS: 104, // 104 weeks maximum
    TOTAL_PAYOUT_AMOUNT: 312, // $3 * 104 weeks = $312
    ORDER_IMMEDIATE_CLOSE: true,
    ADMIN_FEE: 0,
  } as const;

  async insertPendingRewards(userId: UserId, rewardCount = 1) {
    const rewards = Array.from({ length: rewardCount }, () => ({
      userId,
      type: "na" as const,
      status: "pending" as const,
    }));
    await db.insert(rewardsTable).values(rewards).execute();
  }

  async getRewardsCountByUserId(userId: UserId) {
    const [rewardCount] = await db
      .select({ count: count() })
      .from(rewardsTable)
      .where(eq(rewardsTable.userId, userId));
    return rewardCount.count;
  }

  /**
   * Claim reward as payout - sets up weekly payout schedule
   */
  async claimRewardPayout(
    rewardId: SelectReward["id"],
  ): Promise<ClaimPayoutResult> {
    try {
      // Fetch reward record
      const [reward] = await db
        .select()
        .from(rewardsTable)
        .where(eq(rewardsTable.id, rewardId))
        .limit(1);

      if (!reward) {
        return {
          success: false,
          rewardId,
          message: "Reward record not found",
        };
      }

      // Check if reward is eligible for payout claim
      if (reward.status !== "pending") {
        return {
          success: false,
          rewardId,
          message: "Reward is not in pending status",
        };
      }

      // Update reward to payout type and active status
      const nextPaymentDate = this.calculateNextPaymentDate();
      await db
        .update(rewardsTable)
        .set({
          type: "payout",
          status: "active",
          nextPaymentDate: nextPaymentDate,
        })
        .where(eq(rewardsTable.id, rewardId));

      await db.update(userStatsTable).set({
        redeemedCount: sql`${userStatsTable.redeemedCount} + 1`,
      });

      return {
        success: true,
        rewardId,
        nextPaymentDate,
        message:
          "Payout reward claimed successfully. You will receive weekly payments.",
      };
    } catch (err) {
      console.error("Error claiming payout reward:", err);
      return {
        success: false,
        rewardId,
        message: "Failed to claim payout reward",
      };
    }
  }

  /**
   * Claim reward as order - creates immediate order and closes reward
   */
  async claimRewardOrder(
    rewardId: SelectReward["id"],
    orderDetails: Omit<InsertOrder, "userId" | "totalAmount">,
  ): Promise<ClaimOrderResult> {
    try {
      // Fetch reward record
      const [reward] = await db
        .select()
        .from(rewardsTable)
        .where(eq(rewardsTable.id, rewardId))
        .limit(1);

      if (!reward) {
        return {
          success: false,
          rewardId,
          orderId: 0,
          message: "Reward record not found",
        };
      }

      const rewardRecord = reward;

      // Check eligibility
      if (rewardRecord.status === "closed") {
        return {
          success: false,
          rewardId,
          orderId: 0,
          message: "Reward is already closed",
        };
      }

      // Calculate order amount based on paid amount or use available balance
      const orderAmount = Math.max(
        rewardRecord.amountPaid,
        this.#REWARD_CONFIG.TOTAL_PAYOUT_AMOUNT,
      );

      // Create order
      const [insertedOrder] = await db
        .insert(ordersTable)
        .values({
          userId: rewardRecord.userId,
          totalAmount: orderAmount,
          status: "PENDING",
          ...orderDetails,
        })
        .returning({ id: ordersTable.id });

      if (!insertedOrder) {
        return {
          success: false,
          rewardId,
          orderId: 0,
          message: "Failed to create order",
        };
      }

      const orderId = insertedOrder.id;

      await db
        .update(rewardsTable)
        .set({
          type: "order",
          status: "closed",
          compoletedAt: new Date(),
          orderId: orderId,
        })
        .where(eq(rewardsTable.id, rewardId));

      await orderService.placeSalesRewardOrder(orderId);

      await db.update(userStatsTable).set({
        redeemedCount: sql`${userStatsTable.redeemedCount} + 1`,
      });

      return {
        success: true,
        rewardId,
        orderId,
        message: "Order reward claimed successfully. Order has been placed.",
      };
    } catch (err) {
      console.error("Error claiming order reward:", err);
      return {
        success: false,
        rewardId,
        orderId: 0,
        message: "Failed to claim order reward",
      };
    }
  }

  /**
   * Convert existing payout reward to order after certain weeks
   */
  async convertPayoutToOrder(
    rewardId: SelectReward["id"],
    orderDetails: Omit<InsertOrder, "userId" | "totalAmount">,
  ): Promise<ClaimOrderResult> {
    try {
      const [reward] = await db
        .select()
        .from(rewardsTable)
        .where(eq(rewardsTable.id, rewardId))
        .limit(1);

      if (!reward) {
        return {
          success: false,
          rewardId,
          orderId: 0,
          message: "Reward record not found",
        };
      }

      const rewardRecord = reward;

      if (rewardRecord.type !== "payout" || rewardRecord.status !== "active") {
        return {
          success: false,
          rewardId,
          orderId: 0,
          message: "Reward is not an active payout reward",
        };
      }

      // Use the amount already paid for the order
      const withdrawnAmount = rewardRecord.amountPaid;
      // first of all we will cut this amount from the users wallet for the order

      await walletService.transferAlPoints({
        fromUserId: reward.userId,
        toUserId: adminId,
        amount: withdrawnAmount,
        otp: undefined,
        description: `Balance amount paid for the product`,
      });

      // Create order
      const [insertedOrder] = await db
        .insert(ordersTable)
        .values({
          userId: rewardRecord.userId,
          totalAmount: this.#REWARD_CONFIG.TOTAL_PAYOUT_AMOUNT,
          status: "PENDING",
          ...orderDetails,
        })
        .returning({ id: ordersTable.id });

      const orderId = insertedOrder.id;

      await db
        .update(rewardsTable)
        .set({
          type: "order",
          status: "closed",
          compoletedAt: new Date(),
          orderId: orderId,
        })
        .where(eq(rewardsTable.id, rewardId));

      await orderService.placeSalesRewardOrder(orderId); // this will populatd the orderitems with 6 packat

      return {
        success: true,
        rewardId,
        orderId,
        message: `Payout converted to order successfully. Order amount: $${this.#REWARD_CONFIG.TOTAL_PAYOUT_AMOUNT}`,
      };
    } catch (err) {
      console.error("Error converting payout to order:", err);
      return {
        success: false,
        rewardId,
        orderId: 0,
        message: "Failed to convert payout to order",
      };
    }
  }

  /**
   * Process weekly payouts - designed to run as a cron job
   * This method processes all eligible payout rewards in parallel
   */
  async processWeeklyPayouts(): Promise<PayoutProcessResult> {
    try {
      const currentDate = new Date();

      // Step 1: Get all eligible payout records
      const eligibleRewards = await db
        .select({
          id: rewardsTable.id,
          userId: rewardsTable.userId,
          amountPaid: rewardsTable.amountPaid,
          nextPaymentDate: rewardsTable.nextPaymentDate,
        })
        .from(rewardsTable)
        .where(
          and(
            eq(rewardsTable.type, "payout"),
            eq(rewardsTable.status, "active"),
            lte(rewardsTable.nextPaymentDate, currentDate),
            lte(
              rewardsTable.amountPaid,
              this.#REWARD_CONFIG.TOTAL_PAYOUT_AMOUNT -
                this.#REWARD_CONFIG.WEEKLY_PAYOUT_AMOUNT,
            ),
          ),
        );

      if (eligibleRewards.length === 0) {
        return {
          success: true,
          processedCount: 0,
          failedCount: 0,
          errors: [],
        };
      }

      // Step 2: Map rewards to AddIncomeArgs
      const incomeData: AddIncomeArgs[] = eligibleRewards.map((reward) => ({
        userId: reward.userId,
        amount: this.#REWARD_CONFIG.WEEKLY_PAYOUT_AMOUNT,
        type: "weekly_payout_earned",
        description: "Weekly payout credited",
        rewardId: reward.id,
      }));

      // Step 3: Use bulk income processor
      const bulkResults = await walletService.addIncomeBulk(incomeData);

      let processedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      bulkResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          processedCount++;
        } else {
          failedCount++;
          errors.push(`User ${incomeData[index].userId}: ${result.reason}`);
        }
      });

      return {
        success: true,
        processedCount,
        failedCount,
        errors,
      };
    } catch (err) {
      console.error("Error processing weekly payouts:", err);
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        errors: [err instanceof Error ? err.message : "Unknown error"],
      };
    }
  }

  /**
   * Get user's reward history with pagination
   */
  async getUserRewardHistory(
    userId: UserId,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Reward[]> {
    try {
      return await db
        .select()
        .from(rewardsTable)
        .where(eq(rewardsTable.userId, userId))
        .orderBy(sql`${rewardsTable.createdAt} DESC`)
        .limit(limit)
        .offset(offset);
    } catch (err) {
      console.error("Error fetching user reward history:", err);
      return [];
    }
  }

  /**
   * Get all active payout rewards with pagination
   */
  async getActivePayoutRewards(
    limit: number = 100,
    offset: number = 0,
  ): Promise<Reward[]> {
    try {
      return await db
        .select()
        .from(rewardsTable)
        .where(
          and(
            eq(rewardsTable.type, "payout"),
            eq(rewardsTable.status, "active"),
          ),
        )
        .orderBy(sql`${rewardsTable.nextPaymentDate} ASC`)
        .limit(limit)
        .offset(offset);
    } catch (err) {
      console.error("Error fetching active payout rewards:", err);
      return [];
    }
  }

  /**
   * Pause/Resume reward payouts (admin function)
   */
  async toggleRewardStatus(
    rewardId: Reward["id"],
    newStatus: "active" | "paused",
  ): Promise<boolean> {
    try {
      const [updated] = await db
        .update(rewardsTable)
        .set({ status: newStatus })
        .where(eq(rewardsTable.id, rewardId))
        .returning({ id: rewardsTable.id });

      return !!updated;
    } catch (err) {
      console.error("Error toggling reward status:", err);
      return false;
    }
  }

  /**
   * Calculate next payment date (7 days from now)
   */
  private calculateNextPaymentDate(): Date {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 7);
    return nextDate;
  }

  /**
   * Get comprehensive rewards summary for dashboard
   */
  async getRewardsSummary() {
    try {
      const [summary, totalStats] = await Promise.all([
        // Group by type and status
        db
          .select({
            type: rewardsTable.type,
            status: rewardsTable.status,
            count: sql<number>`count(*)`.as("count"),
            totalAmount: sql<number>`sum(${rewardsTable.amountPaid})`.as(
              "totalAmount",
            ),
          })
          .from(rewardsTable)
          .groupBy(rewardsTable.type, rewardsTable.status),

        // Overall statistics
        db
          .select({
            totalRewards: sql<number>`count(*)`.as("totalRewards"),
            totalPaidAmount: sql<number>`sum(${rewardsTable.amountPaid})`.as(
              "totalPaidAmount",
            ),
            activePayouts:
              sql<number>`count(*) filter (where ${rewardsTable.type} = 'payout' and ${rewardsTable.status} = 'active')`.as(
                "activePayouts",
              ),
          })
          .from(rewardsTable),
      ]);

      return {
        summary,
        totalStats: totalStats[0] || {
          totalRewards: 0,
          totalPaidAmount: 0,
          activePayouts: 0,
        },
      };
    } catch (err) {
      console.error("Error fetching rewards summary:", err);
      return {
        summary: [],
        totalStats: { totalRewards: 0, totalPaidAmount: 0, activePayouts: 0 },
      };
    }
  }

  /**
   * Get rewards that are due for completion (reached max payout)
   */
  async getCompletableRewards(): Promise<SelectReward[]> {
    try {
      return await db
        .select()
        .from(rewardsTable)
        .where(
          and(
            eq(rewardsTable.type, "payout"),
            eq(rewardsTable.status, "active"),
            eq(
              rewardsTable.amountPaid,
              this.#REWARD_CONFIG.TOTAL_PAYOUT_AMOUNT,
            ),
          ),
        );
    } catch (err) {
      console.error("Error fetching completable rewards:", err);
      return [];
    }
  }
  /**
   * Auto-complete rewards that have reached maximum payout
   */
  async autoCompleteMaxedOutRewards(): Promise<{
    completed: number;
    errors: string[];
  }> {
    try {
      const completableRewards = await this.getCompletableRewards();

      if (completableRewards.length === 0) {
        return { completed: 0, errors: [] };
      }

      const rewardIds = completableRewards.map((r) => r.id);

      const updatedRewards = await db
        .update(rewardsTable)
        .set({
          status: "closed",
          compoletedAt: new Date(),
        })
        .where(inArray(rewardsTable.id, rewardIds))
        .returning({ id: rewardsTable.id });

      return {
        completed: updatedRewards.length,
        errors: [],
      };
    } catch (err) {
      console.error("Error auto-completing maxed out rewards:", err);
      return {
        completed: 0,
        errors: [err instanceof Error ? err.message : "Unknown error"],
      };
    }
  }
}

export const salesRewardService = new SalesRewardService();
