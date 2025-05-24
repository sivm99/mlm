import db from "@/db";
import { eq, and, sql } from "drizzle-orm";
import OtpService from "./OtpService";
import { EventEmitter } from "events";
import {
  SelectTransaction,
  transactionsTable,
  walletsTable,
} from "@/db/schema";
import {
  ConvertIncomeParams,
  OTP,
  TransferParams,
  WalletTransaction,
} from "@/types";
import DatabaseService from "./DatabaseService";

const databaseService = new DatabaseService();

export default class WalletService {
  #otpService: OtpService;
  #eventEmitter: EventEmitter;

  constructor(otpService: OtpService, eventEmitter: EventEmitter) {
    this.#otpService = otpService;
    this.#eventEmitter = eventEmitter;
  }

  /**
   * Get user's wallet details
   */
  async getUserWallet(userId: string) {
    const wallet = await db.query.walletsTable.findFirst({
      where: eq(walletsTable.userId, userId),
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    return wallet;
  }

  /**
   * Transfer AL Points between users (no charges for downline/upline)
   */
  async transferAlPoints(params: TransferParams) {
    const { fromUserId, toUserId, amount, otp, description } = params;

    // Verify OTP if provided
    if (otp) {
      const fromUser = await databaseService.fetchUserData(fromUserId);
      if (!fromUser) throw new Error("User not found");
      const otpResult = await this.#otpService.verifyOtp({
        type: "fund_transfer",
        email: fromUser.email,
        code: otp,
      });

      if (!otpResult.success) {
        throw new Error(otpResult.message);
      }
    }

    return await this.executeTransaction({
      type: "alpoints_transfer",
      fromUserId,
      toUserId,
      fromWalletType: "alpoints",
      toWalletType: "alpoints",
      amount,
      description: description || `AL Points transfer to user ${toUserId}`,
      requiresOtp: true,
      reference: undefined,
      metadata: undefined,
      deductionPercentage: undefined,
    });
  }

  /**
   * Convert income wallet to AL Points (10% deduction)
   */
  async convertIncomeToAlpoints(params: ConvertIncomeParams) {
    const { userId, amount, otp } = params;

    // Verify OTP
    const user = await databaseService.fetchUserData(userId);
    if (!user) throw new Error("User not found");
    const otpResult = await this.#otpService.verifyOtp({
      type: "convert_income_wallet",
      email: user.email,
      code: otp,
    });

    if (!otpResult.success) {
      throw new Error(otpResult.message);
    }

    return await this.executeTransaction({
      type: "income_to_alpoints",
      fromUserId: userId,
      toUserId: userId,
      fromWalletType: "income_wallet",
      toWalletType: "alpoints",
      amount,
      deductionPercentage: 10,
      description: "Convert income wallet to AL Points",
      requiresOtp: true,
      reference: undefined,
      metadata: undefined,
    });
  }

  /**
   * Payout from income wallet (10% deduction)
   */
  async payoutFromIncome(params: ConvertIncomeParams) {
    const { userId, amount, otp } = params;

    // Verify OTP
    const user = await databaseService.fetchUserData(userId);
    if (!user) throw new Error("User not found");
    const otpResult = await this.#otpService.verifyOtp({
      type: "usdt_withdrawal",
      email: user.email,
      code: otp,
    });

    if (!otpResult.success) {
      throw new Error(otpResult.message);
    }

    return await this.executeTransaction({
      type: "income_payout",
      fromUserId: userId,
      toUserId: undefined,
      toWalletType: undefined,
      fromWalletType: "income_wallet",
      amount,
      deductionPercentage: 10,
      description: "Income wallet payout",
      requiresOtp: true,
      reference: undefined,
      metadata: undefined,
    });
  }

  /**
   * Add income to user's income wallet (from cron jobs)
   */
  async addIncome(
    userId: string,
    amount: number,
    type: "weekly_payout_earned" | "matching_income_earned",
    description?: string,
  ) {
    return await this.executeTransaction({
      type,
      fromUserId: undefined,
      toUserId: userId,
      fromWalletType: undefined,
      toWalletType: "income_wallet",
      amount,
      description: description || `${type.replace("_", " ")} income`,
      deductionPercentage: 10,
      reference: undefined,
      metadata: undefined,
      requiresOtp: false,
    });
  }

  /**
   * Activate ID using AL Points (no charges)
   */
  async activateId(userId: string, activationAmount: number = 50) {
    return await this.executeTransaction({
      type: "id_activation",
      fromUserId: userId,
      toUserId: userId,
      fromWalletType: "alpoints",
      toWalletType: "bv",
      amount: activationAmount,
      deductionPercentage: undefined,
      description: "ID Activation",
      reference: undefined,
      metadata: undefined,
      requiresOtp: true,
    });
  }

  /**
   * Core transaction execution with proper validation and logging
   */
  private async executeTransaction(params: WalletTransaction) {
    return await db.transaction(async (tx) => {
      try {
        // Calculate amounts
        const deductionAmount = params.deductionPercentage
          ? (params.amount * params.deductionPercentage) / 100
          : 0;
        const netAmount = params.amount - deductionAmount;

        // Validate sufficient balance for debit operations
        if (params.fromUserId && params.fromWalletType) {
          const fromWallet = await tx.query.walletsTable.findFirst({
            where: eq(walletsTable.userId, params.fromUserId),
          });

          if (!fromWallet) {
            throw new Error("Source wallet not found");
          }

          const currentBalance =
            fromWallet[this.mapWalletTypeToKeyOfWallet(params.fromWalletType)];
          if (currentBalance < params.amount) {
            throw new Error(`Insufficient ${params.fromWalletType} balance`);
          }

          // Debit from source wallet
          await tx
            .update(walletsTable)
            .set({
              [params.fromWalletType]: sql`${walletsTable[this.mapWalletTypeToKeyOfWallet(params.fromWalletType)]} - ${params.amount}`,
              updatedAt: new Date(),
            })
            .where(eq(walletsTable.userId, params.fromUserId));
        }

        // Credit to destination wallet
        if (params.toUserId && params.toWalletType) {
          const creditAmount = params.type === "income_payout" ? 0 : netAmount;

          if (creditAmount > 0) {
            await tx
              .update(walletsTable)
              .set({
                [params.toWalletType]: sql`${walletsTable[this.mapWalletTypeToKeyOfWallet(params.toWalletType)]} + ${creditAmount}`,
                updatedAt: new Date(),
              })
              .where(eq(walletsTable.userId, params.toUserId));
          }
        }

        // Create transaction record
        const transaction = await tx
          .insert(transactionsTable)
          .values({
            type: params.type,
            status: "completed",
            fromUserId: params.fromUserId,
            toUserId: params.toUserId,
            fromWalletType: params.fromWalletType,
            toWalletType: params.toWalletType,
            amount: params.amount,
            deductionAmount,
            netAmount,
            deductionPercentage: params.deductionPercentage || 0,
            description: params.description,
            reference: params.reference,
            metadata: params.metadata ? JSON.stringify(params.metadata) : null,
            requiresOtp: params.requiresOtp || false,
            otpVerified: true,
          })
          .returning();

        // Emit log event
        this.#eventEmitter.emit("transaction", {
          action: "transaction_completed",
          userId: params.fromUserId || params.toUserId,
          transactionId: transaction[0].id,
          message: `Transaction completed: ${params.type}`,
          metadata: {
            amount: params.amount,
            netAmount,
            deductionAmount,
            type: params.type,
          },
        });

        return transaction[0];
      } catch (error) {
        await tx.insert(transactionsTable).values({
          type: params.type,
          status: "failed",
          fromUserId: params.fromUserId,
          toUserId: params.toUserId,
          fromWalletType: params.fromWalletType,
          toWalletType: params.toWalletType,
          amount: params.amount,
          netAmount: 0,
          description: `Failed: ${String(error)}`,
          requiresOtp: params.requiresOtp || false,
        });

        throw error;
      }
    });
  }

  /**
   * Get user transaction history
   */
  async getUserTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    return await db.query.transactionsTable.findMany({
      where: and(
        eq(transactionsTable.fromUserId, userId),
        eq(transactionsTable.toUserId, userId),
      ),
      limit,
      offset,
      orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
    });
  }

  /**
   * Generate OTP for wallet operations
   */
  async generateWalletOtp(userId: string, type: string) {
    const user = await databaseService.fetchUserData(userId);
    if (!user) throw new Error("User not found ");
    const otpType = this.mapWalletOperationToOtpType(type);

    return await this.#otpService.generateOtp({
      type: otpType,
      email: user.email,
      userId: user.id,
      name: user.name,
    });
  }

  private mapWalletOperationToOtpType(operation: string): OTP["type"] {
    const mapping: Record<string, OTP["type"]> = {
      transfer: "fund_transfer",
      convert: "convert_income_wallet",
      payout: "usdt_withdrawal",
    };
    return mapping[operation] || "fund_transfer";
  }

  private mapWalletTypeToKeyOfWallet(
    w: Exclude<SelectTransaction["fromWalletType"], null | undefined>,
  ): "alpoints" | "bv" | "incomeWallet" {
    const mapping: Record<
      Exclude<SelectTransaction["fromWalletType"], null | undefined>,
      "alpoints" | "bv" | "incomeWallet"
    > = {
      alpoints: "alpoints",
      bv: "bv",
      income_wallet: "incomeWallet",
    };

    if (!(w in mapping)) {
      throw new Error(`Invalid wallet type: ${w}`);
    }

    return mapping[w];
  }
}
