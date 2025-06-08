import db from "@/db";
import { arHistoryTable, InsertArHistory, SelectArHistory } from "@/db/schema";
import { ListArHistoryArgs, Listing } from "@/types";
import { sql } from "drizzle-orm";
import { and, desc, eq } from "drizzle-orm";

export default class ArHistoryService {
  async addArHistory(arHistory: InsertArHistory) {
    try {
      return await db.insert(arHistoryTable).values(arHistory).execute();
    } catch (err) {
      throw new Error(
        `Failed to add AR history: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async addMultipleArHistory(arHistories: InsertArHistory[]): Promise<{
    result: SelectArHistory[];
    error: { arHistory: InsertArHistory; error: Error }[];
  }> {
    const result: SelectArHistory[] = [];
    const error: { arHistory: InsertArHistory; error: Error }[] = [];

    for (const arHistory of arHistories) {
      try {
        const inserted = await db
          .insert(arHistoryTable)
          .values(arHistory)
          .returning();
        if (inserted.length > 0) {
          result.push(inserted[0]);
        }
      } catch (err) {
        error.push({ arHistory, error: err as Error });
      }
    }

    return { result, error };
  }

  async getArHistoryById(
    id: SelectArHistory["id"],
  ): Promise<SelectArHistory | undefined> {
    return await db.query.arHistoryTable.findFirst({
      where: eq(arHistoryTable.id, id),
      with: {
        fromUser: {
          columns: {
            id: true,
            name: true,
          },
        },
        toUser: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async updateArHistory(
    id: SelectArHistory["id"],
    arHistory: Partial<InsertArHistory>,
  ): Promise<SelectArHistory[]> {
    try {
      return await db
        .update(arHistoryTable)
        .set({ ...arHistory })
        .where(eq(arHistoryTable.id, id))
        .returning();
    } catch (err) {
      throw new Error(
        `Failed to update AR history: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async deleteArHistory(id: SelectArHistory["id"]): Promise<SelectArHistory[]> {
    try {
      return await db
        .delete(arHistoryTable)
        .where(eq(arHistoryTable.id, id))
        .returning();
    } catch (err) {
      throw new Error(
        `Failed to delete AR history: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async listArHistory(
    args: ListArHistoryArgs,
  ): Promise<Listing<SelectArHistory>> {
    try {
      const { offset = 0, limit = 10 } = args.pagination;
      const { filter } = args;
      const conditions = [];
      if (filter.id) {
        conditions.push(eq(arHistoryTable.id, filter.id));
      }
      if (filter.createdAt) {
        conditions.push(eq(arHistoryTable.createdAt, filter.createdAt));
      }
      if (filter.fromUserId) {
        conditions.push(eq(arHistoryTable.fromUserId, filter.fromUserId));
      }
      if (filter.toUserId) {
        conditions.push(eq(arHistoryTable.toUserId, filter.toUserId));
      }
      if (filter.activityType) {
        conditions.push(eq(arHistoryTable.activityType, filter.activityType));
      }
      if (filter.investment) {
        conditions.push(eq(arHistoryTable.investment, filter.investment));
      }
      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;
      const list = await db.query.arHistoryTable.findMany({
        where: whereClause,
        with: {
          fromUser: {
            columns: {
              id: true,
              name: true,
            },
          },
          toUser: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        limit,
        offset,
        orderBy: [desc(arHistoryTable.createdAt)],
      });
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(arHistoryTable)
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
        `Failed to list AR history: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async getArHistoryByUserId(
    userId: number,
    isFromUser: boolean = true,
  ): Promise<SelectArHistory[]> {
    try {
      return await db.query.arHistoryTable.findMany({
        where: isFromUser
          ? eq(arHistoryTable.fromUserId, userId)
          : eq(arHistoryTable.toUserId, userId),
        orderBy: [desc(arHistoryTable.createdAt)],
        with: {
          fromUser: {
            columns: {
              id: true,
              name: true,
            },
          },
          toUser: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (err) {
      throw new Error(
        `Failed to get AR history by user ID: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

export const arHistoryService = new ArHistoryService();
