import { fromText } from "lucid";
import { AssetClassT } from "../offchain/domain_types.ts";

export function assetFromUnitTxt(unitTxt: string): AssetClassT {
  const parts = unitTxt.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid asset format: ${unitTxt}. Expected "policyId:assetName".`);
  }
  const policyId = parts[0];
  const assetName = fromText(parts[1]); // hex
  return { policyId, assetName };
}