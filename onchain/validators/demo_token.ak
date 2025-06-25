// use aiken/cbor
use aiken/collection/dict
use aiken/collection/list
use cardano/assets.{AssetName, PolicyId}
use cardano/transaction.{OutputReference, Transaction}

// token_name in Hex
validator demo_token_policy(token_name: AssetName, utxo_ref: OutputReference) {
  mint(_redeemer: Data, policy_id: PolicyId, transaction: Transaction) {
    let Transaction { inputs, mint, .. } = transaction
    expect [Pair(asset_name, _amount)] =
      mint
        |> assets.tokens(policy_id)
        |> dict.to_pairs()

    let must_spend_utxo_from_script_parameter =
      inputs
        |> list.any(fn(input) { input.output_reference == utxo_ref })
    and {
      must_spend_utxo_from_script_parameter?,
      (asset_name == token_name)?,
    }
  }

  else(_) {
    fail
  }
}
