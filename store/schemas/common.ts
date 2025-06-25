import { z } from "zod";
import { AssetClassT } from "../../offchain/domain_types.ts";
import { fromHex, fromText, toText } from "lucid";

export const Networks = ['Mainnet', 'Preprod', 'Preview'] as const;
export const NetworkSchema = z.enum(Networks);
export type Network = z.infer<typeof NetworkSchema>;

export function storeSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  const arraySchema = z.array(itemSchema);
  const shape = Object.fromEntries(
    Networks.map((network) => [network, arraySchema])
  ) as Record<Network, typeof arraySchema>;

  return z.object(shape);
}

export const OutRefSchema = z.object({
  txHash: z.string(),
  outputIndex: z.number()
});

export type OutRef = z.infer<typeof OutRefSchema>;

export const AssetClassSchema = z.object({
  policy: z.string(),
  name: z.string()
});

export type AssetClass = z.infer<typeof AssetClassSchema>;

export type Store<TItem> = {
  [K in Network]: TItem[]
}

export function toLucidAsset(storeAsset: AssetClass): AssetClassT {
  return {
    policyId: storeAsset.policy,
    assetName: fromText(storeAsset.name)
  }
}

export function toStoreAsset(lucidAsset: AssetClassT): AssetClass {
  return {
    policy: lucidAsset.policyId,
    name: toText(lucidAsset.assetName)
  }
}
