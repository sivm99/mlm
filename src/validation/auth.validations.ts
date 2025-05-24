import { MyContext } from "@/types";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { emailField, idField, validationError } from ".";

// only allow numbers here in the otp
export const otpField = z.string().length(6);
export const registerSchema = z
  .object({
    name: z.string().nonempty(),
    mobile: z.string(),
    email: emailField,
    otp: otpField,
    referralCode: z.string().optional(),
    password: z.string().min(6),
    passwordConfirm: z.string().min(6).optional(),
    country: z.string().default("global"),
    dialCode: z.string().max(4).default("+91"),
    sponsor: idField,
    position: z
      .enum(["LEFT", "RIGHT"], {
        errorMap: () => ({
          message: "Position must be either LEFT or RIGHT",
        }),
      })
      .default("LEFT"),
  })
  .strict()
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords don't match",
    path: ["passwordConfirm"],
  });

export type RegisterUser = z.infer<typeof registerSchema>;
export const registerValidate = zValidator(
  "json",
  registerSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("registerUser", {
      ...r.data,
    });
  },
);

export const loginValidate = zValidator(
  "json",
  z.object({
    id: idField,
    password: z.string().min(6),
  }),
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("loginUser", {
      ...r.data,
    });
  },
);

const idFieldValidateSchema = z.object({
  id: idField,
});

export const forgotPasswordValidate = zValidator(
  "json",
  idFieldValidateSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("id", r.data.id);
  },
);

export const getSponserDetailValidate = zValidator(
  "query",
  idFieldValidateSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("id", r.data.id);
  },
);

const otpEmailSchema = z.object({
  email: emailField,
});

export type OTPEmail = z.infer<typeof otpEmailSchema>;
export const getVerifyEmailOtpValidate = zValidator(
  "query",
  otpEmailSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("otpEmail", {
      ...r.data,
    });
  },
);
const resetPasswordSchema = z
  .object({
    id: idField,
    otp: z.string().length(6).regex(/\d/),
    newPassword: z.string().min(6),
    newPasswordConfirm: z.string().min(6),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: "Passwords don't match",
    path: ["newPasswordConfirm"],
  });

export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export const resetPasswordValidate = zValidator(
  "json",
  resetPasswordSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error, c);
    c.set("resetPassword", {
      ...r.data,
    });
  },
);
