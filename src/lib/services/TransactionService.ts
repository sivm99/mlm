import db from "@/db";
import { eq, and, desc, asc, SQL, or, gte, lte } from "drizzle-orm";
import { withCursorPagination } from "drizzle-pagination";
import {
  transactionsTable,
  SelectTransaction,
  walletTypeEnum,
  transactionTypeEnum,
  transactionStatusEnum,
} from "@/db/schema";
import { usersTable } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { User } from "@/types";

export type TransactionFilterParams = {
  userId?: User["id"];
  fromUserId?: User["id"];
  toUserId?: User["id"];
  type?: (typeof transactionTypeEnum.enumValues)[number];
  status?: (typeof transactionStatusEnum.enumValues)[number];
  fromWalletType?: (typeof walletTypeEnum.enumValues)[number];
  toWalletType?: (typeof walletTypeEnum.enumValues)[number];
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
};

export type TransactionPaginationParams = {
  limit?: number;
  cursorId?: number;
  sortDirection?: "asc" | "desc";
};

export default class TransactionService {
  /**
   * Get transactions with cursor-based pagination and filtering
   */
  async getTransactions(
    filters: TransactionFilterParams = {},
    pagination: TransactionPaginationParams = {},
  ): Promise<{ data: SelectTransaction[]; nextCursor: number | null }> {
    const { limit = 50, cursorId, sortDirection = "desc" } = pagination;
    const {
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
    } = filters;

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

    const data = await db.query.transactionsTable.findMany(
      withCursorPagination({
        where: whereClause,
        limit: limit,
        // @ts-expect-error: The Types couldn't match
        cursors: cursorId
          ? [[transactionsTable.id, sortDirection, cursorId]]
          : undefined,
        orderBy: [sortOrder(transactionsTable.id)],
      }),
    );

    // Calculate next cursor based on the last item
    const nextCursor = data.length === limit ? data[data.length - 1]?.id : null;

    return {
      data,
      nextCursor,
    };
  }

  /**
   * Get admin transaction list with relations included
   */
  async getAdminTransactionsList(
    filters: TransactionFilterParams = {},
    pagination: TransactionPaginationParams = {},
  ) {
    const { data, nextCursor } = await this.getTransactions(
      filters,
      pagination,
    );

    // Get user details for related users
    const userIds = new Set<User["id"]>();
    data.forEach((transaction) => {
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
    const enrichedData = data.map((transaction) => ({
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
      nextCursor,
    };
  }

  /**
   * Get transactions for a specific user
   */
  async getUserTransactions(
    userId: User["id"],
    pagination: TransactionPaginationParams = {},
  ) {
    return this.getTransactions({ userId }, pagination);
  }
}

export const transactionService = new TransactionService();
