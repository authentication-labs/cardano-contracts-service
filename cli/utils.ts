import { fromUnitToAsset } from "../offchain/common/assets.ts";
import { toStoreAsset } from "../store/schemas/common.ts";

export function viewUnit(unit: string): string {
  if (unit === 'lovelace') {
    return unit;
  }

  const asset = toStoreAsset(fromUnitToAsset(unit));
  return `${asset.policy}:${asset.name}`;
}
