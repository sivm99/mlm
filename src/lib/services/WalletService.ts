import db from "@/db";
import { eq, and, sql } from "drizzle-orm";
import OtpService, { otpService } from "./OtpService";
import { EventEmitter } from "events";
import {
  SelectTransaction,
  transactionsTable,
  WalletOperations,
  walletsTable,
} from "@/db/schema";
import {
  ConvertIncomeParams,
  OTP,
  TransferParams,
  User,
  WalletTransaction,
} from "@/types";
import DatabaseService from "./DatabaseService";
import { eventEmitter } from "@/events";

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
  async getUserWallet(userId: number) {
    const wallet = await db.query.walletsTable.findFirst({
      where: eq(walletsTable.id, userId),
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    return wallet;
  }

  /**
   * Transfer AL Points between users (no charges for downline/upline)
   * @param params.amount Amount in cents
   */
  async transferAlPoints(params: TransferParams) {
    const { fromUserId, toUserId, amountInCents, otp, description } = params;

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
      amountInCents,
      description: description || `AL Points transfer to user ${toUserId}`,
      requiresOtp: true,
      reference: undefined,
      metadata: undefined,
      deductionPercentage: undefined,
    });
  }

  /**
   * Convert income wallet to AL Points (10% deduction)
   * @param params.amountInCents Amount in cents
   */
  async convertIncomeToAlpoints(params: ConvertIncomeParams) {
    const { userId, amountInCents, otp } = params;

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
      amountInCents,
      deductionPercentage: 10,
      description: "Convert income wallet to AL Points",
      requiresOtp: true,
      reference: undefined,
      metadata: undefined,
    });
  }

  /**
   * Payout from income wallet (10% deduction)
   * @param params.amountInCents Amount in cents
   */
  async payoutFromIncome(params: ConvertIncomeParams) {
    const { userId, amountInCents, otp } = params;

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
      amountInCents,
      deductionPercentage: 10,
      description: "Income wallet payout",
      requiresOtp: true,
      reference: undefined,
      metadata: undefined,
    });
  }

  /**
   * Add income to user's income wallet (from cron jobs)
   * @param amountInCents Amount in cents
   */
  async addIncome(
    userId: User["id"],
    amountInCents: number,
    type: "weekly_payout_earned" | "matching_income_earned",
    description?: string,
  ) {
    return await this.executeTransaction({
      type,
      fromUserId: undefined,
      toUserId: userId,
      fromWalletType: undefined,
      toWalletType: "income_wallet",
      amountInCents,
      description: description || `${type.replace("_", " ")} income`,
      deductionPercentage: 10,
      reference: undefined,
      metadata: undefined,
      requiresOtp: false,
    });
  }

  /**
   * Activate ID using AL Points (no charges)
   * @param activationAmountInCents Amount in cents for activation (default: 6800 cents = $68)
   */
  async activateId(
    fromUserId: User["id"],
    toUserId: User["id"],
    activationAmountInCents: number = 6800,
    deductionPercentage: number = 26.471,
  ) {
    return await this.executeTransaction({
      type: "id_activation",
      fromUserId,
      toUserId,
      fromWalletType: "alpoints",
      toWalletType: "bv",
      amountInCents: activationAmountInCents,
      deductionPercentage,
      description: "ID Activation",
      reference: undefined,
      metadata: undefined,
      requiresOtp: true,
    });
  }

  /**
   * Core transaction execution with proper validation and logging
   * All amounts are in cents
   */
  private async executeTransaction(params: WalletTransaction) {
    return await db.transaction(async (tx) => {
      try {
        // Calculate amounts in cents
        const deductionAmountInCents = params.deductionPercentage
          ? Math.floor(
              (params.amountInCents * params.deductionPercentage) / 100,
            )
          : 0;
        const netAmountInCents = params.amountInCents - deductionAmountInCents;

        // Validate sufficient balance for debit operations
        if (params.fromUserId && params.fromWalletType) {
          const fromWallet = await tx.query.walletsTable.findFirst({
            where: eq(walletsTable.id, params.fromUserId),
          });

          if (!fromWallet) {
            throw new Error("Source wallet not found");
          }

          const currentBalanceInCents =
            fromWallet[this.mapWalletTypeToKeyOfWallet(params.fromWalletType)];
          if (currentBalanceInCents < params.amountInCents) {
            throw new Error(`Insufficient ${params.fromWalletType} balance`);
          }

          // Debit from source wallet
          await tx
            .update(walletsTable)
            .set({
              [params.fromWalletType]: sql`${walletsTable[this.mapWalletTypeToKeyOfWallet(params.fromWalletType)]} - ${params.amountInCents}`,
            })
            .where(eq(walletsTable.id, params.fromUserId));
        }

        // Credit to destination wallet
        if (params.toUserId && params.toWalletType) {
          const creditAmountInCents =
            params.type === "income_payout" ? 0 : netAmountInCents;

          if (creditAmountInCents > 0) {
            await tx
              .update(walletsTable)
              .set({
                [params.toWalletType]: sql`${walletsTable[this.mapWalletTypeToKeyOfWallet(params.toWalletType)]} + ${creditAmountInCents}`,
              })
              .where(eq(walletsTable.id, params.toUserId));
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
            amount: params.amountInCents,
            deductionAmount: deductionAmountInCents,
            netAmount: netAmountInCents,
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
            amountInCents: params.amountInCents,
            netAmountInCents: netAmountInCents,
            deductionAmountInCents: deductionAmountInCents,
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
          amount: params.amountInCents,
          netAmount: 0,
          description: `Failed: ${String(error)}`,
          requiresOtp: params.requiresOtp || false,
        });

        throw error;
      }
    });
  }

  // just an alias for the admin
  async adminExecute(params: WalletTransaction) {
    return await this.executeTransaction(params);
  }

  /**
   * Get user transaction history
   */
  async getUserTransactions(
    userId: User["id"],
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
  async generateWalletOtp(userId: User["id"], type: WalletOperations[number]) {
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

  private mapWalletOperationToOtpType(
    operation: WalletOperations[number],
  ): OTP["type"] {
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

export const walletService = new WalletService(otpService, eventEmitter);
