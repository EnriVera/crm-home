import { oc } from "@orpc/contract";
import { z } from "zod";

export const healthOutputSchema = z.object({
  status: z.literal("ok"),
  // ISO 8601
  timestamp: z.string(),
});

export const healthContract = oc.output(healthOutputSchema);

export type HealthOutput = z.infer<typeof healthOutputSchema>;
