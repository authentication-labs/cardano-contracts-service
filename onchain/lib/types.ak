use aiken/crypto.{VerificationKeyHash}
use cardano/assets.{AssetName, PolicyId}

pub type AssetClass {
  policyId: PolicyId,
  // AssetName - hex
  assetName: AssetName,
}

// Fund Members
pub type RegistryDatum =
  List<VerificationKeyHash>

// An Owner Address
pub type TransferDatum =
  VerificationKeyHash

pub fn to_registry_datum(data: Data) -> RegistryDatum {
  expect result: RegistryDatum = data
  result
}

pub fn to_transfer_datum(data: Data) -> TransferDatum {
  expect result: TransferDatum = data
  result
}
