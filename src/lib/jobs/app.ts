import { rewardCronService } from "./cron-job-service";

export async function startCrons() {
  try {
    console.log("🚀 Starting Reward System Application...");
    rewardCronService.start();
    console.log("✅ Application started successfully");
  } catch (error) {
    console.error("❌ Failed to start application:", error);
    process.exit(1);
  }
}

export async function stopCrons() {
  console.log("🛑 Shutting down application...");
  rewardCronService.stop();
  process.exit(0);
}
