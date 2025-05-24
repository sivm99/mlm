import db from "@/db";
import { SafeUser } from "@/types";
import {
  eq,
  or,
  and,
  ilike,
  gte,
  lte,
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
    page?: number;
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
  page: number;
  totalPages: number;
  totalCount: number;
} | null> {
  const limit = Math.min(params.limit || 10, 100); // Cap at 100 to prevent abuse
  const page = Math.max(params.page || 1, 1); // Ensure page is at least 1
  const offset = (page - 1) * limit;
  const orderBy = params.orderBy || "createdAt";
  const orderDirection = params.orderDirection || "desc";
  const { search, filters = {} } = params;

  // Prepare the conditions
  const conditions: SQL<unknown>[] = [eq(usersTable.sponsor, id)];

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
    conditions.push(eq(usersTable.position, filters.position));
  }

  if (filters.isActive !== undefined) {
    conditions.push(eq(usersTable.isActive, filters.isActive));
  }

  if (filters.isBlocked !== undefined) {
    conditions.push(eq(usersTable.isBlocked, filters.isBlocked));
  }

  if (filters.role) {
    conditions.push(eq(usersTable.role, filters.role));
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

  // Combine all conditions with AND
  const combinedCondition = and(...conditions);

  // Get total count for pagination
  const countResult = await db
    .select({ count: db.fn.count() })
    .from(usersTable)
    .where(combinedCondition);

  const totalCount = Number(countResult[0].count) || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Build the query with all conditions at once
  const orderColumn = usersTable[orderBy as keyof typeof usersTable];
  const query = db
    .select(safeUserReturn)
    .from(usersTable)
    .where(combinedCondition);

  // Add sorting
  if (orderDirection === "desc") {
    query.orderBy(desc(orderColumn));
  } else {
    query.orderBy(asc(orderColumn));
  }

  // Add secondary sort by id for consistent pagination
  if (orderBy !== "createdAt") {
    query.orderBy(
      orderDirection === "desc"
        ? desc(usersTable.createdAt)
        : asc(usersTable.createdAt),
    );
  }

  // Apply limit and offset
  const users = await query.limit(limit).offset(offset);

  if (!users.length && totalCount > 0 && page > 1) {
    // If no results but there should be results, likely the page is out of range
    // We could potentially redirect to the last valid page
    return {
      users: [],
      page,
      totalPages,
      totalCount,
    };
  }

  return {
    users,
    page,
    totalPages,
    totalCount,
  };
}
