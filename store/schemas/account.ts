import { z } from "zod";
import { storeSchema } from "./common.ts";


const CredentialSchema = z.union([
  z.object({
    type: z.literal("Key"),
    hash: z.string(),
  }),
  z.object({
    type: z.literal("Script"),
    hash: z.string(),
  }),
]);

// see: import { KeyDetails } from "lucid";
const KeyDetailsSchema = z.object({
  privateKey: z.string(),
  publicKey: z.string(),
  credential: CredentialSchema,
});

export const AccountItemSchema = z.object({
  timestamp: z.string().transform((str: string) => new Date(str)),
  name: z.string().optional(),
  dscription: z.string().optional(),
  account: z.object({
    address: z.string(),
    details: KeyDetailsSchema,
    seedPhrase: z.string().optional()
  })
});
export type AccountItem = z.infer<typeof AccountItemSchema>;

export const AccountsStoreSchema = storeSchema(AccountItemSchema);
export type AccountsStore = z.infer<typeof AccountsStoreSchema>;
