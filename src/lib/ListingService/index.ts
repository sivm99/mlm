import {
  and,
  asc,
  desc,
  gt,
  lt,
  SQL,
  ilike,
  eq,
  type InferSelectModel,
} from "drizzle-orm";
import { PgTable, PgColumn, TableConfig } from "drizzle-orm/pg-core";
import db from "@/db";
import { ListingParams, ListingResult } from "@/types";

export default class ListingService<
  TTable extends PgTable<TableConfig>,
  TSelect = InferSelectModel<TTable>,
> {
  private table: TTable;

  constructor(table: TTable) {
    this.table = table;
  }

  async list(params: ListingParams<TSelect>): Promise<ListingResult<TSelect>> {
    const {
      limit = 20,
      cursor,
      search,
      searchColumn,
      sortColumn,
      sortOrder = "desc",
      filters = {},
    } = params;

    const whereConditions: SQL[] = [];

    // Add search condition
    if (search && searchColumn) {
      const columnName = searchColumn as string;
      const column = this.getColumn(columnName);
      if (column) {
        whereConditions.push(ilike(column, `%${search}%`));
      }
    }

    // Add filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        const column = this.getColumn(key);
        if (column) {
          whereConditions.push(eq(column, value));
        }
      }
    }

    // Add cursor-based pagination
    if (cursor && sortColumn) {
      try {
        const cursorValue = Buffer.from(cursor, "base64").toString("utf-8");
        const columnName = sortColumn as string;
        const column = this.getColumn(columnName);
        if (column) {
          const comparator = sortOrder === "asc" ? gt : lt;
          whereConditions.push(comparator(column, cursorValue));
        }
      } catch (error) {
        console.error(error);
        console.warn("Invalid cursor provided:", cursor);
      }
    }

    // Build base query
    const baseQuery = db
      .select()
      .from(this.table as PgTable<TableConfig>)
      .limit(limit);

    const queryWithWhere =
      whereConditions.length > 0
        ? baseQuery.where(and(...whereConditions))
        : baseQuery;

    // Apply ordering
    const finalQuery = sortColumn
      ? (() => {
          const columnName = sortColumn as string;
          const column = this.getColumn(columnName);
          if (column) {
            const orderBy = sortOrder === "asc" ? asc(column) : desc(column);
            return queryWithWhere.orderBy(orderBy);
          }
          return queryWithWhere;
        })()
      : queryWithWhere;

    const results = await finalQuery;

    const nextCursor = this.generateNextCursor(results, sortColumn, limit);

    return {
      data: results as TSelect[],
      nextCursor,
      hasMore: results.length === limit,
    };
  }

  private getColumn(columnName: string): PgColumn | null {
    try {
      // Access columns through Drizzle's internal structure
      /*tslint: */
      const tableAny = this.table as any;

      // Try multiple ways to access columns
      const columns =
        tableAny._.columns ||
        tableAny[Symbol.for("drizzle:Columns")] ||
        tableAny.columns ||
        {};

      return columns[columnName] || null;
    } catch (error) {
      console.warn(`Could not access column: ${columnName}`, error);
      return null;
    }
  }

  private generateNextCursor(
    results: unknown[],
    sortColumn: keyof TSelect | undefined,
    limit: number,
  ): string | null {
    if (results.length === 0 || !sortColumn || results.length < limit) {
      return null;
    }

    try {
      const lastResult = results[results.length - 1] as Record<string, unknown>;
      const sortValue = lastResult[sortColumn as string];

      if (sortValue === undefined || sortValue === null) {
        return null;
      }

      return Buffer.from(String(sortValue)).toString("base64");
    } catch (error) {
      console.warn("Could not generate cursor:", error);
      return null;
    }
  }
}

export function createListingService<TTable extends PgTable<TableConfig>>(
  table: TTable,
) {
  return new ListingService(table);
}
