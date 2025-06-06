import { MyContext } from "@/types";
import { addressService } from "@/lib/services";
import { InsertAddress } from "@/db/schema";

export default class AddressController {
  static async createAddress(c: MyContext) {
    try {
      const addressData = c.get("createAddress") as InsertAddress;

      const data = await addressService.addAddress(addressData);
      return c.json({
        success: true,
        message: "Address added successfully",
        data: data[0],
      });
    } catch (error) {
      console.error("Error creating address", String(error));
      return c.json(
        {
          success: false,
          message: "Failed to create address",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  }

  static async getAddressById(c: MyContext) {
    try {
      const id = c.get("id");
      const address = await addressService.getAddressById(id);
      if (!address) {
        return c.json({ success: false, message: "Address not found" }, 404);
      }

      return c.json({
        success: true,
        message: "Address retrieved successfully",
        data: address,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: "Failed to get address",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  }

  static async updateAddressById(c: MyContext) {
    try {
      const id = c.get("id");
      const address = await addressService.getAddressById(id);
      if (!address) {
        return c.json({ success: false, message: "Address not found" }, 404);
      }

      const user = c.get("user");
      if (user.role !== "admin" && address.userId !== user.id) {
        return c.json({ success: false, message: "Unauthorized" }, 403);
      }

      const updateData = c.get("updateAddress");
      const updatedAddress = await addressService.updateAddress(id, updateData);

      return c.json({
        success: true,
        message: "Address updated successfully",
        data: updatedAddress[0],
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: "Failed to update address",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  }

  static async deleteAddressById(c: MyContext) {
    try {
      const id = c.get("id");
      const address = await addressService.getAddressById(id);
      if (!address) {
        return c.json({ success: false, message: "Address not found" }, 404);
      }

      const user = c.get("user");
      if (user.role !== "admin" && address.userId !== user.id) {
        return c.json({ success: false, message: "Unauthorized" }, 403);
      }

      // Get the hardDelete flag from query if admin, otherwise default to false
      const hardDelete =
        user.role === "admin" && c.req.query("hardDelete") === "true";

      const result = await addressService.deleteAddress(id, hardDelete);

      return c.json({
        success: true,
        message: `Address ${hardDelete ? "permanently deleted" : "removed"} successfully`,
        data: result[0],
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: "Failed to delete address",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  }

  static async restoreAddressById(c: MyContext) {
    try {
      const id = c.get("id");
      const result = await addressService.restoreAddress(id);

      return c.json({
        success: true,
        message: "Address restored successfully",
        data: result[0],
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: "Failed to restore address",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  }

  static async listAddresses(c: MyContext) {
    try {
      const {
        offset,
        sortDirection = "desc",
        limit,
        toDate,
        fromDate,
        ...filters
      } = c.get("listAddresses");
      const user = c.get("user");

      // If not admin, only show user's own addresses
      const filterWithUser =
        user.role !== "admin" ? { ...filters, userId: user.id } : filters;

      const data = await addressService.listAddresses({
        pagination: {
          limit,
          toDate,
          fromDate,
          offset,
          sortDirection,
        },
        filter: filterWithUser,
      });

      return c.json({
        success: true,
        message: "Addresses retrieved successfully",
        data,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: "Failed to retrieve addresses",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  }

  static async getUserAddresses(c: MyContext) {
    try {
      const { id: userId } = c.get("user");
      const addresses = await addressService.getAddressesByUserId(userId);

      return c.json({
        success: true,
        message: "User addresses retrieved successfully",
        data: addresses,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          message: "Failed to retrieve user addresses",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500,
      );
    }
  }
}
