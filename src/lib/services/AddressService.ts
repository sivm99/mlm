import db from "@/db";
import { addressesTable, InsertAddress, SelectAddress } from "@/db/schema";
import { AddressListingArgs, Listing } from "@/types";
import { and, AnyColumn, desc, eq, ilike, sql } from "drizzle-orm";

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
    listingArgs: AddressListingArgs,
  ): Promise<Listing<SelectAddress>> {
    try {
      const {
        offset = 0,
        limit = 10,
        sortDirection = "desc",
      } = listingArgs.pagination;
      const { filter } = listingArgs;
      const conditions = [];

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
      // Determine sort field based on filters
      let orderByField: AnyColumn = addressesTable.updatedAt;
      if (filter.title) {
        orderByField = addressesTable.title;
      } else if (filter.city) {
        orderByField = addressesTable.city;
      } else if (filter.state) {
        orderByField = addressesTable.state;
      } else if (filter.country) {
        orderByField = addressesTable.country;
      }

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
        orderBy: [sortDirection === "desc" ? desc(orderByField) : orderByField],
      });

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(addressesTable)
        .where(whereClause);

      const total = totalResult[0]?.count || 0;

      return {
        list: data,
        pagination: {
          limit,
          offset,
          total,
          hasNext: offset + limit < total,
          hasPrevious: offset > 0,
        },
      };
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
