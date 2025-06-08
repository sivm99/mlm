import { z } from "zod/v4";
import { zValidator } from "@hono/zod-validator";

import {
  transactionStatus,
  transactionType,
  walletOperation,
  walletType,
} from "@/db/schema";
import {
  amountField,
  baseListing,
  idField,
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
  (r, c) => {
    if (!r.success) {
      return validationError(r.error, c);
    }
    c.set("walletOperation", r.data.walletoperations);
  },
);

export const verifyWalletOtpValidate = zValidator(
  "json",
  verifyOtpSchema,
  (r, c) => {
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
  (r, c) => {
    if (!r.success) {
      return validationError(r.error, c);
    }

    const user = c.get("user");

    // Start with validated data
    let validatedData: TrasferALPoints = r.data;

    // Inject fromUserId if not admin
    if (user.role !== "admin") {
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
  (r, c) => {
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
  (r, c) => {
    if (!r.success) return validationError(r.error, c);
    c.set("adminAddAlpoints", { ...r.data });
  },
);

const walletTypeEnum = z.enum(walletType);
const transactionStatusEnum = z.enum(transactionStatus);
const transactionTypeEnum = z.enum(transactionType);
const ListingSchema = baseListing.extend({
  userId: idField.optional(),
  toUserId: idField.optional(),
  fromUserId: idField.optional(),

  startDate: z.date().optional(),
  endDate: z.date().optional(),
  minAmount: z.number().int().optional(),
  maxAmount: z.number().int().optional(),

  fromWalletType: walletTypeEnum.optional(),
  toWalletType: walletTypeEnum.optional(),
  status: transactionStatusEnum.optional(),
  type: transactionTypeEnum.optional(),
});

export type TransactionListing = z.infer<typeof ListingSchema>;

export const transactionListingValidate = zValidator(
  "query",
  ListingSchema,
  (r, c) => {
    if (!r.success) return validationError(r.error, c);
    c.set("transactionListing", { ...r.data });
  },
);

export const multiIdsVaildate = zValidator(
  "json",
  z.object({
    ids: z.array(idField),
  }),

  (r, c) => {
    if (!r.success) return validationError(r.error, c);
    c.set("ids", r.data.ids);
  },
);
