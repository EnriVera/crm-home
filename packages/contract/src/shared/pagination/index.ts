import { z } from "zod";

export const PageQuery = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
  search: z.string().optional(),
});
export type PageQuery = z.infer<typeof PageQuery>;

export const Page = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
    total: z.number().int().nonnegative().optional(),
  });
