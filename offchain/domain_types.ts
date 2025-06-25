import { Data } from "lucid";

export const AssetClass = Data.Object({
  policyId: Data.Bytes({ maxLength: 28 }),
  assetName: Data.Bytes(), // in text format
});
export type AssetClassT = typeof AssetClass;

export const RegistryDatum = Data.Array(Data.Bytes({ maxLength: 28 }));
export type RegistryDatumT = typeof RegistryDatum;

export const TransferDatum = Data.Bytes({ maxLength: 28 });
export type TransferDatumT = typeof TransferDatum;

