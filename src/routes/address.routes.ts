import AddressController from "@/controller/AddressController";
import { authenticate } from "@/middleware/auth";
import {
  createAddressValidate,
  otherIdFromParamsValidate,
  updateAddressValidate,
} from "@/validation";
import { Hono } from "hono";

const router = new Hono()
  .use("*", authenticate)
  .post("/", createAddressValidate, AddressController.createAddress)
  .get("/", AddressController.getUserAddresses)
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
