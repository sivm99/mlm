import { usersTable } from "@/db/schema";
import ListingService from ".";

export class UserListingService extends ListingService<typeof usersTable> {
  constructor() {
    super(usersTable);
  }

  // Add user-specific methods if needed
  async listActiveUsers() {
    return this.list({
      filters: { isActive: true },
      sortColumn: "createdAt",
      sortOrder: "desc",
    });
  }

  async searchUsersByName(name: string) {
    return this.list({
      search: name,
      searchColumn: "name",
      sortColumn: "name",
      sortOrder: "asc",
    });
  }
}
