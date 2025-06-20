import { otpService, walletService } from "@/lib/services";
import { transactionService } from "@/lib/services";
import { Context } from "hono";

export class WalletController {
  /**
   * Get user wallet details
   */
  async getWallet(c: Context) {
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
  async generateWalletOtp(c: Context) {
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
   * Verify OTP for wallet operations
   * @param c - Context object containing user information and OTP details
   * @returns JSON response indicating verification success or failure
   */
  async verifyWalletOtp(c: Context) {
    const self = c.get("user");
    const { otp, walletoperations } = c.get("verifyWalletOtp");
    const map = {
      transfer: "fund_transfer",
      convert: "convert_income_wallet",
      payout: "usdt_withdrawal",
    } as const;
    const verifyResult = await otpService.verifyOtp({
      type: map[walletoperations],
      email: self.email,
      code: otp,
    });
    if (!verifyResult.success) {
      return c.json(
        {
          success: false,
          message: verifyResult.message,
        },
        403,
      );
    }

    return c.json({
      success: true,
      message: "OTP verified successfully",
    });
  }
  /**
   * Transfer AL Points to another user
   */
  async transferAlPoints(c: Context) {
    try {
      const body = c.get("transferAlPoints");
      const transaction = await walletService.transferAlPoints(body);

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
  async convertIncomeToAlpoints(c: Context) {
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
  async payoutFromIncome(c: Context) {
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
   * They can active bulk ids by just passing them ["", ""] like that first we can have validations
   * on the front end how many they can activate and only allow that much
   */
  async activateId(c: Context) {
    try {
      const { id: selfId } = c.get("user");
      const userIds = c.get("ids"); // any one can do update the id of anyone by transferring
      const activationAmount = 68; // 68 alpoints will be deducted for 1 id
      const data = [];

      for (const userId of userIds) {
        const transaction = await walletService.activateId(
          selfId,
          userId,
          activationAmount,
        );
        if (transaction.status === "completed") data.push(transaction);
      }

      return c.json({
        success: true,
        message: "ID activated successfully",
        data,
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
  async getTransactionHistory(c: Context) {
    try {
      const { id: userId } = c.get("user");
      const limit = Number(c.req.query("limit")) || 50;
      const offset = Number(c.req.query("offset")) || 0;

      const transactions = await walletService.getUserTransactions(userId, {
        limit,
        offset,
      });

      return c.json({
        success: true,
        data: transactions,
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
  async addFunds(c: Context) {
    try {
      const { id: adminuserid } = c.get("user");
      const { toUserId, amount, description } = c.get("adminAddAlpoints");

      const transaction = await walletService.adminExecute({
        type: "fund_addition",
        fromUserId: undefined,
        toUserId,
        fromWalletType: undefined, // since its just admin
        toWalletType: "alpoints",
        amount,
        deductionPercentage: undefined,
        description: description || `admin fund addition by ${adminuserid}`,
        reference: undefined,
        requiresOtp: false,
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
  async getAllTransactions(c: Context) {
    const listingParams = c.get("transactionListing");
    try {
      const data = await transactionService.getTransactions(listingParams);
      return c.json({
        success: true,
        data,
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
export const adminWalletController = new AdminWalletController();
export const walletController = new WalletController();
