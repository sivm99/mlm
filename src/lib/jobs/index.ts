import { cronJobName, rewardCronService } from "./CronJobService";

// CLI for triggering specific cron jobs
export async function triggerCronJobCLI() {
  try {
    rewardCronService.start();
    while (true) {
      // Loop to allow multiple selections or exit
      console.log("\nSelect a cron job to trigger (or type 'exit' to quit):");
      cronJobName.forEach((job, index) => {
        console.log(`${index + 1}. ${job}`);
      });
      console.log("0. Exit");

      // Using console as an AsyncIterable for stdin in Bun
      for await (const line of console) {
        const input = line.trim().toLowerCase();

        if (input === "exit" || input === "0") {
          console.log("Exiting CLI...");
          rewardCronService.stop();
          process.exit(0);
        }

        const choice = parseInt(input);

        if (isNaN(choice) || choice < 1 || choice > cronJobName.length) {
          console.log(
            `Invalid choice. Please enter a number between 1 and ${cronJobName.length} or 'exit':`,
          );
          continue;
        }

        const selectedJob = cronJobName[choice - 1];
        console.log(`Triggering job: ${selectedJob}`);
        rewardCronService.triggerJob(selectedJob);
        break; // Break from input loop but continue main while loop
      }
    }
  } catch (error) {
    console.error("Error running cron job:", error);
    process.exit(1);
  }
}

triggerCronJobCLI();
