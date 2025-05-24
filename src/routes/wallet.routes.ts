import {
  AdminWalletController,
  WalletController,
} from "@/controller/WalletController";
import { authenticate, authenticateAdmin } from "@/middleware/auth";
import { Hono } from "hono";

const router = new Hono();

router
  .use("*", authenticate)
  .get("/", WalletController.getWallet)
  .post("/generate-otp", WalletController.generateWalletOtp)
  .post("/transfer", WalletController.transferAlPoints)
  .post("/convert", WalletController.convertIncomeToAlpoints)
  .post("/payout", WalletController.payoutFromIncome)
  .post("/activate", WalletController.activateId)
  .get("/transactions", WalletController.getTransactionHistory)

  // Admin routes
  .post("/admin/add-funds", authenticateAdmin, AdminWalletController.addFunds)
  .get(
    "/admin/transactions",
    authenticateAdmin,
    AdminWalletController.getAllTransactions,
  )
  .get("/admin/logs", authenticateAdmin, AdminWalletController.getLogs);
