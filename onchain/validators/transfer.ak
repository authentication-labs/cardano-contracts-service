use aiken/collection/list
use aiken/crypto.{ScriptHash, VerificationKeyHash}
use aiken/primitive/bytearray
use cardano/address.{Script}
use cardano/assets
use cardano/transaction.{Output, OutputReference, Transaction}
use types.{AssetClass, TransferDatum, to_registry_datum, to_transfer_datum}
use utils.{expect_datum}

validator transfer(admin_token: AssetClass, registry_script: ScriptHash) {
  spend(
    datum: Option<TransferDatum>,
    _redeemer: Data,
    utxo: OutputReference,
    tx: Transaction,
  ) {
    let quantity_of =
      assets.quantity_of(_, admin_token.policyId, admin_token.assetName)
    expect Some(owner) = datum

    expect Some(own_input) =
      list.find(tx.inputs, fn(input) { input.output_reference == utxo })

    expect Script(own_script) = own_input.output.address.payment_credential

    let get_script_outputs =
      utils.get_script_outputs(_, own_script)

    let signed_by_owner = list.has(tx.extra_signatories, owner)

    let whitelist: List<VerificationKeyHash> =
      tx.reference_inputs
        |> list.map(fn(input) { input.output })
        |> list.filter(
            fn(output) {
              let qty = output.value |> quantity_of
              when output.address.payment_credential is {
                Script(script_hash) -> script_hash == registry_script && qty > 0
                _ -> False
              }
            },
          )
        |> list.flat_map(fn(o) { o |> expect_datum |> to_registry_datum })
        |> list.unique

    let owner_must_be_whitelisted: Bool = whitelist |> list.has(owner)

    let script_inputs =
      tx.inputs
        |> list.map(fn(i) { i.output })
        |> get_script_outputs

    let script_outputs = tx.outputs |> get_script_outputs

    let all_script_outputs_must_include_whitelisted_recepients =
      // Which is also assumes:
      // - outputs must have non-empty datum
      script_outputs
        |> list.all(
            fn(o) {
              let datum: TransferDatum = o |> expect_datum |> to_transfer_datum
              and {
                datum |> bytearray.is_empty() |> not,
                whitelist |> list.has(datum),
              }
            },
          )

    let tokens_never_leave_the_contract =
      utils.is_inputs_within_outputs(script_inputs, script_outputs)

    and {
      signed_by_owner?,
      owner_must_be_whitelisted?,
      all_script_outputs_must_include_whitelisted_recepients?,
      tokens_never_leave_the_contract?,
    }
  }

  else(_) {
    fail
  }
}
