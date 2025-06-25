// use aiken/cbor
use aiken/collection/list
use cardano/address
use cardano/assets.{Value}
use cardano/transaction.{NoDatum, Output}
use utils.{is_inputs_within_outputs}

const test_policies =
  [
    (
      "policy1",
      #"abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
    ),
    (
      "policy2",
      #"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    ),
    (
      "policy3",
      #"fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
    ),
  ]

const test_tokens =
  [
    ("TokenA", #"546f6b656e41"), ("TokenB", #"546f6b656e42"),
    ("TokenC", #"546f6b656e43"),
  ]

// Mock script hash for transfer contract
const transfer_script_hash =
  #"abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab"

const transfer_address = address.from_script(transfer_script_hash)

// Helper functions to get values from dictionaries
fn get_policy(name) {
  expect Some((_, policy_id)) =
    test_policies |> list.find(fn((key, _)) { key == name })
  policy_id
}

fn get_token(name) {
  expect Some((_, token_hex)) =
    test_tokens |> list.find(fn((key, _)) { key == name })
  token_hex
}

fn make_output(value: Value) -> Output {
  Output {
    address: transfer_address,
    value,
    datum: NoDatum,
    reference_script: None,
  }
}

// Create test inputs - different tokens in different amounts
const inputs: List<Output> =
  [
    assets.from_asset(get_policy("policy1"), get_token("TokenA"), 100)
      |> assets.add(get_policy("policy2"), get_token("TokenB"), 50)
      |> assets.add(assets.ada_policy_id, assets.ada_asset_name, 2_000_000),
    assets.from_asset(get_policy("policy2"), get_token("TokenB"), 200)
      |> assets.add(get_policy("policy1"), get_token("TokenA"), 75)
      |> assets.add(assets.ada_policy_id, assets.ada_asset_name, 1_500_000)
      |> assets.add(get_policy("policy3"), get_token("TokenC"), 432),
  ]
    |> list.map(make_output)

// Create test outputs - redistributed tokens in different proportions
const outputs: List<Output> =
  [
    assets.from_asset(get_policy("policy1"), get_token("TokenA"), 10)
      |> assets.add(get_policy("policy1"), get_token("TokenA"), 30)
      |> assets.add(get_policy("policy2"), get_token("TokenB"), 80)
      |> assets.add(assets.ada_policy_id, assets.ada_asset_name, 1_200_000),
    assets.from_asset(get_policy("policy1"), get_token("TokenA"), 135)
      |> assets.add(get_policy("policy2"), get_token("TokenB"), 170)
      |> assets.add(assets.ada_policy_id, assets.ada_asset_name, 2_300_000),
    assets.from_asset(get_policy("policy3"), get_token("TokenC"), 432)
      |> assets.add(assets.ada_policy_id, assets.ada_asset_name, 1_100_000),
  ]
    |> list.map(make_output)

test check_inputs_within_outputs_1() {
  is_inputs_within_outputs(inputs, outputs)
}
