use aiken/collection/dict
use aiken/collection/list
use aiken/crypto.{ScriptHash}
use cardano/address.{Script}
use cardano/assets.{Value}
use cardano/transaction.{InlineDatum, Output}

pub fn get_datum(output: Output) -> Option<Data> {
  when output.datum is {
    InlineDatum(inline) -> Some(inline)
    _ -> None
  }
}

pub fn expect_datum(output: Output) -> Data {
  expect InlineDatum(datum) = output.datum
  datum
}

pub fn get_script_outputs(
  outputs: List<Output>,
  own_script: ScriptHash,
) -> List<Output> {
  outputs
    |> list.filter(
        fn(output) {
          when output.address.payment_credential is {
            Script(script_hash) -> script_hash == own_script
            _ -> False
          }
        },
      )
}

// Collects all tokens from the outputs, excluding ADA.
pub fn collect_tokens(outputs: List<Output>) -> Value {
  outputs
    |> list.foldr(
        assets.zero,
        fn(output, acc) {
          assets.merge(acc, assets.without_lovelace(output.value))
        },
      )
}

// The input tokens must be fully covered by the outputs — tokens (except ADA) shouldn't leave the contract.
pub fn is_inputs_within_outputs(
  inputs: List<Output>,
  outputs: List<Output>,
) -> Bool {
  let input_val = collect_tokens(inputs)
  let output_val = collect_tokens(outputs)

  trace @"input_val": input_val
  trace @"output_val": output_val
  input_val
    |> assets.to_dict
    |> dict.to_pairs
    |> list.all(
        fn(Pair(policy_id, asset_map)) {
          asset_map
            |> dict.to_pairs
            |> list.all(
                fn(Pair(asset_name, input_amount)) {
                  let output_amount =
                    output_val
                      |> assets.quantity_of(policy_id, asset_name)
                  input_amount <= output_amount
                },
              )
        },
      )
}
