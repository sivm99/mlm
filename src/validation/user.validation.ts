import { z } from "zod/v4";
import { zValidator } from "@hono/zod-validator";
import { MyContext } from "@/types";
import { emailField, idField, validationError } from "./_common";
import { addressService, databaseService, treeService } from "@/lib/services";

const updateUserByAdminSchema = z.object({
  id: idField.optional(),
  name: z.string().optional(),
  email: emailField.optional(),
  mobile: z.string().optional(),
  image: z.string().optional(),
  country: z.string().optional(),
  sponsor: idField.optional(),
  isBlocked: z.boolean().optional(),
  position: z.enum(["LEFT", "RIGHT"]).optional(),
  leftUser: idField.optional(),
  rightUser: idField.optional(),
});
export type UpdateUserByAdmin = z.infer<typeof updateUserByAdminSchema>;

export const updateUserByAdminValidate = zValidator(
  "json",
  updateUserByAdminSchema,
  (r, c: MyContext) => {
    const id = c.req.query("id");
    if (!id) c.set("id", c.get("user").id);
    if (!r.success) return validationError(r.error, c);
    c.set("updatedUser", {
      ...r.data,
    });
  },
);
const updateUserSchema = updateUserByAdminSchema.pick({
  name: true,
  email: true,
  mobile: true,
  image: true,
  country: true,
});

export type UpdateUser = z.infer<typeof updateUserSchema>;

export const updateUserValidate = zValidator(
  "json",
  updateUserSchema,

  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    const user = c.get("user");
    if (user.isActive)
      return c.json({
        success: false,
        message: "You can't update your profile after activation",
      });
    c.set("updatedUser", {
      ...r.data,
    });
  },
);

const bulkAdd = z.object({
  user: z.object({
    name: z.string().optional(),
    sponsor: idField,
    side: z.enum(["left", "right"]),
    country: z.string().optional().default(""),
    dialCode: z.string().optional().default(""),
    mobile: z.string().optional().default(""),
    email: emailField,
    password: z.string().min(6).default(""),
  }),
  count: z.number().gte(1),
});
export type BulkAdd = z.infer<typeof bulkAdd>;
export const bulkAddValidate = zValidator(
  "json",
  bulkAdd,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("bulkAdd", {
      ...r.data,
    });
  },
);

const treeListSidesSchema = z.object({
  side: z.enum(["left", "right", "full"]).default("full"),
  id: idField.optional(),
});

export const getTreeListValidate = zValidator(
  "query",
  treeListSidesSchema,
  async (r, c: MyContext) => {
    const { id: selfId } = c.get("user");
    if (!r.success) return validationError(r.error, c);

    if (r.data.id) {
      if (r.data.id === selfId) {
        c.set("id", r.data.id);
      } else {
        const isChildNode = await treeService.verifyChildNode(
          r.data.id,
          selfId,
        );

        if (isChildNode) {
          c.set("id", r.data.id);
        } else {
          return c.json(
            {
              success: false,
              message: "You don't have permission to view this node",
            },
            403,
          );
        }
      }
    } else {
      c.set("id", selfId);
    }

    c.set("side", r.data.side);
  },
);

const idActivateSchema = z.discriminatedUnion("deliveryMethod", [
  z.object({
    userId: idField,
    deliveryMethod: z.literal("self_collect"),
    address: z.number().optional(),
  }),
  z.object({
    userId: idField,
    deliveryMethod: z.literal("shipping"),
    address: z.number(),
  }),
]);

export type ActivateUserId = z.infer<typeof idActivateSchema>;

export const idActivateValidate = zValidator(
  "json",
  idActivateSchema,
  async (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);

    const user = c.get("user");
    const userId = user.id;
    const { deliveryMethod, address: addressId, userId: targetUserId } = r.data;

    // Handle shipping address validation
    if (deliveryMethod === "shipping") {
      if (!addressId) {
        return c.json(
          {
            success: false,
            message: "Shipping address is required.",
          },
          400,
        );
      }

      const address = await addressService.getAddressById(addressId);
      if (!address || address.userId !== targetUserId) {
        return c.json(
          {
            success: false,
            message: "Invalid or unauthorized shipping address.",
          },
          400,
        );
      }
    }

    // Self activation case
    if (userId === targetUserId) {
      if (user.isActive) {
        return c.json(
          {
            success: false,
            message: "Your ID is already activated.",
          },
          400,
        );
      }

      const userFromDb = await databaseService.fetchUserData(targetUserId);
      if (!userFromDb) {
        return c.json(
          {
            success: false,
            message: "User not found.",
          },
          404,
        );
      }

      if (userFromDb.isActive) {
        return c.json(
          {
            success: false,
            message: "Your ID is already activated.",
          },
          400,
        );
      }
    }

    // Activating someone else's ID — check permissions
    if (userId !== targetUserId) {
      const isChildNode = await treeService.verifyChildNode(
        targetUserId,
        userId,
      );
      if (!isChildNode) {
        return c.json(
          {
            success: false,
            message: "You don't have permission to activate this ID.",
          },
          403,
        );
      }
    }

    c.set("activateUserIdPayload", { ...r.data });
  },
);
