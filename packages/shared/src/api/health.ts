import { z } from "zod";

export const DependencyStatus = z.enum(["up", "down", "not_configured"]);
export type DependencyStatus = z.infer<typeof DependencyStatus>;

/** `GET /health` payload. Never includes secrets or detailed version information. */
export const HealthSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  service: z.literal("api"),
  commit: z.string().max(12).optional(),
  uptimeSeconds: z.number().nonnegative(),
  dependencies: z.object({
    database: DependencyStatus,
    redis: DependencyStatus,
  }),
});
export type Health = z.infer<typeof HealthSchema>;
