import { z } from "zod";

const oracleRow = z
  .object({
    min: z.number().nullable().optional(),
    max: z.number().nullable().optional(),
    "<<": z.unknown().optional(),
    text: z.string().nullable().optional(),
    text2: z.string().nullable().optional(),
    text3: z.string().nullable().optional(),
    result: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  })
  .passthrough()
  .superRefine((row, ctx) => {
    if ((row.min === undefined) !== (row.max === undefined)) {
      ctx.addIssue({
        code: "custom",
        message: "oracle row must define both min and max",
      });
    }
    const hasResult =
      ["text", "text2", "text3", "result", "description"].some(
        (key) => typeof row[key] === "string",
      ) ||
      (row["<<"] && typeof row["<<"] === "object");
    if (!hasResult)
      ctx.addIssue({
        code: "custom",
        message: "oracle row must contain a result field",
      });
  });

const oracleEntry: z.ZodType = z.lazy(() =>
  z
    .object({
      name: z.string().optional(),
      type: z.enum(["oracle_collection", "oracle_rollable"]).optional(),
      oracle_type: z.string().optional(),
      contents: z.record(z.string(), oracleEntry).optional(),
      collections: z.record(z.string(), oracleEntry).optional(),
      rows: z.array(oracleRow).optional(),
    })
    .passthrough()
    .superRefine((entry, ctx) => {
      if (
        entry.type === "oracle_collection" &&
        !entry.contents &&
        !entry.collections
      )
        ctx.addIssue({
          code: "custom",
          message: "oracle collection must contain contents or collections",
        });
      if (entry.type === "oracle_rollable" && !entry.rows)
        ctx.addIssue({
          code: "custom",
          message: "rollable oracle must contain rows",
        });
    }),
);

export const DataswornData = z
  .object({
    _id: z.string(),
    datasworn_version: z.string(),
    type: z.string(),
    oracles: z.record(z.string(), oracleEntry),
  })
  .passthrough();

export function validateBundledData(data: unknown) {
  return DataswornData.safeParse(data);
}
