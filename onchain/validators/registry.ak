use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/transaction.{OutputReference, Transaction}
use types.{AssetClass, RegistryDatum}

validator registry(_admin_token: AssetClass, admin: VerificationKeyHash) {
  spend(
    _datum: Option<RegistryDatum>,
    _redeemer: Data,
    _utxo: OutputReference,
    tx: Transaction,
  ) {
    trace @"admin": admin
    trace @"extra_signatories": tx.extra_signatories

    let signed_by_admin = list.has(tx.extra_signatories, admin)

    signed_by_admin?
  }

  else(_) {
    fail
  }
}
