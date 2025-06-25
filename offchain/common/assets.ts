import { AssetClassT } from "../../offchain/domain_types.ts";
import * as lucid from "lucid";

// Name in asset is expected to be in Hex format.
export const assetToUnit = (asset: AssetClassT): string => lucid.toUnit(asset.policyId, asset.assetName);

export const fromUnitToAsset = (unit: string): AssetClassT => {
  const { policyId, assetName } = lucid.fromUnit(unit);
  if (!policyId || assetName === null) {
    throw new Error(`Invalid unit format: ${unit}`);
  }
  // name will be returned in Hex.
  return {
    policyId,
    assetName,
  };
};
