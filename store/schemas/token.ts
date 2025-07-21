import { z } from "zod";
import { AssetClassSchema, storeSchema } from "./common.ts";

export const TokenItemSchema = z.object({
  timestamp: z.string().transform((str: string) => new Date(str)),
  fundId: z.string().describe('Fund ID this token belongs to').optional(),
  tokenContractAddr: z.string().describe('Token contract address in Bech32 format').optional(),
  description: z.string().optional(),
  asset: AssetClassSchema
});
export type TokenItem = z.infer<typeof TokenItemSchema>;

export const TokensStoreSchema = storeSchema(TokenItemSchema);
export type TokensStore = z.infer<typeof TokensStoreSchema>;
