import {
  adminWalletController,
  logsController,
  walletController,
} from "@/controller";
import { authenticate, authenticateAdmin } from "@/middleware/auth";
import {
  adminAddAlpValidate,
  convertIncomeToAlpValidate,
  generateWalletOtpValidate,
  multiIdsVaildate,
  transactionListingValidate,
  transferAlPointsValidate,
  verifyWalletOtpValidate,
} from "@/validation";
import { Hono } from "hono";

const router = new Hono();

router
  .use("*", authenticate)
  .get("/", walletController.getWallet)
  .get(
    "/generate-otp",
    generateWalletOtpValidate,
    walletController.generateWalletOtp,
  )
  .post(
    "/verify-otp",
    verifyWalletOtpValidate,
    walletController.verifyWalletOtp,
  )
  .post(
    "/transfer",
    transferAlPointsValidate,
    walletController.transferAlPoints,
  )
  .post(
    "/convert",
    convertIncomeToAlpValidate,
    walletController.convertIncomeToAlpoints,
  )
  .post(
    "/payout",
    convertIncomeToAlpValidate,
    walletController.payoutFromIncome,
  )
  .post("/activate", multiIdsVaildate, walletController.activateId)
  .get(
    "/transactions",
    transactionListingValidate,
    walletController.getTransactionHistory,
  )

  // Admin routes
  .post(
    "/admin/add-funds",
    authenticateAdmin,
    adminAddAlpValidate,
    adminWalletController.addFunds,
  )
  .get(
    "/admin/transactions",
    authenticateAdmin,
    transactionListingValidate,
    adminWalletController.getAllTransactions,
  )
  .get("/admin/logs", authenticateAdmin, logsController.getLogs);

export default router;
