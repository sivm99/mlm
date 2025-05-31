import db from "@/db";
import { addressesTable, InsertAddress, SelectAddress } from "@/db/schema";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
interface PaginationParams {
  page?: number;
  limit?: number;
}

export type AddressFilter = {
  title?: string;
  city?: string;
  state?: string;
  country?: string;
  userId?: number;
  includeDeleted?: boolean;
};

interface AddressInsertResult {
  result: SelectAddress[];
  error: { address: InsertAddress; error: Error }[];
}

export default class AddressService {
  async addAddresses(addresses: InsertAddress[]): Promise<AddressInsertResult> {
    const result: SelectAddress[] = [];
    const error: { address: InsertAddress; error: Error }[] = [];

    for (const address of addresses) {
      try {
        const inserted = await db
          .insert(addressesTable)
          .values(address)
          .returning();
        if (inserted.length > 0) {
          result.push(inserted[0]);
        }
      } catch (err) {
        error.push({ address, error: err as Error });
      }
    }

    return { result, error };
  }

  async addAddress(address: InsertAddress): Promise<SelectAddress[]> {
    try {
      return await db.insert(addressesTable).values(address).returning();
    } catch (err) {
      throw new Error(
        `Failed to add address: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async getAddressById(
    id: SelectAddress["id"],
  ): Promise<SelectAddress | undefined> {
    return await db.query.addressesTable.findFirst({
      where: and(
        eq(addressesTable.id, id),
        eq(addressesTable.isDeleted, false),
      ),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
          },
        },

        addedByUser: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async updateAddress(
    id: SelectAddress["id"],
    address: Partial<InsertAddress>,
  ): Promise<SelectAddress[]> {
    try {
      return await db
        .update(addressesTable)
        .set({ ...address })
        .where(eq(addressesTable.id, id))
        .returning();
    } catch (err) {
      throw new Error(
        `Failed to update address: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async deleteAddress(
    id: SelectAddress["id"],
    hardDelete: boolean = false,
  ): Promise<SelectAddress[]> {
    try {
      if (hardDelete) {
        return await db
          .delete(addressesTable)
          .where(eq(addressesTable.id, id))
          .returning();
      } else {
        return await db
          .update(addressesTable)
          .set({ isDeleted: true, updatedAt: new Date() })
          .where(eq(addressesTable.id, id))
          .returning();
      }
    } catch (err) {
      throw new Error(
        `Failed to delete address: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async restoreAddress(id: SelectAddress["id"]): Promise<SelectAddress[]> {
    try {
      return await db
        .update(addressesTable)
        .set({ isDeleted: false, updatedAt: new Date() })
        .where(eq(addressesTable.id, id))
        .returning();
    } catch (err) {
      throw new Error(
        `Failed to restore address: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async listAddresses(
    pagination: PaginationParams = { page: 1, limit: 10 },
    filter: AddressFilter = {},
  ): Promise<{ data: SelectAddress[]; total: number }> {
    try {
      const { page = 1, limit = 10 } = pagination;
      const offset = (page - 1) * limit;

      const conditions = [];

      // Only include non-deleted addresses unless explicitly requested
      if (!filter.includeDeleted) {
        conditions.push(eq(addressesTable.isDeleted, false));
      }

      if (filter.title) {
        conditions.push(ilike(addressesTable.title, `%${filter.title}%`));
      }

      if (filter.city) {
        conditions.push(ilike(addressesTable.city, `%${filter.city}%`));
      }

      if (filter.state) {
        conditions.push(ilike(addressesTable.state, `%${filter.state}%`));
      }

      if (filter.country) {
        conditions.push(ilike(addressesTable.country, `%${filter.country}%`));
      }

      if (filter.userId) {
        conditions.push(eq(addressesTable.userId, filter.userId));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const data = await db.query.addressesTable.findMany({
        where: whereClause,
        with: {
          user: {
            columns: {
              id: true,
            },
          },
        },
        limit,
        offset,
        orderBy: [desc(addressesTable.updatedAt)],
      });

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(addressesTable)
        .where(whereClause);

      const total = totalResult[0]?.count || 0;

      return { data, total };
    } catch (err) {
      throw new Error(
        `Failed to list addresses: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async getAddressesByUserId(userId: number): Promise<SelectAddress[]> {
    try {
      return await db.query.addressesTable.findMany({
        where: and(
          eq(addressesTable.userId, userId),
          eq(addressesTable.isDeleted, false),
        ),
        orderBy: [desc(addressesTable.updatedAt)],
      });
    } catch (err) {
      throw new Error(
        `Failed to get addresses by user ID: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

export const addressService = new AddressService();
