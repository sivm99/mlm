// import { LogData, LoggingService } from "@/lib/services";
import { EventEmitter } from "node:events";
export const eventEmitter = new EventEmitter();

// export function setupEventListeners(eventEmitter: EventEmitter) {
//   eventEmitter.on("transaction", async (data as LogData) => {
//     await LoggingService.log(data);
//   });

//   eventEmitter.on("wallet_error", async (data) => {
//     await LoggingService.log({
//       level: "error",
//       ...data,
//     });
//   });
// }
