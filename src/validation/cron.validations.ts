import { cronJobName } from "@/lib/jobs/cron-job-service";

import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { validationError } from "./_common";

const jobNameField = z.enum(cronJobName);

const triggerJobSchema = z.object({
  job: jobNameField,
});

export type TriggerJobSchema = z.infer<typeof triggerJobSchema>;

export const triggerJobValidate = zValidator(
  "param",
  triggerJobSchema,
  (r, c) => {
    if (!r.success) return validationError(r.error, c);
  },
);
