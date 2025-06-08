import db from "@/db";
import { InsertPayout, payoutsTable } from "@/db/schema";
import {
  IncomePayoutArgs,
  Listing,
  ListingQueryWithFilters,
  Payout,
} from "@/types";
import { sql } from "drizzle-orm";
import { and, eq } from "drizzle-orm";

export default class PayoutService {
  #REWARD_CONFIG = {
    WEEKLY_PAYOUT_AMOUNT: 3, // $3 per week
    MAX_WEEKS: 104, // 104 weeks maximum
    TOTAL_PAYOUT_AMOUNT: 312, // $3 * 104 weeks = $312
    ORDER_IMMEDIATE_CLOSE: true,
    ADMIN_FEE: 0,
  } as const;

  async insertPayoutRecord(record: InsertPayout) {
    await db.insert(payoutsTable).values(record).execute();
  }

  async insertRewardPayout({
    userId,
    referenceId,
    status,
    type,
  }: IncomePayoutArgs) {
    // Create payout record
    await db.insert(payoutsTable).values({
      userId,
      amount: this.#REWARD_CONFIG.WEEKLY_PAYOUT_AMOUNT,
      status,
      type,
      referenceId,
      adminFee: this.#REWARD_CONFIG.ADMIN_FEE,
    });
  }

  async listPayouts(
    args: ListingQueryWithFilters<Payout>,
  ): Promise<Listing<Payout>> {
    try {
      const { offset, limit, sortDirection } = args.pagination;
      const { filter } = args;
      const conditions = [];

      if (filter.userId) {
        conditions.push(eq(payoutsTable.userId, filter.userId));
      }

      if (filter.type) {
        conditions.push(eq(payoutsTable.type, filter.type));
      }
      if (filter.status) {
        conditions.push(eq(payoutsTable.status, filter.status));
      }

      if (filter.createdAt) {
        conditions.push(eq(payoutsTable.createdAt, filter.createdAt));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const list = await db.query.payoutsTable.findMany({
        where: whereClause,
        with: {
          user: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        limit,
        offset,
        orderBy: [
          sortDirection === "asc"
            ? sql`${payoutsTable.createdAt} ASC`
            : sql`${payoutsTable.createdAt} DESC`,
        ],
      });

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(payoutsTable)
        .where(whereClause);
      const total = totalResult[0]?.count || 0;

      return {
        list,
        pagination: {
          limit,
          offset,
          total,
          hasNext: offset + list.length < total,
          hasPrevious: offset > 0,
        },
      };
    } catch (err) {
      throw new Error(
        `Failed to list payouts: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

export const payoutService = new PayoutService();
