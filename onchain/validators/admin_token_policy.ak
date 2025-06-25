use aiken/collection/dict
use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/assets.{AssetName, PolicyId}
use cardano/transaction.{Transaction}

validator admin_token_policy(
  // in Hex
  token_name: AssetName,
  admin: VerificationKeyHash,
) {
  mint(_redeemer: Data, policy_id: PolicyId, transaction: Transaction) {
    let Transaction { mint, .. } = transaction
    expect [Pair(asset_name, _amount)] =
      mint
        |> assets.tokens(policy_id)
        |> dict.to_pairs()

    trace @"token_name": token_name
    trace @"asset_name": asset_name

    let must_be_signed = list.has(transaction.extra_signatories, admin)
    and {
      must_be_signed?,
      (asset_name == token_name)?,
    }
  }

  else(_) {
    fail
  }
}
