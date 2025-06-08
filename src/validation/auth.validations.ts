import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { otpField, validationError, idField, emailField } from "./_common";
import { databaseService } from "@/lib/services";

export const RegisterSchema = z
  .object({
    name: z.string().nonempty(),
    mobile: z.string(),
    email: emailField,
    otp: otpField,
    password: z.string().min(6),
    passwordConfirm: z.string().min(6).optional(),
    country: z.string().default("global"),
    dialCode: z.string().max(4).default("+91"),
    sponsor: idField,
    side: z
      .enum(["left", "right"], {
        error: () => "Position must be either left or right",
      })
      .default("left"),
  })
  .strict()
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords don't match",
    path: ["passwordConfirm"],
  });

export type RegisterUser = z.infer<typeof RegisterSchema>;
export const registerValidate = zValidator("json", RegisterSchema, (r, c) => {
  if (!r.success) return validationError(r.error, c);
  c.set("registerUser", {
    ...r.data,
  });
});

export const loginValidate = zValidator(
  "json",
  z.object({
    id: idField,
    password: z.string().min(6),
  }),
  (r, c) => {
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
  async (r, c) => {
    if (!r.success) return validationError(r.error, c);
    const userId = r.data.id;
    const user = await databaseService.fetchUserData(userId);
    if (!user) {
      return c.json(
        {
          success: false,
          message: `There exists no such user with the ID ${userId}`,
        },
        404,
      );
    }

    c.set("user", user);
  },
);

export const getSponserDetailValidate = zValidator(
  "query",
  idFieldValidateSchema,
  (r, c) => {
    console.log(JSON.stringify(r));
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
  (r, c) => {
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
  async (r, c) => {
    if (!r.success) return validationError(r.error, c);
    const id = r.data.id;
    const user = await databaseService.fetchUserData(id);
    if (!user)
      return c.json(
        {
          success: false,
          message: `There exists no such user with the ID ${id}`,
        },
        404,
      );

    c.set("user", user);
    c.set("resetPassword", {
      ...r.data,
    });
  },
);
