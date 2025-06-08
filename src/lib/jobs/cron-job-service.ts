import { CronJob } from "cron";
import db from "@/db";
import { usersTable, saleRewardsTable } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { matchingIncomeService, salesRewardService } from "../services";
import { CronJobName } from "@/types";

export const cronJobName = [
  "weekly-payouts",
  "auto-complete-rewards",
  "system-health-check",
  "weekly-report",
  "monthly-cleanup",
  "matching-income",
] as const;

/**
 * RewardCronService manages all scheduled tasks for the reward system
 * Handles daily payouts, eligibility checks, and system maintenance
 */
export class RewardCronService {
  private jobs: Map<CronJobName, CronJob> = new Map();
  private isRunning: boolean = false;

  /**
   * Initialize and start all cron jobs
   */
  public start(): void {
    if (this.isRunning) {
      console.log("Reward cron service is already running");
      return;
    }

    this.setupJobs();
    this.startAllJobs();
    this.isRunning = true;

    console.log("🚀 Reward Cron Service started successfully");
    this.logNextExecutions();
  }

  /**
   * Stop all cron jobs
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log("Reward cron service is not running");
      return;
    }

    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️  Stopped job: ${name}`);
    });

    this.jobs.clear();
    this.isRunning = false;
    console.log("🛑 Reward Cron Service stopped");
  }

  /**
   * Setup all cron jobs with their schedules
   */
  private setupJobs(): void {
    this.jobs.set(
      "weekly-payouts",
      new CronJob(
        "0 21 * * *", // Every day 9 pm
        () => this.handleWeeklyPayouts(),
        null,
        false,
        "UTC",
      ),
    );

    this.jobs.set(
      "auto-complete-rewards",
      new CronJob(
        "0 3 * * *", // Every day at 3 AM
        () => this.handleAutoCompleteRewards(),
        null,
        false,
        "UTC",
      ),
    );

    this.jobs.set(
      "matching-income",
      new CronJob(
        "45 11 * * *", // every day at 11 45 pm
        () => this.handleMatchingIncomePayout(),
        null,
        false,
        "UTC",
      ),
    );

    this.jobs.set(
      "system-health-check",
      new CronJob(
        "0 * * * *", // Every hour
        () => this.handleSystemHealthCheck(),
        null,
        false,
        "UTC",
      ),
    );

    this.jobs.set(
      "weekly-report",
      new CronJob(
        "0 9 * * 1", // Every Monday at 9 AM
        () => this.handleWeeklyReport(),
        null,
        false,
        "UTC",
      ),
    );

    this.jobs.set(
      "monthly-cleanup",
      new CronJob(
        "0 1 1 * *", // First day of month at 1 AM
        () => this.handleMonthlyCleanup(),
        null,
        false,
        "UTC",
      ),
    );
  }

  /**
   * Start all configured jobs
   */
  private startAllJobs(): void {
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`✅ Started job: ${name}`);
    });
  }

  /**
   * Log next execution times for all jobs
   */
  private logNextExecutions(): void {
    console.log("\n📅 Next execution schedule:");
    this.jobs.forEach((job, name) => {
      const nextDate = job.nextDates(1)[0];
      console.log(`   ${name}: ${nextDate.toString()}`);
    });
    console.log("");
  }

  /**
   * Handle weekly payout processing (now runs daily)
   */
  private async handleWeeklyPayouts(): Promise<void> {
    const startTime = Date.now();
    console.log("🔄 Starting daily payout processing...");

    try {
      const result = await salesRewardService.processWeeklyPayouts();

      const duration = Date.now() - startTime;

      if (result.success) {
        console.log(`✅ Daily payouts completed in ${duration}ms:`);
        console.log(`   - Processed: ${result.processedCount} payouts`);
        console.log(`   - Failed: ${result.failedCount} payouts`);

        if (result.errors.length > 0) {
          console.log("   - Errors:");
          result.errors.forEach((error) => console.log(`     • ${error}`));
        }
      } else {
        console.error("❌ Daily payout processing failed:", result.errors);
      }

      // Log to database for audit trail
      await this.logCronExecution("weekly-payouts", result.success, duration, {
        processed: result.processedCount,
        failed: result.failedCount,
        errors: result.errors,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("❌ Daily payout processing error:", error);

      await this.logCronExecution("weekly-payouts", false, duration, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Handle auto-completion of rewards that have reached maximum payout
   */
  private async handleAutoCompleteRewards() {
    const startTime = Date.now();
    console.log("🔄 Starting auto-complete rewards...");
    try {
      const result = await salesRewardService.autoCompleteMaxedOutRewards();
      const duration = Date.now() - startTime;
      console.log(`✅ Auto-complete rewards completed in ${duration}ms:`);
      console.log(`   - Completed: ${result.completed} rewards`);
      if (result.errors.length > 0) {
        console.log("   - Errors:");
        result.errors.forEach((error) => console.log(`     • ${error}`));
      }
      await this.logCronExecution("auto-complete-rewards", true, duration, {
        completed: result.completed,
        errors: result.errors,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("❌ Auto-complete rewards error:", error);
      await this.logCronExecution("auto-complete-rewards", false, duration, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Handle Mathcing incoe payout and reset all the couters
   */
  private async handleMatchingIncomePayout() {
    const startTime = Date.now();
    console.log("🔄 Starting matching income rewards...");

    try {
      const result = await matchingIncomeService.processDailyMatchingIncome();
      const duration = Date.now() - startTime;
      console.log(`✅ Auto-complete rewards completed in ${duration}ms:`);
      console.log(`   - Completed: ${result.processedCount} rewards`);
      console.log(
        `   - Total Reward Payment: ${result.totalRewardAmount} rewards`,
      );
      if (result.errors.length > 0) {
        console.log("   - Errors:");
        result.errors.forEach((error) => console.log(`     • ${error}`));
      }
      await this.logCronExecution("auto-complete-rewards", true, duration, {
        completed: result.processedCount,
        errors: result.errors,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("❌ Auto-complete rewards error:", error);
      await this.logCronExecution("auto-complete-rewards", false, duration, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Handle system health check
   */
  private async handleSystemHealthCheck(): Promise<void> {
    const startTime = Date.now();

    try {
      // Check database connectivity
      const dbCheck = await db
        .select({ count: sql`count(*)` })
        .from(usersTable);

      // Check for stuck payouts (payments that should have been processed)
      const stuckPayouts = await db
        .select({ count: sql`count(*)` })
        .from(saleRewardsTable)
        .where(
          and(
            eq(saleRewardsTable.type, "payout"),
            eq(saleRewardsTable.status, "active"),
            sql`${saleRewardsTable.nextPaymentDate} < NOW() - INTERVAL '7 days'`,
          ),
        );

      // Check for pending rewards older than 30 days
      const oldPendingRewards = await db
        .select({ count: sql`count(*)` })
        .from(saleRewardsTable)
        .where(
          and(
            eq(saleRewardsTable.status, "pending"),
            sql`${saleRewardsTable.createdAt} < NOW() - INTERVAL '30 days'`,
          ),
        );

      const duration = Date.now() - startTime;
      const healthStatus = {
        database: dbCheck.length > 0,
        stuckPayouts: Number(stuckPayouts[0]?.count) || 0,
        oldPendingRewards: Number(oldPendingRewards[0]?.count) || 0,
        timestamp: new Date().toISOString(),
      };

      // Log warnings if issues found
      if (healthStatus.stuckPayouts > 0) {
        console.warn(`⚠️  Found ${healthStatus.stuckPayouts} stuck payouts`);
      }

      if (healthStatus.oldPendingRewards > 0) {
        console.warn(
          `⚠️  Found ${healthStatus.oldPendingRewards} old pending rewards`,
        );
      }

      await this.logCronExecution(
        "system-health-check",
        true,
        duration,
        healthStatus,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("❌ System health check error:", error);

      await this.logCronExecution("system-health-check", false, duration, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Handle weekly system report generation
   */
  private async handleWeeklyReport(): Promise<void> {
    const startTime = Date.now();
    console.log("🔄 Generating weekly system report...");

    try {
      const [rewardsSummary, userStats] = await Promise.all([
        salesRewardService.getRewardsSummary(),
        this.getUserStatsSummary(),
      ]);

      const duration = Date.now() - startTime;

      console.log("📊 Weekly System Report:");
      console.log("   Rewards Summary:");
      console.log(
        `     - Total Rewards: ${rewardsSummary.totalStats.totalRewards}`,
      );
      console.log(
        `     - Total Paid: ${rewardsSummary.totalStats.totalPaidAmount}`,
      );
      console.log(
        `     - Active Payouts: ${rewardsSummary.totalStats.activePayouts}`,
      );

      console.log("   User Stats:");
      console.log(`     - Total Users: ${userStats.totalUsers}`);
      console.log(`     - Active Users: ${userStats.activeUsers}`);
      console.log(`     - New Users (7 days): ${userStats.newUsersWeek}`);

      await this.logCronExecution("weekly-report", true, duration, {
        rewardsSummary,
        userStats,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("❌ Weekly report generation error:", error);

      await this.logCronExecution("weekly-report", false, duration, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Handle monthly cleanup tasks
   */
  private async handleMonthlyCleanup(): Promise<void> {
    const startTime = Date.now();
    console.log("🔄 Starting monthly cleanup...");

    try {
      // Clean up old log entries (keep last 3 months)
      const cleanupResult = await this.cleanupOldLogs();

      // Archive completed rewards older than 6 months
      const archiveResult = await this.archiveOldRewards();

      const duration = Date.now() - startTime;

      console.log(`✅ Monthly cleanup completed in ${duration}ms:`);
      console.log(`   - Cleaned logs: ${cleanupResult.cleaned}`);
      console.log(`   - Archived rewards: ${archiveResult.archived}`);

      await this.logCronExecution("monthly-cleanup", true, duration, {
        logsCleanup: cleanupResult,
        rewardsArchive: archiveResult,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("❌ Monthly cleanup error:", error);

      await this.logCronExecution("monthly-cleanup", false, duration, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get user statistics summary
   */
  private async getUserStatsSummary() {
    const [totalUsers, activeUsers, newUsersWeek] = await Promise.all([
      db.select({ count: sql`count(*)` }).from(usersTable),
      db
        .select({ count: sql`count(*)` })
        .from(usersTable)
        .where(eq(usersTable.isActive, true)),
      db
        .select({ count: sql`count(*)` })
        .from(usersTable)
        .where(sql`${usersTable.createdAt} >= NOW() - INTERVAL '7 days'`),
    ]);

    return {
      totalUsers: totalUsers[0]?.count || 0,
      activeUsers: activeUsers[0]?.count || 0,
      newUsersWeek: newUsersWeek[0]?.count || 0,
    };
  }

  /**
   * Clean up old log entries
   */
  private async cleanupOldLogs(): Promise<{ cleaned: number }> {
    return { cleaned: 0 };
  }

  /**
   * Archive old completed rewards
   */
  private async archiveOldRewards(): Promise<{ archived: number }> {
    return { archived: 0 };
  }

  /**
   * Log cron job execution for audit trail
   */
  private async logCronExecution(
    jobName: string,
    success: boolean,
    duration: number,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      const logEntry = {
        jobName,
        success,
        duration,
        metadata,
        timestamp: new Date().toISOString(),
      };

      // For now, just console log the audit entry
      console.log("📝 Cron Audit Log:", JSON.stringify(logEntry, null, 2));
    } catch (error) {
      console.error("Failed to log cron execution:", error);
    }
  }

  /**
   * Get status of all jobs
   */
  public getJobsStatus(): {
    name: string;
    running: boolean;
    nextRun: string | null;
  }[] {
    return Array.from(this.jobs.entries()).map(([name, job]) => ({
      name,
      running: !!job.lastDate(), // Check if job is running
      nextRun: job.nextDates(1)[0]?.toString() || null,
    }));
  }

  /**
   * Manually trigger a specific job (useful for testing)
   */
  public async triggerJob(jobName: CronJobName): Promise<boolean> {
    const job = this.jobs.get(jobName);
    if (!job) {
      console.error(`Job '${jobName}' not found`);
      return false;
    }

    console.log(`🔧 Manually triggering job: ${jobName}`);

    try {
      switch (jobName) {
        case "weekly-payouts":
          await this.handleWeeklyPayouts();
          break;
        case "matching-income":
          await this.handleMatchingIncomePayout();
          break;

        case "auto-complete-rewards":
          await this.handleAutoCompleteRewards();
          break;
        case "system-health-check":
          await this.handleSystemHealthCheck();
          break;
        case "weekly-report":
          await this.handleWeeklyReport();
          break;
        case "monthly-cleanup":
          await this.handleMonthlyCleanup();
          break;
        default:
          console.error(`Unknown job: ${jobName}`);
          return false;
      }
      return true;
    } catch (error) {
      console.error(`Error triggering job ${jobName}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const rewardCronService = new RewardCronService();

// Export types for external use
export type CronJobStatus = {
  name: string;
  running: boolean;
  nextRun: string | null;
};
