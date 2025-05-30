import db from "@/db";
import { addressesTable, InsertAddress, SelectAddress } from "@/db/schema";
import { eq } from "drizzle-orm";

export default class AddressService {
  async addAddress(address: InsertAddress) {
    return await db.insert(addressesTable).values(address).returning();
  }
  async getAddressById(id: SelectAddress["id"]) {
    return await db.query.addressesTable.findFirst({
      where: eq(addressesTable.id, id),
      with: {
        user: {
          columns: {
            id: true,
          },
        },
      },
    });
  }
}

export const addressService = new AddressService();
