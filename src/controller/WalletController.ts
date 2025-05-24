import { eventEmitter } from "@/events";
import EmailService from "@/lib/services/EmailService";
import OtpService from "@/lib/services/OtpService";
import WalletService from "@/lib/services/WalletService";
import { MyContext } from "@/types";

const emailService = new EmailService();
const otpService = new OtpService(emailService);
const walletService = new WalletService(otpService, eventEmitter);

export class WalletController {
  /**
   * Get user wallet details
   */
  static async getWallet(c: MyContext) {
    try {
      const { id: userId } = c.get("user");
      const wallet = await walletService.getUserWallet(userId);

      return c.json({
        success: true,
        message: "wallet reterieved successfully",
        data: wallet,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: String(error),
        },
        500,
      );
    }
  }

  /**
   * Generate OTP for wallet operations
   */
  static async generateWalletOtp(c: MyContext) {
    try {
      const { id: userId } = c.get("user");
      const operation = c.get("walletOperation"); // 'transfer', 'convert', 'payout'
      await walletService.generateWalletOtp(userId, operation);
      return c.json({
        success: true,
        message: "OTP sent to your registered email",
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: String(error),
        },
        500,
      );
    }
  }

  /**
   * Transfer AL Points to another user
   */
  static async transferAlPoints(c: MyContext) {
    try {
      const body = c.get("transferAlPoints");
      const transaction = await walletService.transferAlPoints({
        ...body,
        type: "alpoints_transfer",
      });

      return c.json({
        success: true,
        message: "AL Points transferred successfully",
        data: transaction,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: String(error),
        },
        400,
      );
    }
  }

  /**
   * Convert income wallet to AL Points
   */
  static async convertIncomeToAlpoints(c: MyContext) {
    try {
      const { id: userId } = c.get("user");
      const body = c.get("convertIncomeToAlp");

      const transaction = await walletService.convertIncomeToAlpoints({
        ...body,
        userId,
        type: "income_to_alpoints",
      });

      return c.json({
        success: true,
        message: `Successfully converted ${body.amount} to AL Points (10% deduction applied)`,
        data: transaction,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: String(error),
        },
        400,
      );
    }
  }

  /**
   * Payout from income wallet
   */
  static async payoutFromIncome(c: MyContext) {
    try {
      const { id: userId } = c.get("user");
      const body = c.get("convertIncomeToAlp");

      const transaction = await walletService.payoutFromIncome({
        ...body,
        userId,
        type: "income_payout",
      });

      return c.json({
        success: true,
        message: `Payout request processed successfully (10% deduction applied)`,
        data: transaction,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: String(error),
        },
        400,
      );
    }
  }

  /**
   * Activate ID using AL Points
   */
  static async activateId(c: MyContext) {
    try {
      const userId = c.get("userId");
      const { activationAmount = 50 } = await c.req.json();

      const transaction = await walletService.activateId(
        userId,
        activationAmount,
      );
      if (transaction.status === "completed")
        return c.json({
          success: true,
          message: "ID activated successfully",
          data: transaction,
        });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: String(error),
        },
        400,
      );
    }
  }

  /**
   * Get user transaction history
   */
  static async getTransactionHistory(c: MyContext) {
    try {
      const userId = c.get("userId");
      const limit = Number(c.req.query("limit")) || 50;
      const offset = Number(c.req.query("offset")) || 0;

      const transactions = await walletService.getUserTransactions(
        userId,
        limit,
        offset,
      );

      return c.json({
        success: true,
        data: transactions,
        pagination: {
          limit,
          offset,
          count: transactions.length,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: String(error),
        },
        500,
      );
    }
  }
}

export class AdminWalletController {
  /**
   * Add funds to user's AL Points (admin only)
   */
  static async addFunds(c: MyContext) {
    try {
      const { id: adminuserid } = c.get("user");
      const { userid, amount, description } = await c.req.json();

      if (!userid || !amount) {
        return c.json(
          {
            success: false,
            message: "missing required fields: userid, amount",
          },
          400,
        );
      }

      // you can implement admin verification here

      const transaction = await walletService.executetransaction({
        type: "fund_addition",
        touserid: userid,
        towallettype: "alpoints",
        amount,
        description: description || `admin fund addition by ${adminuserid}`,
        metadata: { addedby: adminuserid },
      });

      return c.json({
        success: true,
        message: "funds added successfully",
        data: transaction,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: String(error),
        },
        400,
      );
    }
  }

  /**
   * Get all transactions (admin only)
   */
  static async getAllTransactions(c: MyContext) {
    try {
      const limit = Number(c.req.query("limit")) || 100;
      const offset = Number(c.req.query("offset")) || 0;
      const status = c.req.query("status");
      const type = c.req.query("type");

      // Build query conditions
      const conditions = [];
      if (status) conditions.push(eq(transactionsTable.status, status));
      if (type) conditions.push(eq(transactionsTable.type, type));

      const transactions = await db.query.transactionsTable.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit,
        offset,
        orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
      });

      return c.json({
        success: true,
        data: transactions,
        pagination: {
          limit,
          offset,
          count: transactions.length,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: String(error),
        },
        500,
      );
    }
  }

  /**
   * Get system logs (admin only)
   */
  static async getLogs(c: MyContext) {
    try {
      const limit = Number(c.req.query("limit")) || 100;
      const offset = Number(c.req.query("offset")) || 0;
      const level = c.req.query("level");
      const userId = c.req.query("userId");

      const conditions = [];
      if (level) conditions.push(eq(logsTable.level, level));
      if (userId) conditions.push(eq(logsTable.userId, userId));

      const logs = await db.query.logsTable.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit,
        offset,
        orderBy: (logs, { desc }) => [desc(logs.createdAt)],
      });

      return c.json({
        success: true,
        data: logs,
        pagination: {
          limit,
          offset,
          count: logs.length,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: String(error),
        },
        500,
      );
    }
  }
}
