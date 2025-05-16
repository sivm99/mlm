import { MyContext } from "@/types";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { emailField, idField, validationError } from ".";

export const registerSchema = z
  .object({
    name: z.string().nonempty(),
    mobile: z.string(),
    email: emailField,
    otp: z.string().optional(),
    password: z.string().min(6),
    country: z.string(),
    dialCode: z.string(),
    sponsor: z
      .string()
      .length(10, "sponsor must be a valid id")
      .transform((s) => s.toUpperCase()),
    position: z
      .enum(["LEFT", "RIGHT"], {
        errorMap: () => ({
          message: "Position must be either LEFT or RIGHT",
        }),
      })
      .default("LEFT"),
  })
  .strict();

export type RegisterUser = z.infer<typeof registerSchema>;
export const registerValidate = zValidator(
  "json",
  registerSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error.issues, c);
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
    if (!r.success) return validationError(r.error.issues, c);
    c.set("loginUser", {
      ...r.data,
    });
  },
);

const forgetPasswordSchema = z.object({
  id: idField,
});

export const forgetPasswordValidate = zValidator(
  "json",
  forgetPasswordSchema,
  (r, c: MyContext) => {
    if (!r.success) return validationError(r.error.issues, c);
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
    if (!r.success) return validationError(r.error.issues, c);
    c.set("otpEmail", {
      ...r.data,
    });
  },
);
const resetPasswordSchema = z
  .object({
    id: idField,
    email: emailField,
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
    if (!r.success) return validationError(r.error.issues, c);
    c.set("resetPassword", {
      ...r.data,
    });
  },
);
