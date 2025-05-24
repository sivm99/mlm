import { z } from "zod";
import { idField } from "./user.validation";
import { otpField, validationError } from ".";
import { zValidator } from "@hono/zod-validator";
import { MyContext } from "@/types";

export const amountField = z.number().gt(0);
const transferAlPointsSchema = z.object({
  fromUserId: idField,
  toUserId: idField,
  amount: amountField,
  otp: otpField,
  description: z.string().min(10),
});

export type TrasferALPoints = z.infer<typeof transferAlPointsSchema>;

export const transferAlPointsValidate = zValidator(
  "json",
  transferAlPointsSchema,
  (r, c: MyContext) => {
    if (!r.success) {
      return validationError(r.error, c);
    }

    const user = c.get("user");

    // Start with validated data
    let validatedData: TrasferALPoints = r.data;

    // Inject fromUserId if not admin
    if (user.role !== "ADMIN") {
      validatedData = {
        ...validatedData,
        fromUserId: user.id,
      };
    }

    c.set("transferAlPoints", validatedData);
  },
);

const convertIncomeToAlpSchema = z.object({
  amount: amountField,
  otp: otpField,
});

export const convertIncomeToAlpValidate = zValidator(
  "json",
  convertIncomeToAlpSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("convertIncomeToAlp", { ...r.data });
  },
);
