import db from "@/db";
import {
  InsertMatchingIncome,
  matchingIncomesTable,
  userStatsTable,
} from "@/db/schema";
import {
  AddIncomeArgs,
  CalculateMatchingIncomeArgs,
  DailyMatchingProcessResult,
  UserId,
} from "@/types";
import { count, eq, and, gt, or } from "drizzle-orm";
import { walletService } from "./wallet-service";

/**
 * Service for handling matching income calculations and distribution
 */
export default class MatchingIncomeService {
  /**
   * Configuration parameters for reward calculations
   */
  #CONFIG = {
    REWARD_PERCENTAGE: 8,
    MAX_REWARD_POSSIBLE: 500,
  };

  /**
   * Retrieves the count of matching income rewards given to the user
   */
  async getMatchingIncomesCount(userId: UserId): Promise<number> {
    try {
      const [result] = await db
        .select({
          count: count(),
        })
        .from(matchingIncomesTable)
        .where(eq(matchingIncomesTable.userId, userId));
      return result.count;
    } catch (error) {
      console.error(
        `Error getting matching incomes count for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Inserts matching income records into the database
   */
  private async insertMatchingIncomeRecords(
    matchingIncomes: InsertMatchingIncome[],
  ) {
    try {
      return await db
        .insert(matchingIncomesTable)
        .values(matchingIncomes)
        .returning({
          id: matchingIncomesTable.id,
          userId: matchingIncomesTable.userId,
        });
    } catch (error) {
      console.error("Error inserting matching income records:", error);
      throw error;
    }
  }

  /**
   * Calculates matching BV and updates carry forward values
   */
  private async calculateMatchingBvAndUpdateCarryForward({
    userId,
    leftBv,
    rightBv,
    cfLeftBv,
    cfRightBv,
    todayLeftBv,
    todayRightBv,
  }: CalculateMatchingIncomeArgs): Promise<number> {
    try {
      const existingRewardsCount = await this.getMatchingIncomesCount(userId);

      let matchingBv: number;
      let newCfLeftBv: number;
      let newCfRightBv: number;

      if (existingRewardsCount > 0) {
        // Use today's BV plus carry forward for existing users
        const totalLeftBv = todayLeftBv + cfLeftBv;
        const totalRightBv = todayRightBv + cfRightBv;
        matchingBv = Math.min(totalLeftBv, totalRightBv);

        const carryForward = Math.max(totalLeftBv, totalRightBv) - matchingBv;
        newCfLeftBv = totalLeftBv > totalRightBv ? carryForward : 0;
        newCfRightBv = totalRightBv > totalLeftBv ? carryForward : 0;
      } else {
        // Use total BV for first-time users
        matchingBv = Math.min(leftBv, rightBv);
        const carryForward = Math.max(leftBv, rightBv) - matchingBv;
        newCfLeftBv = leftBv > rightBv ? carryForward : 0;
        newCfRightBv = rightBv > leftBv ? carryForward : 0;
      }

      await this.updateCarryForwardAndResetDailyStats(
        userId,
        newCfLeftBv,
        newCfRightBv,
      );
      return matchingBv;
    } catch (error) {
      console.error(`Error calculating matching BV for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Updates carry forward values and resets daily stats
   */
  private async updateCarryForwardAndResetDailyStats(
    userId: UserId,
    cfLeftBv: number,
    cfRightBv: number,
  ): Promise<void> {
    try {
      await db
        .update(userStatsTable)
        .set({
          cfLeftBv,
          cfRightBv,
          todayLeftBv: 0,
          todayRightBv: 0,
          todayLeftCount: 0,
          todayRightCount: 0,
          todayLeftActiveCount: 0,
          todayRightActiveCount: 0,
        })
        .where(eq(userStatsTable.id, userId))
        .execute();
    } catch (error) {
      console.error(`Error updating carry forward for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Calculates reward amount based on matching BV
   */
  private calculateRewardAmount(matchingBv: number): number {
    return Math.min(
      this.#CONFIG.MAX_REWARD_POSSIBLE,
      (matchingBv * this.#CONFIG.REWARD_PERCENTAGE) / 100,
    );
  }

  /**
   * Gets all eligible users for matching income processing
   */
  private async getEligibleUsers() {
    try {
      return await db
        .select({
          id: userStatsTable.id,
          leftBv: userStatsTable.leftBv,
          rightBv: userStatsTable.rightBv,
          cfLeftBv: userStatsTable.cfLeftBv,
          cfRightBv: userStatsTable.cfRightBv,
          todayLeftBv: userStatsTable.todayLeftBv,
          todayRightBv: userStatsTable.todayRightBv,
        })
        .from(userStatsTable)
        .where(
          and(
            or(
              gt(userStatsTable.todayLeftBv, 0),
              gt(userStatsTable.todayRightBv, 0),
              gt(userStatsTable.cfLeftBv, 0),
              gt(userStatsTable.cfRightBv, 0),
            ),
            or(gt(userStatsTable.leftBv, 0), gt(userStatsTable.rightBv, 0)),
          ),
        );
    } catch (error) {
      console.error("Error getting eligible users:", error);
      throw error;
    }
  }

  /**
   * Processes daily matching income for all eligible users
   * This method is designed to run as a daily cron job
   */
  async processDailyMatchingIncome(): Promise<DailyMatchingProcessResult> {
    try {
      // Get all eligible users
      const eligibleUsers = await this.getEligibleUsers();

      if (eligibleUsers.length === 0) {
        console.log("No eligible users found for matching income processing");
        return {
          success: true,
          processedCount: 0,
          failedCount: 0,
          totalRewardAmount: 0,
          errors: [],
        };
      }

      console.log(
        `Processing matching income for ${eligibleUsers.length} eligible users`,
      );

      const matchingIncomeRecords: InsertMatchingIncome[] = [];
      let processedCount = 0;
      let failedCount = 0;
      let totalRewardAmount = 0;
      const errors: string[] = [];

      // Process each user and prepare matching income records
      for (const user of eligibleUsers) {
        try {
          const matchingBv =
            await this.calculateMatchingBvAndUpdateCarryForward({
              userId: user.id,
              leftBv: user.leftBv,
              rightBv: user.rightBv,
              cfLeftBv: user.cfLeftBv,
              cfRightBv: user.cfRightBv,
              todayLeftBv: user.todayLeftBv,
              todayRightBv: user.todayRightBv,
            });

          if (matchingBv > 0) {
            const rewardAmount = this.calculateRewardAmount(matchingBv);

            if (rewardAmount > 0) {
              // Prepare matching income record
              matchingIncomeRecords.push({
                userId: user.id,
                amountPaid: rewardAmount,
                matchingBv: matchingBv,
              });

              totalRewardAmount += rewardAmount;
              processedCount++;
            }
          }
        } catch (error) {
          failedCount++;
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          errors.push(`User ${user.id}: ${errorMessage}`);
          console.error(`Error processing user ${user.id}:`, error);
        }
      }

      // Bulk insert matching income records and get the returned IDs
      let insertedRecords: Array<{ id: number; userId: UserId }> = [];
      if (matchingIncomeRecords.length > 0) {
        try {
          insertedRecords = await this.insertMatchingIncomeRecords(
            matchingIncomeRecords,
          );
          console.log(
            `Inserted ${insertedRecords.length} matching income records`,
          );
        } catch (error) {
          console.error("Error inserting matching income records:", error);
          errors.push("Failed to insert matching income records");
          return {
            success: false,
            processedCount: 0,
            failedCount: matchingIncomeRecords.length,
            totalRewardAmount: 0,
            errors,
          };
        }
      }

      // Prepare income data with matching income IDs
      const incomeData: Array<AddIncomeArgs> = insertedRecords.map(
        (record, index) => ({
          userId: record.userId,
          amount: matchingIncomeRecords[index].amountPaid,
          type: "matching_income",
          description: `Daily matching income for BV: ${matchingIncomeRecords[index].matchingBv}`,
          referenceId: record.id,
        }),
      );

      // Bulk process wallet transactions
      if (incomeData.length > 0) {
        try {
          const bulkResults = await walletService.addIncomeBulk(incomeData);

          // Process bulk results and update counters
          let walletFailedCount = 0;
          bulkResults.forEach((result, index) => {
            if (result.status === "rejected") {
              walletFailedCount++;
              const errorMessage =
                result.reason instanceof Error
                  ? result.reason.message
                  : String(result.reason);
              errors.push(
                `Wallet transaction for user ${incomeData[index].userId}: ${errorMessage}`,
              );
            }
          });

          // Update failed count to reflect wallet transaction failures
          if (walletFailedCount > 0) {
            failedCount += walletFailedCount;
            processedCount -= walletFailedCount;
          }
        } catch (error) {
          console.error("Error processing bulk wallet transactions:", error);
          errors.push("Failed to process wallet transactions");
          // All wallet transactions failed
          failedCount += incomeData.length;
          processedCount = 0;
        }
      }

      console.log(
        `Daily matching income processing completed. Processed: ${processedCount}, Failed: ${failedCount}, Total Amount: ${totalRewardAmount}`,
      );

      return {
        success: true,
        processedCount,
        failedCount,
        totalRewardAmount,
        errors,
      };
    } catch (error) {
      console.error(
        "Critical error in daily matching income processing:",
        error,
      );
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        totalRewardAmount: 0,
        errors: [
          error instanceof Error ? error.message : "Critical processing error",
        ],
      };
    }
  }
}

export const matchingIncomeService = new MatchingIncomeService();
