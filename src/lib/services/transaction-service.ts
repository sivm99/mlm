import db from "@/db";
import { eq, and, desc, asc, SQL, or, gte, lte, sql } from "drizzle-orm";
import { transactionsTable, SelectTransaction } from "@/db/schema";
import { usersTable } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { Listing, UserId } from "@/types";
import { TransactionListing } from "@/validation";

export default class TransactionService {
  /**
   * Get transactions with page-limit based pagination and filtering
   */
  async getTransactions({
    limit = 50,
    offset = 0,
    sortDirection = "desc",
    userId,
    fromUserId,
    toUserId,
    type,
    status,
    fromWalletType,
    toWalletType,
    startDate,
    endDate,
    minAmount,
    maxAmount,
  }: TransactionListing): Promise<Listing<SelectTransaction>> {
    // Build where conditions
    const whereConditions: SQL[] = [];

    if (userId) {
      whereConditions.push(
        or(
          eq(transactionsTable.fromUserId, userId),
          eq(transactionsTable.toUserId, userId),
        ) as SQL,
      );
    }
    if (fromUserId) {
      whereConditions.push(eq(transactionsTable.fromUserId, fromUserId));
    }
    if (toUserId) {
      whereConditions.push(eq(transactionsTable.toUserId, toUserId));
    }
    if (type) {
      whereConditions.push(eq(transactionsTable.type, type));
    }
    if (status) {
      whereConditions.push(eq(transactionsTable.status, status));
    }
    if (fromWalletType) {
      whereConditions.push(
        eq(transactionsTable.fromWalletType, fromWalletType),
      );
    }
    if (toWalletType) {
      whereConditions.push(eq(transactionsTable.toWalletType, toWalletType));
    }
    if (startDate) {
      whereConditions.push(gte(transactionsTable.createdAt, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(transactionsTable.createdAt, endDate));
    }
    if (minAmount) {
      whereConditions.push(gte(transactionsTable.amount, minAmount));
    }
    if (maxAmount) {
      whereConditions.push(lte(transactionsTable.amount, maxAmount));
    }
    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const sortOrder = sortDirection === "desc" ? desc : asc;

    // Get total count for pagination info
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(transactionsTable)
      .where(whereClause || sql`1=1`);

    const total = Number(countResult[0]?.count || 0);

    // Get data with limit and offset
    const transactions = await db.query.transactionsTable.findMany({
      where: whereClause,
      limit: limit,
      offset: offset,
      orderBy: [sortOrder(transactionsTable.id)],
    });

    return {
      list: transactions,
      pagination: {
        limit,
        offset,
        total,
        hasNext: offset + transactions.length < total,
        hasPrevious: offset > 0,
      },
    };
  }

  /**
   * Get admin transaction list with relations included
   */
  async getAdminTransactionsList(params: TransactionListing) {
    const result = await this.getTransactions(params);
    const { list: transactions, pagination } = result;

    // Get user details for related users
    const userIds = new Set<UserId>();
    transactions.forEach((transaction: SelectTransaction) => {
      if (transaction.fromUserId) userIds.add(transaction.fromUserId);
      if (transaction.toUserId) userIds.add(transaction.toUserId);
    });

    const users =
      userIds.size > 0
        ? await db.query.usersTable.findMany({
            where: inArray(usersTable.id, Array.from(userIds)),
            columns: {
              id: true,
              name: true,
              email: true,
            },
          })
        : [];

    // Create a map for easy lookup
    const userMap = new Map(users.map((user) => [user.id, user]));

    // Enrich transaction data with user information
    const enrichedData = transactions.map((transaction: SelectTransaction) => ({
      ...transaction,
      fromUser: transaction.fromUserId
        ? userMap.get(transaction.fromUserId) || null
        : null,
      toUser: transaction.toUserId
        ? userMap.get(transaction.toUserId) || null
        : null,
    }));

    return {
      data: enrichedData,
      total: Number(pagination.limit + pagination.offset),
      hasMore: pagination.hasNext,
    };
  }

  /**
   * Get transactions for a specific user
   */
  async getUserTransactions(
    userId: UserId,
    params: Omit<TransactionListing, "userId">,
  ) {
    return this.getTransactions({ ...params, userId });
  }
}

export const transactionService = new TransactionService();
