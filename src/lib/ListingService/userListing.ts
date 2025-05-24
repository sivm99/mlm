import db from "@/db";
import { SafeUser } from "@/types";
import {
  eq,
  or,
  and,
  ilike,
  gte,
  lte,
  lt,
  gt,
  desc,
  asc,
  isNull,
  isNotNull,
  SQL,
} from "drizzle-orm";
import { safeUserReturn } from "../DatabaseService";
import { usersTable } from "@/db/schema";
export async function getDirectTeam(
  id: string,
  params: {
    // Pagination
    cursor?: string;
    limit?: number;

    // Sorting
    orderBy?:
      | "name"
      | "email"
      | "createdAt"
      | "updatedAt"
      | "associatedUsersCount"
      | "associatedActiveUsersCount"
      | "redeemedTimes";
    orderDirection?: "asc" | "desc";

    // Search
    search?: string;

    // Filters
    filters?: {
      country?: string;
      position?: string;
      isActive?: boolean;
      isBlocked?: boolean;
      role?: string;
      hasLeftUser?: boolean;
      hasRightUser?: boolean;
      minAssociatedUsers?: number;
      maxAssociatedUsers?: number;
      minRedeemedTimes?: number;
      maxRedeemedTimes?: number;
      createdAfter?: Date;
      createdBefore?: Date;
    };
  } = {},
): Promise<{
  users: SafeUser[];
  nextCursor: string | null;
  totalCount?: number;
  hasNextPage: boolean;
} | null> {
  const limit = Math.min(params.limit || 10, 100); // Cap at 100 to prevent abuse
  const orderBy = params.orderBy || "createdAt";
  const orderDirection = params.orderDirection || "desc";
  const { search, filters = {} } = params;

  // Prepare the conditions
  const conditions: SQL<unknown>[] | undefined = [eq(usersTable.sponsor, id)];

  // Apply search filter
  if (search && search.trim()) {
    const searchTerm = `%${search.trim().toLowerCase()}%`;
    conditions.push(
      or(
        ilike(usersTable.name, searchTerm),
        ilike(usersTable.email, searchTerm),
        ilike(usersTable.mobile, searchTerm),
        ilike(usersTable.country, searchTerm),
      ),
    );
  }

  // Apply filters
  if (filters.country) {
    conditions.push(eq(usersTable.country, filters.country));
  }

  if (filters.position) {
    conditions.push(eq(usersTable.position as any, filters.position));
  }

  if (filters.isActive !== undefined) {
    conditions.push(eq(usersTable.isActive, filters.isActive));
  }

  if (filters.isBlocked !== undefined) {
    conditions.push(eq(usersTable.isBlocked, filters.isBlocked));
  }

  if (filters.role) {
    conditions.push(eq(usersTable.role as any, filters.role));
  }

  if (filters.hasLeftUser !== undefined) {
    conditions.push(
      filters.hasLeftUser
        ? isNotNull(usersTable.leftUser)
        : isNull(usersTable.leftUser),
    );
  }

  if (filters.hasRightUser !== undefined) {
    conditions.push(
      filters.hasRightUser
        ? isNotNull(usersTable.rightUser)
        : isNull(usersTable.rightUser),
    );
  }

  if (filters.minAssociatedUsers !== undefined) {
    conditions.push(
      gte(usersTable.associatedUsersCount, filters.minAssociatedUsers),
    );
  }

  if (filters.maxAssociatedUsers !== undefined) {
    conditions.push(
      lte(usersTable.associatedUsersCount, filters.maxAssociatedUsers),
    );
  }

  if (filters.minRedeemedTimes !== undefined) {
    conditions.push(gte(usersTable.redeemedTimes, filters.minRedeemedTimes));
  }

  if (filters.maxRedeemedTimes !== undefined) {
    conditions.push(lte(usersTable.redeemedTimes, filters.maxRedeemedTimes));
  }

  if (filters.createdAfter) {
    conditions.push(gte(usersTable.createdAt, filters.createdAfter));
  }

  if (filters.createdBefore) {
    conditions.push(lte(usersTable.createdAt, filters.createdBefore));
  }

  // Apply cursor-based pagination if cursor is provided
  if (params.cursor) {
    try {
      const decodedCursor = JSON.parse(decodeURIComponent(params.cursor));

      if (orderBy === "createdAt") {
        const cursorDate = new Date(decodedCursor.createdAt);
        conditions.push(
          orderDirection === "desc"
            ? lt(usersTable.createdAt, cursorDate)
            : gt(usersTable.createdAt, cursorDate),
        );
      } else if (orderBy === "updatedAt") {
        const cursorDate = new Date(decodedCursor.updatedAt);
        conditions.push(
          orderDirection === "desc"
            ? lt(usersTable.updatedAt, cursorDate)
            : gt(usersTable.updatedAt, cursorDate),
        );
      } else if (orderBy === "name") {
        conditions.push(
          orderDirection === "desc"
            ? lt(usersTable.name, decodedCursor.name)
            : gt(usersTable.name, decodedCursor.name),
        );
      } else if (orderBy === "email") {
        conditions.push(
          orderDirection === "desc"
            ? lt(usersTable.email, decodedCursor.email)
            : gt(usersTable.email, decodedCursor.email),
        );
      } else if (orderBy === "associatedUsersCount") {
        conditions.push(
          orderDirection === "desc"
            ? lt(
                usersTable.associatedUsersCount,
                decodedCursor.associatedUsersCount,
              )
            : gt(
                usersTable.associatedUsersCount,
                decodedCursor.associatedUsersCount,
              ),
        );
      } else if (orderBy === "associatedActiveUsersCount") {
        conditions.push(
          orderDirection === "desc"
            ? lt(
                usersTable.associatedActiveUsersCount,
                decodedCursor.associatedActiveUsersCount,
              )
            : gt(
                usersTable.associatedActiveUsersCount,
                decodedCursor.associatedActiveUsersCount,
              ),
        );
      } else if (orderBy === "redeemedTimes") {
        conditions.push(
          orderDirection === "desc"
            ? lt(usersTable.redeemedTimes, decodedCursor.redeemedTimes)
            : gt(usersTable.redeemedTimes, decodedCursor.redeemedTimes),
        );
      }
    } catch (_) {
      // Invalid cursor, ignore and proceed without cursor pagination
      console.warn("Invalid cursor provided:", params.cursor);
    }
  }

  // Combine all conditions with AND
  const combinedCondition = and(...conditions);

  // Build the query with all conditions at once
  const orderColumn = usersTable[orderBy as keyof typeof usersTable];
  const query = db
    .select(safeUserReturn)
    .from(usersTable)
    .where(combinedCondition)
    .orderBy(orderDirection === "desc" ? desc(orderColumn) : asc(orderColumn));

  // Add secondary sort by id for consistent pagination
  if (orderBy !== "createdAt") {
    query.orderBy(
      orderDirection === "desc"
        ? desc(usersTable.createdAt)
        : asc(usersTable.createdAt),
    );
  }

  // Get one extra record to check if there's a next page
  const users = await query.limit(limit + 1);

  if (!users.length) {
    return {
      users: [],
      nextCursor: null,
      hasNextPage: false,
      totalCount: 0,
    };
  }

  // Check if we have more results than requested limit
  const hasNextPage = users.length > limit;

  // Remove the extra item we used to determine if there's a next page
  const paginatedUsers = hasNextPage ? users.slice(0, limit) : users;

  // Generate next cursor
  let nextCursor: string | null = null;
  if (hasNextPage && paginatedUsers.length > 0) {
    const lastUser = paginatedUsers[paginatedUsers.length - 1];
    const cursorData: Record<string, unknown> = {};

    // Include the sort field in cursor
    if (orderBy === "createdAt" || orderBy === "updatedAt") {
      cursorData[orderBy] = lastUser[orderBy].toISOString();
    } else {
      cursorData[orderBy] = lastUser[orderBy];
    }

    // Always include createdAt as secondary sort
    if (orderBy !== "createdAt") {
      cursorData.createdAt = lastUser.createdAt.toISOString();
    }

    nextCursor = encodeURIComponent(JSON.stringify(cursorData));
  }

  return {
    users: paginatedUsers,
    nextCursor,
    hasNextPage,
  };
}
