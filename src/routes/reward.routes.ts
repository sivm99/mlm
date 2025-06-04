// server.ts or app.ts - Main application startup
import { rewardCronService } from "./services/RewardCronService";
import SalesRewardService from "./services/SalesRewardService";

// Initialize services
const salesRewardService = new SalesRewardService();

// Start the application
async function startApplication() {
  try {
    console.log("🚀 Starting Reward System Application...");

    // Start cron service
    rewardCronService.start();

    // Your other application startup code here...

    console.log("✅ Application started successfully");
  } catch (error) {
    console.error("❌ Failed to start application:", error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log("🛑 Shutting down application...");

  // Stop cron service
  rewardCronService.stop();

  // Your other cleanup code here...

  process.exit(0);
}

// Handle shutdown signals
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Start the application
startApplication();

// =====================================
// API Routes Examples
// =====================================

// Express.js route examples
import express from "express";
const app = express();

// Check user eligibility
app.post("/api/rewards/check-eligibility/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const result =
      await salesRewardService.findOrCreateFirstEligibleRecord(userId);

    res.json({
      success: result.success,
      message: result.message,
      rewardsCreated: result.created,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Claim reward as payout
app.post("/api/rewards/:rewardId/claim-payout", async (req, res) => {
  try {
    const rewardId = parseInt(req.params.rewardId);
    const result = await salesRewardService.claimRewardPayout(rewardId);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Claim reward as order
app.post("/api/rewards/:rewardId/claim-order", async (req, res) => {
  try {
    const rewardId = parseInt(req.params.rewardId);
    const { orderDetails } = req.body;

    const result = await salesRewardService.claimRewardOrder(
      rewardId,
      orderDetails,
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get user reward history
app.get("/api/rewards/history/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { limit = 50, offset = 0 } = req.query;

    const rewards = await salesRewardService.getUserRewardHistory(
      userId,
      parseInt(limit as string),
      parseInt(offset as string),
    );

    res.json({
      success: true,
      rewards,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Admin: Get rewards summary
app.get("/api/admin/rewards/summary", async (req, res) => {
  try {
    const summary = await salesRewardService.getRewardsSummary();
    res.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Admin: Toggle reward status
app.put("/api/admin/rewards/:rewardId/toggle-status", async (req, res) => {
  try {
    const rewardId = parseInt(req.params.rewardId);
    const { status } = req.body;

    if (!["active", "paused"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "active" or "paused"',
      });
    }

    const success = await salesRewardService.toggleRewardStatus(
      rewardId,
      status,
    );

    res.json({
      success,
      message: success
        ? "Status updated successfully"
        : "Failed to update status",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Admin: Get cron job status
app.get("/api/admin/cron/status", (req, res) => {
  try {
    const status = rewardCronService.getJobsStatus();
    res.json({
      success: true,
      jobs: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Admin: Manually trigger cron job
app.post("/api/admin/cron/trigger/:jobName", async (req, res) => {
  try {
    const { jobName } = req.params;
    const success = await rewardCronService.triggerJob(jobName);

    res.json({
      success,
      message: success ? "Job triggered successfully" : "Failed to trigger job",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// =====================================
// Usage Examples in Business Logic
// =====================================

// When a user becomes active (after making a purchase or meeting requirements)
async function activateUser(userId: number) {
  try {
    // Your activation logic here...

    // Check if user becomes eligible for rewards
    const eligibilityResult =
      await salesRewardService.findOrCreateFirstEligibleRecord(userId);

    if (eligibilityResult.success && eligibilityResult.created > 0) {
      console.log(
        `🎉 User ${userId} is now eligible! Created ${eligibilityResult.created} rewards`,
      );

      // Optionally send notification to user
      // await notificationService.sendRewardEligibilityNotification(userId);
    }

    return eligibilityResult;
  } catch (error) {
    console.error("Error activating user:", error);
    throw error;
  }
}

// When processing user registration with sponsor
async function registerUserWithSponsor(
  userData: any,
  sponsorId: number,
  position: "LEFT" | "RIGHT",
) {
  try {
    // Your user registration logic here...

    // After successful registration, check if sponsor becomes eligible
    const sponsorEligibility =
      await salesRewardService.findOrCreateFirstEligibleRecord(sponsorId);

    if (sponsorEligibility.success && sponsorEligibility.created > 0) {
      console.log(
        `🎉 Sponsor ${sponsorId} earned ${sponsorEligibility.created} new rewards!`,
      );
    }

    return { userData, sponsorEligibility };
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
}

// Batch process eligibility for multiple users (useful for data migration)
async function batchProcessEligibility(userIds: number[]) {
  try {
    console.log(`Processing eligibility for ${userIds.length} users...`);

    const result = await salesRewardService.processNewEligibilities(userIds);

    console.log(`Batch processing completed:`);
    console.log(`- Processed: ${result.processed}`);
    console.log(`- Failed: ${result.failed}`);

    if (result.errors.length > 0) {
      console.log("Errors:");
      result.errors.forEach((error) => console.log(`  - ${error}`));
    }

    return result;
  } catch (error) {
    console.error("Error in batch processing:", error);
    throw error;
  }
}

// Example usage in tests or scripts
async function exampleUsage() {
  const userId = 123;
  const sponsorId = 456;

  // Check eligibility
  const eligibility =
    await salesRewardService.findOrCreateFirstEligibleRecord(userId);
  console.log("Eligibility result:", eligibility);

  // Get user rewards
  const rewards = await salesRewardService.getUserRewardHistory(userId);
  console.log("User rewards:", rewards);

  // Admin: Get system summary
  const summary = await salesRewardService.getRewardsSummary();
  console.log("System summary:", summary);

  // Manual cron trigger (for testing)
  const cronResult = await rewardCronService.triggerJob("weekly-payouts");
  console.log("Cron trigger result:", cronResult);
}

export {
  startApplication,
  shutdown,
  activateUser,
  registerUserWithSponsor,
  batchProcessEligibility,
  exampleUsage,
};
