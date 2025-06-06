import db, { adminId } from "@/db";
import {
  SelectReward,
  ordersTable,
  InsertOrder,
  userStatsTable,
  saleRewardsTable,
} from "@/db/schema";
import {
  AddIncomeArgs,
  ClaimOrderResult,
  Listing,
  ListingQueryWithFilters,
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
    WEEKLY_PAYOUT_AMOUNT: 3,
    MAX_WEEKS: 104,
    TOTAL_PAYOUT_AMOUNT: 312,
    ORDER_IMMEDIATE_CLOSE: true,
    ADMIN_FEE: 0,
  } as const;

  /**
   * Inserts pending rewards in the salesReward table for a user based on their active direct counts.
   * Determines eligibility and calculates the number of rewards to insert automatically.
   */
  async insertPendingRewards(userId: UserId) {
    // Fetch user's active direct counts from userStatsTable
    const [stats] = await db
      .select({
        left: userStatsTable.leftActiveDirectUsersCount,
        right: userStatsTable.rightActiveDirectUsersCount,
      })
      .from(userStatsTable)
      .where(eq(userStatsTable.id, userId))
      .limit(1);

    // If no stats or both sides are zero, no rewards are eligible
    if (!stats || !stats.left || !stats.right) {
      return;
    }

    // Calculate eligible rewards: floor((left + right) / 2)
    const eligibleRewardCount = Math.floor((stats.left + stats.right) / 2);

    // Fetch current number of rewards for the user
    const currentRewardCount = await this.getRewardsCountByUserId(userId);

    // Calculate how many new rewards to insert
    const rewardsToInsert = eligibleRewardCount - currentRewardCount;

    // Insert pending rewards if any
    if (rewardsToInsert > 0) {
      const rewards = Array.from({ length: rewardsToInsert }, () => ({
        userId,
        type: "na" as const,
        status: "pending" as const,
      }));
      await db.insert(saleRewardsTable).values(rewards).execute();
    }
  }

  /**
   *Get all the reward count entries by a specific user
   */
  async getRewardsCountByUserId(userId: UserId) {
    const [rewardCount] = await db
      .select({ count: count() })
      .from(saleRewardsTable)
      .where(eq(saleRewardsTable.userId, userId));
    return rewardCount.count;
  }

  /**
   * Claim reward as payout - sets up weekly payout schedule
   */
  async claimRewardPayout(
    rewardId: SelectReward["id"],
  ): Promise<ClaimPayoutResult> {
    try {
      const [reward] = await db
        .select()
        .from(saleRewardsTable)
        .where(eq(saleRewardsTable.id, rewardId))
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

      const nextPaymentDate = this.calculateNextPaymentDate();
      await db
        .update(saleRewardsTable)
        .set({
          type: "payout",
          status: "active",
          claimedAt: new Date(),
          nextPaymentDate: nextPaymentDate,
        })
        .where(eq(saleRewardsTable.id, rewardId));

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
        .from(saleRewardsTable)
        .where(eq(saleRewardsTable.id, rewardId))
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

      const [insertedOrder] = await db
        .insert(ordersTable)
        .values({
          userId: rewardRecord.userId,
          totalAmount: this.#REWARD_CONFIG.TOTAL_PAYOUT_AMOUNT,
          status: "pending",
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
        .update(saleRewardsTable)
        .set({
          type: "order",
          status: "closed",
          claimedAt: new Date(),
          completedAt: new Date(),
          orderId: orderId,
        })
        .where(eq(saleRewardsTable.id, rewardId));

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
        .from(saleRewardsTable)
        .where(eq(saleRewardsTable.id, rewardId))
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
          status: "pending",
          ...orderDetails,
        })
        .returning({ id: ordersTable.id });

      const orderId = insertedOrder.id;

      await db
        .update(saleRewardsTable)
        .set({
          type: "order",
          status: "closed",
          completedAt: new Date(),
          orderId: orderId,
        })
        .where(eq(saleRewardsTable.id, rewardId));

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
          id: saleRewardsTable.id,
          userId: saleRewardsTable.userId,
          amountPaid: saleRewardsTable.amountPaid,
          nextPaymentDate: saleRewardsTable.nextPaymentDate,
        })
        .from(saleRewardsTable)
        .where(
          and(
            eq(saleRewardsTable.type, "payout"),
            eq(saleRewardsTable.status, "active"),
            lte(saleRewardsTable.nextPaymentDate, currentDate),
            lte(
              saleRewardsTable.amountPaid,
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

      // Step 4: Update each reward with new payment date and amount paid
      for (let i = 0; i < bulkResults.length; i++) {
        const result = bulkResults[i];
        const reward = eligibleRewards[i];

        if (result.status === "fulfilled") {
          processedCount++;

          // Calculate next payment date
          const nextPaymentDate = this.calculateNextPaymentDate();

          // Update reward record with new payment date and increased amount paid
          await db
            .update(saleRewardsTable)
            .set({
              amountPaid: sql`${saleRewardsTable.amountPaid} + ${this.#REWARD_CONFIG.WEEKLY_PAYOUT_AMOUNT}`,
              nextPaymentDate: nextPaymentDate,
            })
            .where(eq(saleRewardsTable.id, reward.id));
        } else {
          failedCount++;
          console.log(
            `Failed payout for user ${reward.userId}: ${result.reason}`,
          );
          errors.push(`User ${reward.userId}: ${result.reason}`);
        }
      }

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
        .from(saleRewardsTable)
        .where(eq(saleRewardsTable.userId, userId))
        .orderBy(sql`${saleRewardsTable.createdAt} DESC`)
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
        .from(saleRewardsTable)
        .where(
          and(
            eq(saleRewardsTable.type, "payout"),
            eq(saleRewardsTable.status, "active"),
          ),
        )
        .orderBy(sql`${saleRewardsTable.nextPaymentDate} ASC`)
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
        .update(saleRewardsTable)
        .set({ status: newStatus })
        .where(eq(saleRewardsTable.id, rewardId))
        .returning({ id: saleRewardsTable.id });

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
            type: saleRewardsTable.type,
            status: saleRewardsTable.status,
            count: sql<number>`count(*)`.as("count"),
            totalAmount: sql<number>`sum(${saleRewardsTable.amountPaid})`.as(
              "totalAmount",
            ),
          })
          .from(saleRewardsTable)
          .groupBy(saleRewardsTable.type, saleRewardsTable.status),

        // Overall statistics
        db
          .select({
            totalRewards: sql<number>`count(*)`.as("totalRewards"),
            totalPaidAmount:
              sql<number>`sum(${saleRewardsTable.amountPaid})`.as(
                "totalPaidAmount",
              ),
            activePayouts:
              sql<number>`count(*) filter (where ${saleRewardsTable.type} = 'payout' and ${saleRewardsTable.status} = 'active')`.as(
                "activePayouts",
              ),
          })
          .from(saleRewardsTable),
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
        .from(saleRewardsTable)
        .where(
          and(
            eq(saleRewardsTable.type, "payout"),
            eq(saleRewardsTable.status, "active"),
            eq(
              saleRewardsTable.amountPaid,
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
        .update(saleRewardsTable)
        .set({
          status: "closed",
          completedAt: new Date(),
        })
        .where(inArray(saleRewardsTable.id, rewardIds))
        .returning({ id: saleRewardsTable.id });

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

  async listRewards(
    args: ListingQueryWithFilters<Reward>,
  ): Promise<Listing<Reward>> {
    try {
      const { offset, limit, sortDirection } = args.pagination;
      const { filter } = args;
      const conditions = [];

      // Build filter conditions

      if (filter.type) {
        conditions.push(eq(saleRewardsTable.type, filter.type));
      }
      if (filter.status) {
        conditions.push(eq(saleRewardsTable.status, filter.status));
      }
      if (filter.userId) {
        conditions.push(eq(saleRewardsTable.userId, filter.userId));
      }
      if (filter.orderId) {
        conditions.push(eq(saleRewardsTable.orderId, filter.orderId));
      }
      if (filter.createdAt) {
        conditions.push(eq(saleRewardsTable.createdAt, filter.createdAt));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Query the sale_rewards table
      const list = await db.query.saleRewardsTable.findMany({
        where: whereClause,
        with: {
          user: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        limit,
        offset,
        orderBy: [
          sortDirection === "asc"
            ? sql`${saleRewardsTable.createdAt} ASC`
            : sql`${saleRewardsTable.createdAt} DESC`,
        ],
      });

      // Get total count for pagination
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(saleRewardsTable)
        .where(whereClause);
      const total = totalResult[0]?.count || 0;

      return {
        list,
        pagination: {
          limit,
          offset,
          hasNext: offset + list.length < total,
          total,
          hasPrevious: offset > 0,
        },
      };
    } catch (err) {
      throw new Error(
        `Failed to list rewards: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async getRewardById(id: Reward["id"]) {
    const [reward] = await db
      .select()
      .from(saleRewardsTable)
      .where(eq(saleRewardsTable.id, id))
      .limit(1);
    return reward;
  }
}

export const salesRewardService = new SalesRewardService();
