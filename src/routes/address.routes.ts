import AddressController from "@/controller/AddressController";
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
  .post("/", createAddressValidate, AddressController.createAddress)
  .get("/", userIdFromQueryValidate, AddressController.getUserAddresses)
  .get("/:id", otherIdFromParamsValidate, AddressController.getAddress)
  .patch(
    "/:id",
    otherIdFromParamsValidate,
    updateAddressValidate,
    AddressController.updateAddress,
  )
  .delete("/:id", otherIdFromParamsValidate, AddressController.deleteAddress);
// .get("/:id", otherIdFromParamsValidate, AddressController.getAddress);

export default router;
