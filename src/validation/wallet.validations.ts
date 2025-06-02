import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { MyContext } from "@/types";
import {
  transactionStatus,
  trasactionType,
  walletOperation,
} from "@/db/schema";
import {
  amountField,
  idField,
  limitField,
  offsetField,
  otpField,
  validationError,
} from "./_common";

const generateOtpSchema = z.object({
  walletoperations: z.enum(walletOperation).default("transfer"),
});

const verifyOtpSchema = generateOtpSchema.extend({
  otp: otpField,
});
export type VerifyWalletOtp = z.infer<typeof verifyOtpSchema>;
export const generateWalletOtpValidate = zValidator(
  "query",
  generateOtpSchema,
  (r, c: MyContext) => {
    if (!r.success) {
      return validationError(r.error, c);
    }
    c.set("walletOperation", r.data.walletoperations);
  },
);

export const verifyWalletOtpValidate = zValidator(
  "json",
  verifyOtpSchema,
  (r, c: MyContext) => {
    if (!r.success) {
      return validationError(r.error, c);
    }
    c.set("verifyWalletOtp", r.data);
  },
);

const transferAlpSchema = z.object({
  fromUserId: idField,
  toUserId: idField,
  amount: amountField,
  otp: otpField,
  description: z.string().min(10),
});

export type TrasferALPoints = z.infer<typeof transferAlpSchema>;

export const transferAlPointsValidate = zValidator(
  "json",
  transferAlpSchema,
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

const convertIncomeToAlpSchema = transferAlpSchema.pick({
  amount: true,
  otp: true,
});

export type ConvertIncomeToALP = z.infer<typeof convertIncomeToAlpSchema>;

export const convertIncomeToAlpValidate = zValidator(
  "json",
  convertIncomeToAlpSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("convertIncomeToAlp", { ...r.data });
  },
);

const adminAddAlpSchema = transferAlpSchema.pick({
  toUserId: true,
  amount: true,
  description: true,
});

export type AdminAddALP = z.infer<typeof adminAddAlpSchema>;

export const adminAddAlpValidate = zValidator(
  "json",
  adminAddAlpSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("adminAddAlpoints", { ...r.data });
  },
);

const ListingSchema = z.object({
  limit: limitField(100).optional(),
  offset: offsetField.optional(),
  type: z.enum(trasactionType).default("alpoints_transfer"),
  status: z.enum(transactionStatus).default("completed"),
  cursor: z.string(), // cursor for the id
});

export type TransactionListing = z.infer<typeof ListingSchema>;

export const transactionListingValidate = zValidator(
  "query",
  ListingSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("transactionListing", { ...r.data });
  },
);

export const multiIdsVaildate = zValidator(
  "json",
  z.object({
    ids: z.array(idField),
  }),

  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("ids", r.data.ids);
  },
);
