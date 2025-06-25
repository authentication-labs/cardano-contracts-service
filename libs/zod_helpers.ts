import z from "zod";

export function createEnumSchema<
    TListConst extends readonly string[], 
    TSchema extends z.ZodTypeAny
  >(list: TListConst, valueSchema: TSchema) {
  return z.object(
    Object.fromEntries(list.map((key) => [key, valueSchema])) as {
      [K in TListConst[number]]: typeof valueSchema;
    }
  );
}
