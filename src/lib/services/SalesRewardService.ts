import db from "@/db";
import {
  firstEligibleTable,
  rewardsTable,
  SelectReward,
  treeTable,
  ordersTable,
  payoutsTable,
  InsertOrder,
  usersTable,
} from "@/db/schema";
import {
  ClaimOrderResult,
  EligiblePayoutRecord,
  PayoutProcessResult,
  RewardEligibilityCheck,
  UserId,
} from "@/types";
import { eq, and, lte } from "drizzle-orm";
import { databaseService } from "./DatabaseService";
import { treeService } from "./TreeService";
import { walletService } from "./WalletService";
import { ClaimPayoutResult } from "@/types";
import { orderService } from "./OrderService";
import { sql } from "drizzle-orm";

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
    ADMIN_FEE: 2.7,
  } as const;

  /**
   * Find existing or create new first eligible record for a user
   * This checks if user meets the eligibility criteria:
   * - Must have at least 2 active direct users
   * - Must have direct users in both LEFT and RIGHT legs
   */
  async findOrCreateFirstEligibleRecord(userId: UserId) {
    try {
      // Check if record already exists
      const [existing] = await db
        .select()
        .from(firstEligibleTable)
        .where(eq(firstEligibleTable.id, userId));

      if (existing) return existing;

      // Fetch user data and validate eligibility
      const self = await databaseService.fetchUserData(userId);
      if (!self || self.activeDirectUsersCount < 2) {
        return false;
      }

      // Get direct users
      const directUsers = await db
        .select({ id: treeTable.id })
        .from(treeTable)
        .where(eq(treeTable.sponsor, self.id));

      if (directUsers.length < 2) return false;

      // Check if user has direct users in both legs
      const leftSet = new Set(await treeService.getTeamIds(userId, "LEFT"));
      const rightSet = new Set(await treeService.getTeamIds(userId, "RIGHT"));

      let hasLeft = false;
      let hasRight = false;

      for (const { id } of directUsers) {
        if (!hasLeft && leftSet.has(id)) hasLeft = true;
        if (!hasRight && rightSet.has(id)) hasRight = true;
        if (hasLeft && hasRight) break;
      }

      if (!hasLeft || !hasRight) return false;

      // Create reward record with default payout type
      const [insertedReward] = await db
        .insert(rewardsTable)
        .values({
          userId: self.id,
        })
        .returning({ id: rewardsTable.id });

      if (!insertedReward) return false;

      // Create eligible record
      const [insertedEligible] = await db
        .insert(firstEligibleTable)
        .values({
          id: self.id,
          rewardId: insertedReward.id,
        })
        .returning();

      return insertedEligible || false;
    } catch (err) {
      console.error("Error creating first eligible record:", err);
      return false;
    }
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

      const rewardRecord = reward;

      // Check if reward is eligible for payout claim
      if (rewardRecord.status !== "pending") {
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

      const user = await databaseService.fetchUserData(reward.userId);
      if (!user)
        return {
          success: false,
          rewardId,
          message: "Reward is not in pending status",
        };
      await db.update(usersTable).set({
        redeemedCount: sql`${user.redeemedCount} + ${1}`,
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
      const insertedOrder = await db
        .insert(ordersTable)
        .values({
          userId: rewardRecord.userId,
          totalAmount: orderAmount,
          status: "PENDING",
          ...orderDetails,
        })
        .returning({ id: ordersTable.id });

      if (!insertedOrder.length) {
        return {
          success: false,
          rewardId,
          orderId: 0,
          message: "Failed to create order",
        };
      }

      const orderId = insertedOrder[0].id;

      // Update reward record to closed with order reference
      await db
        .update(rewardsTable)
        .set({
          type: "order",
          status: "closed",
          orderId: orderId,
        })
        .where(eq(rewardsTable.id, rewardId));

      await orderService.placeSalesRewardOrder(orderId); // this will add the 6 package quantity

      const user = await databaseService.fetchUserData(reward.userId);
      if (!user)
        return {
          success: false,
          rewardId,
          orderId: 0,
          message: "Failed to create order",
        };
      await db.update(usersTable).set({
        redeemedCount: sql`${user.redeemedCount} + ${1}`,
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
      const reward = await db
        .select()
        .from(rewardsTable)
        .where(eq(rewardsTable.id, rewardId))
        .limit(1);

      if (!reward.length) {
        return {
          success: false,
          rewardId,
          orderId: 0,
          message: "Reward record not found",
        };
      }

      const rewardRecord = reward[0];

      if (rewardRecord.type !== "payout" || rewardRecord.status !== "active") {
        return {
          success: false,
          rewardId,
          orderId: 0,
          message: "Reward is not an active payout reward",
        };
      }

      // Use the amount already paid for the order
      const orderAmount = rewardRecord.amountPaid;

      if (orderAmount <= 0) {
        return {
          success: false,
          rewardId,
          orderId: 0,
          message: "No amount available for order conversion",
        };
      }

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

      const orderId = insertedOrder.id;

      // Update reward to closed with order reference
      await db
        .update(rewardsTable)
        .set({
          type: "order",
          status: "closed",
          orderId: orderId,
          updatedAt: new Date(),
        })
        .where(eq(rewardsTable.id, rewardId));

      await orderService.placeSalesRewardOrder(orderId); // this will populatd the orderitems with 6 packat

      return {
        success: true,
        rewardId,
        orderId,
        message: `Payout converted to order successfully. Order amount: $${orderAmount}`,
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

      // Get all eligible payout records
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

      // Process payouts in parallel
      const payoutPromises = eligibleRewards.map((reward) =>
        this.processSinglePayout(reward),
      );

      const results = await Promise.allSettled(payoutPromises);

      let processedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.success) {
          processedCount++;
        } else {
          failedCount++;
          const error =
            result.status === "rejected" ? result.reason : result.value.error;
          errors.push(`User ${eligibleRewards[index].userId}: ${error}`);
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
   * Process a single payout reward
   */
  private async processSinglePayout(
    reward: EligiblePayoutRecord,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const newAmountPaid =
        reward.amountPaid + this.#REWARD_CONFIG.WEEKLY_PAYOUT_AMOUNT;
      const isCompleted =
        newAmountPaid >= this.#REWARD_CONFIG.TOTAL_PAYOUT_AMOUNT;

      // Add money to user's wallet
      await walletService.addIncome(
        reward.userId,
        this.#REWARD_CONFIG.WEEKLY_PAYOUT_AMOUNT,
        "weekly_payout_earned",
      );

      // Create payout record
      await db.insert(payoutsTable).values({
        userId: reward.userId,
        rewardId: reward.id,
        amount: this.#REWARD_CONFIG.WEEKLY_PAYOUT_AMOUNT,
        status: "PROCESSED",
        payoutDate: new Date(),
        adminFee: this.#REWARD_CONFIG.ADMIN_FEE, // Assuming no admin fee for rewards
      });

      // Update reward record
      await db
        .update(rewardsTable)
        .set({
          amountPaid: newAmountPaid,
          status: isCompleted ? "closed" : "active",
          nextPaymentDate: isCompleted
            ? new Date("2020-01-01")
            : this.calculateNextPaymentDate(),
          updatedAt: new Date(),
        })
        .where(eq(rewardsTable.id, reward.id));

      return { success: true };
    } catch (err) {
      console.error(`Error processing payout for reward ${reward.id}:`, err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Check reward eligibility for a user
   */
  async checkRewardEligibility(
    userId: UserId,
  ): Promise<RewardEligibilityCheck> {
    try {
      const rewards = await db
        .select()
        .from(rewardsTable)
        .where(eq(rewardsTable.userId, userId));

      if (rewards.length === 0) {
        return {
          isEligible: true,
          reason: "No existing rewards found",
        };
      }

      const activeReward = rewards.find((r) => r.status === "active");

      if (!activeReward) {
        return {
          isEligible: true,
          reason: "No active rewards found",
        };
      }

      const currentWeek = Math.floor(
        activeReward.amountPaid / this.#REWARD_CONFIG.WEEKLY_PAYOUT_AMOUNT,
      );
      const remainingAmount =
        this.#REWARD_CONFIG.TOTAL_PAYOUT_AMOUNT - activeReward.amountPaid;

      if (activeReward.status === "closed") {
        return {
          isEligible: false,
          reason: "Reward already completed",
          currentWeek,
          amountPaid: activeReward.amountPaid,
        };
      }

      return {
        isEligible: true,
        currentWeek,
        amountPaid: activeReward.amountPaid,
        remainingAmount,
      };
    } catch (err) {
      console.error("Error checking reward eligibility:", err);
      return {
        isEligible: false,
        reason: "Error checking eligibility",
      };
    }
  }

  /**
   * Get user's reward history
   */
  async getUserRewardHistory(userId: UserId): Promise<SelectReward[]> {
    try {
      return await db
        .select()
        .from(rewardsTable)
        .where(eq(rewardsTable.userId, userId));
    } catch (err) {
      console.error("Error fetching user reward history:", err);
      return [];
    }
  }

  /**
   * Get all active payout rewards (for admin dashboard)
   */
  async getActivePayoutRewards(): Promise<SelectReward[]> {
    try {
      return await db
        .select()
        .from(rewardsTable)
        .where(
          and(
            eq(rewardsTable.type, "payout"),
            eq(rewardsTable.status, "active"),
          ),
        );
    } catch (err) {
      console.error("Error fetching active payout rewards:", err);
      return [];
    }
  }

  /**
   * Pause/Resume reward payouts (admin function)
   */
  async toggleRewardStatus(
    rewardId: SelectReward["id"],
    newStatus: "active" | "paused",
  ): Promise<boolean> {
    try {
      await db
        .update(rewardsTable)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(rewardsTable.id, rewardId));

      return true;
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
   * Get rewards summary for dashboard
   */
  async getRewardsSummary() {
    try {
      const summary = await db
        .select({
          type: rewardsTable.type,
          status: rewardsTable.status,
          count: db.$count(rewardsTable),
        })
        .from(rewardsTable)
        .groupBy(rewardsTable.type, rewardsTable.status);

      return summary;
    } catch (err) {
      console.error("Error fetching rewards summary:", err);
      return [];
    }
  }
}
