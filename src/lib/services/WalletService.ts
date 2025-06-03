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
   * Get user's wallet details including wallet balances and limits
   * @param userId - The ID of the user
   * @returns The wallet details of the user
   * @throws Error if the wallet is not found
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
   * @param params.fromUserId - Source user ID
   * @param params.toUserId - Destination user ID
   * @param params.amount - Amount in real value to transfer
   * @param params.otp - OTP code for verification
   * @param params.description - Optional description for the transaction
   * @returns The transaction details
   * @throws Error if OTP verification fails or insufficient balance
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
   * @param params.userId - User ID for the conversion
   * @param params.amount - Amount in real value to convert
   * @param params.otp - OTP code for verification
   * @returns The transaction details
   * @throws Error if OTP verification fails, insufficient balance, or exceeds limit
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
   * @param params.userId - User ID for the payout
   * @param params.amount - Amount in real value to withdraw
   * @param params.otp - OTP code for verification
   * @returns The transaction details
   * @throws Error if OTP verification fails or insufficient balance
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
   * it will incure no fees or charges
   * This will also reduce the user's income wallet limit by the amount added
   * @param userId - User ID to add income to
   * @param amount - Amount in real value to add
   * @param type - Type of income (weekly_payout_earned or matching_income_earned)
   * @param description - Optional description for the transaction
   * @returns The transaction details
   */
  async addIncome(
    userId: User["id"],
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
      deductionPercentage: 0,
      reference: undefined,
      metadata: undefined,
      requiresOtp: false,
    });
  }

  /**
   * Activate ID using AL Points (with deduction percentage)
   * @param fromUserId - User ID to deduct AL Points from
   * @param toUserId - User ID to add BV to
   * @param activationAmount - Amount in real value for activation (default: 68 = $68)
   * @param deductionPercentage - Percentage to deduct from activation amount (default: 26.471%)
   * @returns The transaction details
   * @throws Error if insufficient balance
   */
  async activateId(
    fromUserId: User["id"],
    toUserId: User["id"],
    activationAmount: number = 68,
    deductionPercentage: number = 26.471,
  ) {
    // Increase the destination user's income wallet limit during activation
    await db
      .update(walletsTable)
      .set({
        incomeWalletLimit: 5000,
      })
      .where(eq(walletsTable.id, toUserId))
      .execute();

    return await this.executeTransaction({
      type: "id_activation",
      fromUserId,
      toUserId,
      fromWalletType: "alpoints",
      toWalletType: "bv",
      amount: activationAmount,
      deductionPercentage,
      description: "ID Activation",
      reference: undefined,
      metadata: undefined,
      requiresOtp: true,
    });
  }

  /**
   * Increase income wallet limit by using AL Points
   * This uses 68 AL Points to increase the income wallet limit by 5000
   * @param userId - User ID to increase income wallet limit for
   * @returns The transaction details
   * @throws Error if insufficient AL Points balance
   */
  async increaseIncomeWalletLimit(userId: User["id"]) {
    const COST_IN_ALPOINTS = 68;
    const LIMIT_INCREASE = 5000;

    return await db.transaction(async (tx) => {
      try {
        // Check if user has enough AL Points
        const wallet = await tx.query.walletsTable.findFirst({
          where: eq(walletsTable.id, userId),
        });

        if (!wallet) {
          throw new Error("Wallet not found");
        }

        if (wallet.alpoints < COST_IN_ALPOINTS) {
          throw new Error("Insufficient AL Points balance");
        }

        // Deduct AL Points
        await tx
          .update(walletsTable)
          .set({
            alpoints: sql`${walletsTable.alpoints} - ${COST_IN_ALPOINTS}`,
            incomeWalletLimit: sql`${walletsTable.incomeWalletLimit} + ${LIMIT_INCREASE}`,
          })
          .where(eq(walletsTable.id, userId));

        // Create transaction record
        const transaction = await tx
          .insert(transactionsTable)
          .values({
            type: "increase_wallet_limit",
            status: "completed",
            fromUserId: userId,
            toUserId: userId,
            fromWalletType: "alpoints",
            toWalletType: null,
            amount: COST_IN_ALPOINTS,
            deductionAmount: 0,
            netAmount: COST_IN_ALPOINTS,
            deductionPercentage: 0,
            description: `Increased income wallet limit by ${LIMIT_INCREASE}`,
            requiresOtp: false,
            otpVerified: true,
          })
          .returning();

        // Emit log event
        this.#eventEmitter.emit("transaction", {
          action: "transaction_completed",
          userId: userId,
          transactionId: transaction[0].id,
          message: `Income wallet limit increased by ${LIMIT_INCREASE}`,
          metadata: {
            amount: COST_IN_ALPOINTS,
            limitIncrease: LIMIT_INCREASE,
            type: "increase_wallet_limit",
          },
        });

        return transaction[0];
      } catch (error) {
        await tx.insert(transactionsTable).values({
          type: "increase_wallet_limit",
          status: "failed",
          fromUserId: userId,
          toUserId: userId,
          fromWalletType: "alpoints",
          toWalletType: null,
          amount: COST_IN_ALPOINTS,
          netAmount: 0,
          description: `Failed: ${String(error)}`,
          requiresOtp: false,
        });

        throw error;
      }
    });
  }

  /**
   * Core transaction execution with proper validation and logging
   * All amounts are in real value. Handles income wallet limit constraints.
   * @param params - Transaction parameters
   * @returns The completed transaction details
   * @throws Error for various validation failures
   */
  private async executeTransaction(params: WalletTransaction) {
    return await db.transaction(async (tx) => {
      try {
        // Calculate amounts
        const deductionAmount = params.deductionPercentage
          ? parseFloat(
              ((params.amount * params.deductionPercentage) / 100).toFixed(2),
            )
          : 0;
        const netAmount = parseFloat(
          (params.amount - deductionAmount).toFixed(2),
        );

        // Validate sufficient balance for debit operations
        if (params.fromUserId && params.fromWalletType) {
          const fromWallet = await tx.query.walletsTable.findFirst({
            where: eq(walletsTable.id, params.fromUserId),
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
            })
            .where(eq(walletsTable.id, params.fromUserId));
        }

        // Credit to destination wallet
        if (params.toUserId && params.toWalletType) {
          const creditAmount = params.type === "income_payout" ? 0 : netAmount;

          if (creditAmount > 0) {
            if (params.toWalletType === "income_wallet") {
              // Check income wallet limit
              const toWallet = await tx.query.walletsTable.findFirst({
                where: eq(walletsTable.id, params.toUserId),
              });

              if (!toWallet) {
                throw new Error("Destination wallet not found");
              }

              // For adding to income wallet, check income wallet limit
              if (
                toWallet.incomeWallet + creditAmount >
                toWallet.incomeWalletLimit
              ) {
                throw new Error("Exceeds income wallet limit");
              }

              // Update wallet and reduce limit by the amount added
              await tx
                .update(walletsTable)
                .set({
                  incomeWallet: sql`${walletsTable.incomeWallet} + ${creditAmount}`,
                  incomeWalletLimit: sql`${walletsTable.incomeWalletLimit} - ${creditAmount}`,
                })
                .where(eq(walletsTable.id, params.toUserId));
            } else {
              // For other wallet types, just add amount
              await tx
                .update(walletsTable)
                .set({
                  [params.toWalletType]: sql`${walletsTable[this.mapWalletTypeToKeyOfWallet(params.toWalletType)]} + ${creditAmount}`,
                })
                .where(eq(walletsTable.id, params.toUserId));
            }
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
            deductionAmount: deductionAmount,
            netAmount: netAmount,
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
            netAmount: netAmount,
            deductionAmount: deductionAmount,
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
   * Directly execute a transaction (admin function)
   * @param params - Transaction parameters
   * @returns The completed transaction details
   */
  async adminExecute(params: WalletTransaction) {
    return await this.executeTransaction(params);
  }

  /**
   * Get user transaction history
   * @param userId - User ID to fetch transactions for
   * @param limit - Number of transactions to return (default: 50)
   * @param offset - Pagination offset (default: 0)
   * @returns Array of transaction records
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
   * @param userId - User ID to generate OTP for
   * @param type - Type of wallet operation
   * @returns OTP generation result
   * @throws Error if user not found
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

  /**
   * Maps wallet operation types to OTP types
   * @param operation - Wallet operation type
   * @returns Corresponding OTP type
   */
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

  /**
   * Maps wallet type strings to wallet schema property names
   * @param w - Wallet type string
   * @returns Corresponding wallet schema property name
   * @throws Error if wallet type is invalid
   */
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
