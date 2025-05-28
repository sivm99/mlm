import LogsController from "@/controller/LogsController";
import {
  AdminWalletController,
  WalletController,
} from "@/controller/WalletController";
import { authenticate, authenticateAdmin } from "@/middleware/auth";
import {
  adminAddAlpValidate,
  convertIncomeToAlpValidate,
  generateWalletOtpValidate,
  multiIdsVaildate,
  transactionListingValidate,
  transferAlPointsValidate,
} from "@/validation";
import { Hono } from "hono";

const router = new Hono();

router
  .use("*", authenticate)
  .get("/", WalletController.getWallet)
  .get(
    "/generate-otp",
    generateWalletOtpValidate,
    WalletController.generateWalletOtp,
  )
  .post(
    "/transfer",
    transferAlPointsValidate,
    WalletController.transferAlPoints,
  )
  .post(
    "/convert",
    convertIncomeToAlpValidate,
    WalletController.convertIncomeToAlpoints,
  )
  .post(
    "/payout",
    convertIncomeToAlpValidate,
    WalletController.payoutFromIncome,
  )
  .post("/activate", multiIdsVaildate, WalletController.activateId)
  .get(
    "/transactions",
    transactionListingValidate,
    WalletController.getTransactionHistory,
  )

  // Admin routes
  .post(
    "/admin/add-funds",
    authenticateAdmin,
    adminAddAlpValidate,
    AdminWalletController.addFunds,
  )
  .get(
    "/admin/transactions",
    authenticateAdmin,
    transactionListingValidate,
    AdminWalletController.getAllTransactions,
  )
  .get("/admin/logs", authenticateAdmin, LogsController.getLogs);

export default router;
