import { addressController } from "@/controller";
import { authenticate } from "@/middleware/auth";
import {
  createAddressValidate,
  otherIdFromParamsValidate,
  updateAddressValidate,
  userIdFromQueryValidate,
} from "@/validation";
import { Hono } from "hono";

const router = new Hono()
  .use("*", authenticate)
  .post("/", createAddressValidate, addressController.createAddress)
  .get("/:userId", userIdFromQueryValidate, addressController.getUserAddresses)
  .get("/:id", otherIdFromParamsValidate, addressController.getAddressById)
  .patch(
    "/:id",
    otherIdFromParamsValidate,
    updateAddressValidate,
    addressController.updateAddressById,
  )
  .delete(
    "/:id",
    otherIdFromParamsValidate,
    addressController.deleteAddressById,
  );
// .get("/:id", otherIdFromParamsValidate, AddressController.getAddress);

export default router;
