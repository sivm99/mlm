import db from "@/db";
import { eq, and, sql, desc, asc, gte, lte, inArray, or } from "drizzle-orm";
import OtpService, { otpService } from "./otp-service";
import { EventEmitter } from "events";
import {
  OTP,
  SelectTransaction,
  transactionsTable,
  WalletOperations,
  walletsTable,
} from "@/db/schema";
import {
  AddIncomeArgs,
  ConvertIncomeParams,
  Payout,
  Transaction,
  TransferParams,
  UserId,
  Wallet,
  WalletTransaction,
} from "@/types";
import DatabaseService from "./database-service";
import { eventEmitter } from "@/events";
import { payoutService } from "./payout-service";

const databaseService = new DatabaseService();

// Transaction queue to prevent race conditions
class TransactionQueue {
  private queue: Map<number, Promise<unknown>> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  async execute<T>(userId: number, operation: () => Promise<T>): Promise<T> {
    // If there's already a transaction for this user, wait for it
    const existingTransaction = this.queue.get(userId);
    if (existingTransaction) {
      await existingTransaction.catch(() => {}); // Ignore errors from previous transactions
    }

    // Create new transaction promise
    const transactionPromise = this.executeWithRetry(operation);
    this.queue.set(userId, transactionPromise);

    try {
      const result = await transactionPromise;
      return result;
    } finally {
      // Clean up after transaction completes
      this.queue.delete(userId);
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt = 1,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      if (
        attempt < this.MAX_RETRIES &&
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string" &&
        (error.message?.includes("deadlock") ||
          error.message?.includes("timeout") ||
          error.message?.includes("connection"))
      ) {
        await this.delay(this.RETRY_DELAY * attempt);
        return this.executeWithRetry(operation, attempt + 1);
      }
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Cache for wallet data to reduce database queries
class WalletCache {
  private cache: Map<number, { data: Wallet; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  get(userId: number): Wallet | null {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(userId);
    return null;
  }

  set(userId: number, data: Wallet): void {
    this.cache.set(userId, { data, timestamp: Date.now() });
  }

  invalidate(userId: number): void {
    this.cache.delete(userId);
  }

  clear(): void {
    this.cache.clear();
  }
}

export default class WalletService {
  #otpService: OtpService;
  #eventEmitter: EventEmitter;
  #transactionQueue: TransactionQueue;
  #walletCache: WalletCache;

  constructor(otpService: OtpService, eventEmitter: EventEmitter) {
    this.#otpService = otpService;
    this.#eventEmitter = eventEmitter;
    this.#transactionQueue = new TransactionQueue();
    this.#walletCache = new WalletCache();

    // Clear cache periodically
    setInterval(() => this.#walletCache.clear(), 60000); // Clear every minute
  }

  /**
   * Get user's wallet details including wallet balances and limits (with caching)
   * @param userId - The ID of the user
   * @param useCache - Whether to use cached data (default: true)
   * @returns The wallet details of the user
   * @throws Error if the wallet is not found
   */
  async getUserWallet(userId: number, useCache: boolean = true) {
    if (useCache) {
      const cached = this.#walletCache.get(userId);
      if (cached) return cached;
    }

    const wallet = await db.query.walletsTable.findFirst({
      where: eq(walletsTable.id, userId),
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    if (useCache) {
      this.#walletCache.set(userId, wallet);
    }

    return wallet;
  }

  /**
   * Get multiple users' wallets in batch (optimized)
   * @param userIds - Array of user IDs
   * @returns Map of userId to wallet data
   */
  async getUserWalletsBatch(userIds: UserId[]) {
    const wallets = await db.query.walletsTable.findMany({
      where: inArray(walletsTable.id, userIds),
    });

    const walletMap = new Map();
    wallets.forEach((wallet) => {
      walletMap.set(wallet.id, wallet);
      this.#walletCache.set(wallet.id, wallet);
    });

    return walletMap;
  }

  /**
   * Check if user has sufficient balance for a transaction
   * @param userId - User ID
   * @param walletType - Type of wallet
   * @param amount - Amount to check
   * @returns Boolean indicating if balance is sufficient
   */
  async hasSufficientBalance(
    userId: number,
    walletType: "alpoints" | "bv" | "income_wallet",
    amount: number,
  ): Promise<boolean> {
    try {
      const wallet = await this.getUserWallet(userId);
      const balance = wallet[this.mapWalletTypeToKeyOfWallet(walletType)];
      return balance >= amount;
    } catch {
      return false;
    }
  }

  /**
   * Transfer AL Points between users (no charges for downline/upline) - Queued
   */
  async transferAlPoints(params: TransferParams) {
    const { fromUserId, toUserId, amount, otp, description } = params;

    return await this.#transactionQueue.execute(fromUserId, async () => {
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

      // Pre-validate balances
      if (!(await this.hasSufficientBalance(fromUserId, "alpoints", amount))) {
        throw new Error("Insufficient AL Points balance");
      }

      const result = await this.executeTransaction({
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

      // Invalidate cache for both users
      this.#walletCache.invalidate(fromUserId);
      this.#walletCache.invalidate(toUserId);

      return result;
    });
  }

  /**
   * Convert income wallet to AL Points (10% deduction) - Queued
   */
  async convertIncomeToAlpoints(params: ConvertIncomeParams) {
    const { userId, amount, otp } = params;

    return await this.#transactionQueue.execute(userId, async () => {
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

      // Pre-validate balance
      if (!(await this.hasSufficientBalance(userId, "income_wallet", amount))) {
        throw new Error("Insufficient income wallet balance");
      }

      const result = await this.executeTransaction({
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

      this.#walletCache.invalidate(userId);
      return result;
    });
  }

  /**
   * Payout from income wallet (10% deduction) - Queued
   */
  async payoutFromIncome(params: ConvertIncomeParams) {
    const { userId, amount, otp } = params;

    return await this.#transactionQueue.execute(userId, async () => {
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

      // Pre-validate balance
      if (!(await this.hasSufficientBalance(userId, "income_wallet", amount))) {
        throw new Error("Insufficient income wallet balance");
      }

      const result = await this.executeTransaction({
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

      this.#walletCache.invalidate(userId);
      return result;
    });
  }

  /**
   * Add income to user's income wallet (from cron jobs) - Queued
   */
  async addIncome({
    userId,
    amount,
    type,
    description,
    referenceId,
  }: AddIncomeArgs) {
    return await this.#transactionQueue.execute(userId, async () => {
      const result = await this.executeTransaction({
        type: this.mapPayoutTypeToTransactionType(type),
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

      await payoutService.insertRewardPayout({
        userId,
        referenceId,
        status: "processed",
        type,
      });

      this.#walletCache.invalidate(userId);
      return result;
    });
  }

  /**
   * Bulk add income to multiple users (optimized for cron jobs)
   * @param incomeData - Array of income data for multiple users
   * @returns Array of transaction results
   */
  async addIncomeBulk(incomeData: Array<AddIncomeArgs>) {
    const results = [];
    const batchSize = 10; // Process in batches to avoid overwhelming the system

    for (let i = 0; i < incomeData.length; i += batchSize) {
      const batch = incomeData.slice(i, i + batchSize);
      const batchPromises = batch.map((data) => this.addIncome(data));

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to prevent overwhelming the database
      if (i + batchSize < incomeData.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Activate ID using AL Points (with deduction percentage) - Queued
   */
  async activateId(
    fromUserId: UserId,
    toUserId: UserId,
    activationAmount: number = 68,
    deductionPercentage: number = 26.471,
  ) {
    return await this.#transactionQueue.execute(fromUserId, async () => {
      // Pre-validate balance
      if (
        !(await this.hasSufficientBalance(
          fromUserId,
          "alpoints",
          activationAmount,
        ))
      ) {
        throw new Error("Insufficient AL Points for activation");
      }

      // Increase the destination user's income wallet limit during activation
      await db
        .update(walletsTable)
        .set({
          incomeWalletLimit: 5000,
        })
        .where(eq(walletsTable.id, toUserId))
        .execute();

      const result = await this.executeTransaction({
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

      // Invalidate cache for both users
      this.#walletCache.invalidate(fromUserId);
      this.#walletCache.invalidate(toUserId);

      return result;
    });
  }

  /**
   * Increase income wallet limit by using AL Points - Queued
   */
  async increaseIncomeWalletLimit(userId: UserId) {
    return await this.#transactionQueue.execute(userId, async () => {
      const COST_IN_ALPOINTS = 68;
      const BV_INCREMENT = 50;
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

          // Deduct AL Points and increase limit
          await tx
            .update(walletsTable)
            .set({
              alpoints: sql`${walletsTable.alpoints} - ${COST_IN_ALPOINTS}`,
              incomeWalletLimit: sql`${walletsTable.incomeWalletLimit} + ${LIMIT_INCREASE}`,
              bv: sql`${walletsTable.bv} + ${BV_INCREMENT}`,
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

          // Invalidate cache
          this.#walletCache.invalidate(userId);

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
    });
  }

  /**
   * Get wallet summary with aggregated statistics
   * @param userId - User ID
   * @returns Wallet summary with totals and limits
   */
  async getWalletSummary(userId: number) {
    const wallet = await this.getUserWallet(userId);

    // Get recent transaction statistics
    const recentTransactions = await db.query.transactionsTable.findMany({
      where: and(
        eq(transactionsTable.fromUserId, userId),
        gte(
          transactionsTable.createdAt,
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        ), // Last 30 days
      ),
      orderBy: desc(transactionsTable.createdAt),
      limit: 10,
    });

    const totalSpent30Days = recentTransactions
      .filter((t) => t.fromUserId === userId)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalReceived30Days = recentTransactions
      .filter((t) => t.toUserId === userId)
      .reduce((sum, t) => sum + t.netAmount, 0);

    return {
      ...wallet,
      totalBalance: wallet.alpoints + wallet.bv + wallet.incomeWallet,
      incomeWalletUtilization:
        (wallet.incomeWallet / wallet.incomeWalletLimit) * 100,
      recentStats: {
        totalSpent30Days,
        totalReceived30Days,
        transactionCount30Days: recentTransactions.length,
      },
    };
  }

  /**
   * Core transaction execution with proper validation and logging
   * Now includes better error handling, optimizations, and incomeWithdrawn tracking
   */
  private async executeTransaction(params: WalletTransaction) {
    return await db.transaction(async (tx) => {
      try {
        // Calculate amounts with proper rounding
        const deductionAmount = params.deductionPercentage
          ? Math.round(
              ((params.amount * params.deductionPercentage) / 100) * 100,
            ) / 100
          : 0;
        const netAmount =
          Math.round((params.amount - deductionAmount) * 100) / 100;

        // Validate sufficient balance for debit operations
        if (params.fromUserId && params.fromWalletType) {
          const fromWallet = await tx.query.walletsTable.findFirst({
            where: eq(walletsTable.id, params.fromUserId),
          });

          if (!fromWallet) {
            throw new Error("Source wallet not found");
          }

          const walletKey = this.mapWalletTypeToKeyOfWallet(
            params.fromWalletType,
          );
          const currentBalance = fromWallet[walletKey];

          if (currentBalance < params.amount) {
            throw new Error(
              `Insufficient ${params.fromWalletType} balance. Required: ${params.amount}, Available: ${currentBalance}`,
            );
          }

          // Prepare update query for source wallet
          const updateQuery = {
            [walletKey]: sql`${walletsTable[walletKey]} - ${params.amount}`,
          };

          // For income_payout, track incomeWithdrawn
          if (
            params.type === "income_payout" &&
            params.fromWalletType === "income_wallet"
          ) {
            updateQuery.incomeWithdrawn = sql`${walletsTable.incomeWithdrawn} + ${netAmount}`;
          }

          // Debit from source wallet
          await tx
            .update(walletsTable)
            .set(updateQuery)
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

              // Check if adding would exceed limit
              if (
                toWallet.incomeWallet + creditAmount >
                toWallet.incomeWalletLimit
              ) {
                throw new Error(
                  `Exceeds income wallet limit. Current: ${toWallet.incomeWallet}, Limit: ${toWallet.incomeWalletLimit}, Adding: ${creditAmount}`,
                );
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
              const walletKey = this.mapWalletTypeToKeyOfWallet(
                params.toWalletType,
              );
              const updateQuery = {
                [walletKey]: sql`${walletsTable[walletKey]} + ${creditAmount}`,
              };

              await tx
                .update(walletsTable)
                .set(updateQuery)
                .where(eq(walletsTable.id, params.toUserId));
            }
          }
        }

        // Create transaction record with unique reference
        const [transaction] = await tx
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
            metadata: params.metadata
              ? JSON.stringify({
                  ...params.metadata,
                  // Include incomeWithdrawn in metadata for income_payout
                  ...(params.type === "income_payout" && {
                    incomeWithdrawn: netAmount,
                  }),
                })
              : null,
            requiresOtp: params.requiresOtp || false,
            otpVerified: true,
          })
          .returning();

        // Emit detailed log event
        this.#eventEmitter.emit("transaction", {
          action: "transaction_completed",
          userId: params.fromUserId || params.toUserId,
          transactionId: transaction.id,
          message: `Transaction completed: ${params.type}`,
          metadata: {
            amount: params.amount,
            netAmount: netAmount,
            deductionAmount: deductionAmount,
            type: params.type,
            reference: transaction.id,
            fromUserId: params.fromUserId,
            toUserId: params.toUserId,
            // Include incomeWithdrawn in event metadata
            ...(params.type === "income_payout" && {
              incomeWithdrawn: netAmount,
            }),
          },
        });

        return transaction;
      } catch (error) {
        // Create failed transaction record for audit trail
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
          reference: undefined,
          requiresOtp: params.requiresOtp || false,
        });

        // Emit error event
        this.#eventEmitter.emit("transaction_error", {
          action: "transaction_failed",
          userId: params.fromUserId || params.toUserId,
          error: String(error),
          transactionType: params.type,
          reference: undefined,
        });

        throw error;
      }
    });
  }

  /**
   * Directly execute a transaction (admin function) - Queued
   */
  async adminExecute(params: WalletTransaction) {
    const userId = params.fromUserId || params.toUserId;
    if (!userId) {
      throw new Error("Either fromUserId or toUserId must be provided");
    }

    return await this.#transactionQueue.execute(userId, async () => {
      const result = await this.executeTransaction(params);

      // Invalidate cache for affected users
      if (params.fromUserId) this.#walletCache.invalidate(params.fromUserId);
      if (params.toUserId) this.#walletCache.invalidate(params.toUserId);

      return result;
    });
  }

  /**
   * Get user transaction history with enhanced filtering
   * @param userId - User ID to fetch transactions for
   * @param options - Query options
   * @returns Array of transaction records with pagination info
   */
  async getUserTransactions(
    userId: UserId,
    options: {
      limit?: number;
      offset?: number;
      type?: Transaction["type"];
      status?: Transaction["status"];
      dateFrom?: Date;
      dateTo?: Date;
      walletType?: "alpoints" | "bv" | "income_wallet";
    } = {},
  ) {
    const {
      limit = 50,
      offset = 0,
      type,
      status,
      dateFrom,
      dateTo,
      walletType,
    } = options;

    const conditions = [
      or(
        eq(transactionsTable.fromUserId, userId),
        eq(transactionsTable.toUserId, userId),
      ),
    ];

    // Add optional filters
    if (type) conditions.push(eq(transactionsTable.type, type));
    if (status) conditions.push(eq(transactionsTable.status, status));
    if (dateFrom) conditions.push(gte(transactionsTable.createdAt, dateFrom));
    if (dateTo) conditions.push(lte(transactionsTable.createdAt, dateTo));
    if (walletType) {
      conditions.push(
        and(
          eq(transactionsTable.fromWalletType, walletType),
          eq(transactionsTable.toWalletType, walletType),
        ),
      );
    }

    const transactions = await db.query.transactionsTable.findMany({
      where: and(...conditions),
      limit,
      offset,
      orderBy: desc(transactionsTable.createdAt),
    });

    // Get total count for pagination
    const totalCount = await db.query.transactionsTable.findMany({
      where: and(...conditions),
    });

    return {
      list: transactions,
      pagination: {
        total: totalCount.length,
        limit,
        offset,
        hasNext: offset + limit < totalCount.length,
        hasPrevious: offset > 0,
      },
    };
  }

  /**
   * Generate OTP for wallet operations with rate limiting
   */
  async generateWalletOtp(userId: UserId, type: WalletOperations[number]) {
    const user = await databaseService.fetchUserData(userId);
    if (!user) throw new Error("User not found");

    const otpType = this.mapWalletOperationToOtpType(type);

    return await this.#otpService.generateOtp({
      type: otpType,
      email: user.email,
      userId: user.id,
      name: user.name,
    });
  }

  /**
   * Get transaction analytics for a user
   * @param userId - User ID
   * @param days - Number of days to analyze (default: 30)
   * @returns Transaction analytics
   */
  async getTransactionAnalytics(userId: UserId, days: number = 30) {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const transactions = await db.query.transactionsTable.findMany({
      where: and(
        and(
          eq(transactionsTable.fromUserId, userId),
          eq(transactionsTable.toUserId, userId),
        ),
        gte(transactionsTable.createdAt, fromDate),
      ),
    });

    const analytics = {
      totalTransactions: transactions.length,
      totalSpent: 0,
      totalReceived: 0,
      byType: {} as Record<string, { count: number; amount: number }>,
      byWallet: {} as Record<string, { debited: number; credited: number }>,
      successRate: 0,
    };

    transactions.forEach((tx) => {
      // Track by transaction type
      if (!analytics.byType[tx.type]) {
        analytics.byType[tx.type] = { count: 0, amount: 0 };
      }
      analytics.byType[tx.type].count++;
      analytics.byType[tx.type].amount += tx.amount;

      // Track spending vs receiving
      if (tx.fromUserId === userId) {
        analytics.totalSpent += tx.amount;
      }
      if (tx.toUserId === userId) {
        analytics.totalReceived += tx.netAmount;
      }

      // Track by wallet type
      if (tx.fromWalletType && tx.fromUserId === userId) {
        if (!analytics.byWallet[tx.fromWalletType]) {
          analytics.byWallet[tx.fromWalletType] = { debited: 0, credited: 0 };
        }
        analytics.byWallet[tx.fromWalletType].debited += tx.amount;
      }
      if (tx.toWalletType && tx.toUserId === userId) {
        if (!analytics.byWallet[tx.toWalletType]) {
          analytics.byWallet[tx.toWalletType] = { debited: 0, credited: 0 };
        }
        analytics.byWallet[tx.toWalletType].credited += tx.netAmount;
      }
    });

    // Calculate success rate
    const completedTransactions = transactions.filter(
      (tx) => tx.status === "completed",
    ).length;
    analytics.successRate =
      transactions.length > 0
        ? (completedTransactions / transactions.length) * 100
        : 100;

    return analytics;
  }

  /**
   * Get pending transactions that require attention
   * @param userId - User ID (optional, for admin use)
   * @returns Array of pending transactions
   */
  async getPendingTransactions(userId?: UserId) {
    const conditions = [eq(transactionsTable.status, "pending")];

    if (userId) {
      const andCondition = and(
        eq(transactionsTable.fromUserId, userId),
        eq(transactionsTable.toUserId, userId),
      );
      if (andCondition) conditions.push(andCondition);
    }

    return await db.query.transactionsTable.findMany({
      where: and(...conditions),
      orderBy: asc(transactionsTable.createdAt),
    });
  }

  /**
   * Validate transaction before execution
   * @param params - Transaction parameters
   * @returns Validation result with details
   */
  async validateTransaction(params: WalletTransaction): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate amounts
    if (params.amount <= 0) {
      errors.push("Transaction amount must be greater than 0");
    }

    if (
      params.deductionPercentage &&
      (params.deductionPercentage < 0 || params.deductionPercentage > 100)
    ) {
      errors.push("Deduction percentage must be between 0 and 100");
    }

    // Validate user existence and wallet balances
    if (params.fromUserId && params.fromWalletType) {
      try {
        const wallet = await this.getUserWallet(params.fromUserId);
        const balance =
          wallet[this.mapWalletTypeToKeyOfWallet(params.fromWalletType)];

        if (balance < params.amount) {
          errors.push(`Insufficient ${params.fromWalletType} balance`);
        } else if (balance < params.amount * 1.1) {
          warnings.push(
            `Low ${params.fromWalletType} balance after transaction`,
          );
        }
      } catch (error) {
        console.error("error come during validating tranasction", error);
        errors.push("Source wallet not found or inaccessible");
      }
    }

    // Validate income wallet limits
    if (params.toUserId && params.toWalletType === "income_wallet") {
      try {
        const wallet = await this.getUserWallet(params.toUserId);
        const netAmount =
          params.amount -
          (params.deductionPercentage
            ? (params.amount * params.deductionPercentage) / 100
            : 0);

        if (wallet.incomeWallet + netAmount > wallet.incomeWalletLimit) {
          errors.push("Transaction would exceed income wallet limit");
        } else if (
          wallet.incomeWallet + netAmount >
          wallet.incomeWalletLimit * 0.9
        ) {
          warnings.push("Transaction would use most of income wallet limit");
        }
      } catch (error) {
        console.error("error during wallet validation", error);
        errors.push("Destination wallet not found or inaccessible");
      }
    }

    // Validate business rules
    if (params.type === "alpoints_transfer" && params.amount > 10000) {
      warnings.push(
        "Large AL Points transfer - consider splitting into smaller amounts",
      );
    }

    if (params.type === "income_payout" && params.amount < 10) {
      warnings.push("Small payout amount - consider consolidating payouts");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Simulate transaction to preview results
   * @param params - Transaction parameters
   * @returns Simulated transaction result
   */
  async simulateTransaction(params: WalletTransaction) {
    const validation = await this.validateTransaction(params);

    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    const deductionAmount = params.deductionPercentage
      ? Math.round(((params.amount * params.deductionPercentage) / 100) * 100) /
        100
      : 0;
    const netAmount = Math.round((params.amount - deductionAmount) * 100) / 100;

    const result = {
      success: true,
      errors: [],
      warnings: validation.warnings,
      preview: {
        amount: params.amount,
        deductionAmount,
        netAmount,
        deductionPercentage: params.deductionPercentage || 0,
        type: params.type,
        description: params.description,
      },
      balanceChanges: {} as Record<number, unknown>,
    };

    // Calculate balance changes
    if (params.fromUserId && params.fromWalletType) {
      try {
        const wallet = await this.getUserWallet(params.fromUserId);
        const walletKey = this.mapWalletTypeToKeyOfWallet(
          params.fromWalletType,
        );

        result.balanceChanges[params.fromUserId] = {
          ...wallet,
          [`${walletKey}_after`]: wallet[walletKey] - params.amount,
          [`${walletKey}_change`]: -params.amount,
        };
      } catch (error) {
        console.error("wallet simulation error catch block", error);
        // Wallet not found handled in validation
      }
    }

    if (
      params.toUserId &&
      params.toWalletType &&
      params.type !== "income_payout"
    ) {
      try {
        const wallet = await this.getUserWallet(params.toUserId);
        const walletKey = this.mapWalletTypeToKeyOfWallet(params.toWalletType);

        if (params.toWalletType === "income_wallet") {
          result.balanceChanges[params.toUserId] = {
            ...(result.balanceChanges[params.toUserId] || wallet),
            incomeWallet_after: wallet.incomeWallet + netAmount,
            incomeWallet_change: netAmount,
            incomeWalletLimit_after: wallet.incomeWalletLimit - netAmount,
            incomeWalletLimit_change: -netAmount,
          };
        } else {
          result.balanceChanges[params.toUserId] = {
            ...(result.balanceChanges[params.toUserId] || wallet),
            [`${walletKey}_after`]: wallet[walletKey] + netAmount,
            [`${walletKey}_change`]: netAmount,
          };
        }
      } catch (error) {
        // Wallet not found handled in validation
        console.error("wallet simulation error catch block", error);
      }
    }

    return result;
  }

  /**
   * Get transaction statistics for admin dashboard
   * @param options - Query options
   * @returns Transaction statistics
   */
  async getTransactionStats(
    options: {
      dateFrom?: Date;
      dateTo?: Date;
      type?: Transaction["type"];
      status?: Transaction["status"];
    } = {},
  ) {
    const { dateFrom, dateTo, type, status } = options;

    const conditions = [];
    if (dateFrom) conditions.push(gte(transactionsTable.createdAt, dateFrom));
    if (dateTo) conditions.push(lte(transactionsTable.createdAt, dateTo));
    if (type) {
      conditions.push(eq(transactionsTable.type, type));
    }
    if (status) conditions.push(eq(transactionsTable.status, status));

    const transactions = await db.query.transactionsTable.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
    });

    const stats = {
      totalTransactions: transactions.length,
      totalVolume: 0,
      totalDeductions: 0,
      averageAmount: 0,
      byType: {} as Record<string, { count: number; volume: number }>,
      byStatus: {} as Record<string, number>,
      hourlyDistribution: Array(24).fill(0),
      dailyTrend: {} as Record<string, number>,
    };

    transactions.forEach((tx) => {
      stats.totalVolume += tx.amount;
      stats.totalDeductions += tx.deductionAmount ? tx.deductionAmount : 0;

      // By type
      if (!stats.byType[tx.type]) {
        stats.byType[tx.type] = { count: 0, volume: 0 };
      }
      stats.byType[tx.type].count++;
      stats.byType[tx.type].volume += tx.amount;

      // By status
      stats.byStatus[tx.status] = (stats.byStatus[tx.status] || 0) + 1;

      // Hourly distribution
      const hour = new Date(tx.createdAt).getHours();
      stats.hourlyDistribution[hour]++;

      // Daily trend
      const day = new Date(tx.createdAt).toISOString().split("T")[0];
      stats.dailyTrend[day] = (stats.dailyTrend[day] || 0) + 1;
    });

    stats.averageAmount =
      stats.totalTransactions > 0
        ? stats.totalVolume / stats.totalTransactions
        : 0;

    return stats;
  }

  /**
   * Freeze/unfreeze wallet operations for a user
   * @param userId - User ID
   * @param frozen - Whether to freeze (true) or unfreeze (false)
   * @param reason - Reason for freezing/unfreezing
   * @returns Updated wallet status
   */
  async setWalletFrozenStatus(userId: UserId, frozen: boolean, reason: string) {
    const wallet = await db
      .update(walletsTable)
      .set({
        // Assuming there's a frozen field in the wallet schema
        // frozen: frozen,
        // frozenReason: reason,
        // frozenAt: frozen ? new Date() : null,
      })
      .where(eq(walletsTable.id, userId))
      .returning();

    // Invalidate cache
    this.#walletCache.invalidate(userId);

    // Emit event
    this.#eventEmitter.emit("wallet_status_changed", {
      userId,
      frozen,
      reason,
      timestamp: new Date(),
    });

    return wallet[0];
  }

  /**
   * Process failed transactions (admin function)
   * @param transactionId - Transaction ID to retry
   * @returns Processing result
   */
  async retryFailedTransaction(transactionId: number) {
    const transaction = await db.query.transactionsTable.findFirst({
      where: eq(transactionsTable.id, transactionId),
    });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.status !== "failed") {
      throw new Error("Only failed transactions can be retried");
    }

    // Reconstruct transaction parameters
    const params: WalletTransaction = {
      type: transaction.type,
      fromUserId: transaction.fromUserId || undefined,
      toUserId: transaction.toUserId || undefined,
      fromWalletType: transaction.fromWalletType,
      toWalletType: transaction.toWalletType,
      amount: transaction.amount,
      deductionPercentage: transaction.deductionPercentage || undefined,
      description: `Retry: ${transaction.description}`,
      reference: transaction.reference || undefined,
      metadata: transaction.metadata
        ? JSON.parse(transaction.metadata)
        : undefined,
      requiresOtp: transaction.requiresOtp || undefined,
    };

    return await this.adminExecute(params);
  }

  /**
   * Export user transactions to CSV format
   * @param userId - User ID
   * @param options - Export options
   * @returns CSV string
   */
  async exportUserTransactions(
    userId: UserId,
    options: {
      dateFrom?: Date;
      dateTo?: Date;
      format?: "csv" | "json";
    } = {},
  ) {
    const { dateFrom, dateTo, format = "csv" } = options;

    const conditions = [
      and(
        eq(transactionsTable.fromUserId, userId),
        eq(transactionsTable.toUserId, userId),
      ),
    ];

    if (dateFrom) conditions.push(gte(transactionsTable.createdAt, dateFrom));
    if (dateTo) conditions.push(lte(transactionsTable.createdAt, dateTo));

    const transactions = await db.query.transactionsTable.findMany({
      where: and(...conditions),
      orderBy: desc(transactionsTable.createdAt),
    });

    if (format === "json") {
      return JSON.stringify(transactions, null, 2);
    }

    // CSV format
    const headers = [
      "ID",
      "Type",
      "Status",
      "Amount",
      "Deduction",
      "Net Amount",
      "From Wallet",
      "To Wallet",
      "Description",
      "Reference",
      "Created At",
    ];

    const csvRows = [
      headers.join(","),
      ...transactions.map((tx) =>
        [
          tx.id,
          tx.type,
          tx.status,
          tx.amount,
          tx.deductionAmount,
          tx.netAmount,
          tx.fromWalletType || "",
          tx.toWalletType || "",
          `"${tx.description}"`,
          tx.reference || "",
          tx.createdAt.toISOString(),
        ].join(","),
      ),
    ];

    return csvRows.join("\n");
  }

  /**
   * Maps wallet operation types to OTP types
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
   *
   * maps payout type to transaction type
   */
  private mapPayoutTypeToTransactionType(
    payoutType: Payout["type"],
  ): Transaction["type"] {
    switch (payoutType) {
      case "sale_reward":
      case "lifetime_reward":
      case "rank_achievement_income":
        return "weekly_payout_earned";
      case "matching_income":
      case "matching_bonus":
        return "matching_income_earned";
      case "income_withdrawl":
        return "income_payout";
      default:
        // Handle unexpected payoutType values safely
        return "income_payout";
    }
  }
  /**
   * Maps wallet type strings to wallet schema property names
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

  /**
   * Clean up old cache entries and optimize performance
   */
  async performMaintenance() {
    // Clear old cache entries
    this.#walletCache.clear();
    // Could add more maintenance tasks like:
    // - Archive old transactions
    // - Clean up failed transactions older than X days
    // - Optimize database indices

    this.#eventEmitter.emit("maintenance", {
      action: "cache_cleared",
      timestamp: new Date(),
    });
  }
}

export const walletService = new WalletService(otpService, eventEmitter);
