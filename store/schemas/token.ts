import { z } from "zod";
import { AssetClassSchema, storeSchema } from "./common.ts";

export const TokenItemSchema = z.object({
  timestamp: z.string().transform((str: string) => new Date(str)),
  description: z.string().optional(),
  asset: AssetClassSchema
});
export type TokenItem = z.infer<typeof TokenItemSchema>;

export const TokensStoreSchema = storeSchema(TokenItemSchema);
export type TokensStore = z.infer<typeof TokensStoreSchema>;
