import { MyContext } from "@/types";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const registerSchema = z
  .object({
    name: z.string(),
    mobile: z.string(),
    email: z.string().email(),
    password: z.string().min(6),
    country: z.string(),
    dialCode: z.string(),
    sponsor: z.string(),
    position: z.enum(["LEFT", "RIGHT"], {
      errorMap: () => ({
        message: "Position must be either LEFT or RIGHT",
      }),
    }),
  })
  .strict();

export type RegisterUser = z.infer<typeof registerSchema>;
export const registerValidate = zValidator(
  "json",
  z.array(registerSchema).length(1, {
    message: "Registration must contain exactly one user",
  }),
  (r, c: MyContext) => {
    if (!r.success)
      return c.json({
        success: false,
        message: "Validation Failed",
        errors: r.error.issues.map((i) => i.message),
      });

    c.set("registerUsers", {
      ...r.data,
    });
  },
);

export const loginValidate = zValidator(
  "json",
  z.object({
    username: z.string(),
    password: z.string().min(6),
  }),
  (r, c: MyContext) => {
    if (!r.success)
      return c.json({
        success: false,
        message: "Validation Failed",
        errors: r.error.issues.map((i) => i.message),
      });

    c.set("loginUser", {
      ...r.data,
    });
  },
);
