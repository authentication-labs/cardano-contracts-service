import { Data, Lucid, OutRef, Script, TxComplete, paymentCredentialOf } from "lucid";
import { getValidatorAddrBech32 } from "../common/blueprints.ts";
// import { AssetClassT } from "../domain_types.ts";
// import { selectWallet } from "../common/wallet.ts";
// import { buildAdminTokenPolicy, buildRegistryValidator, buildTransferValidator } from "./build.ts";

// ============================================================================
// == Helpers

export function makeDeployTx(
  lucid: Lucid,
  validator: Script,
): Promise<TxComplete> {
  const alwaysFailAddressBech32 = getValidatorAddrBech32(
    lucid,
    "always_fail.always_fail.else",
  );
  return lucid
    .newTx()
    .payToContract(
      alwaysFailAddressBech32,
      { Inline: Data.void(), scriptRef: validator },
      { lovelace: 2_000_000n },
    )
    .commit();
}

// ToDo. See offchain/common/scripts.ts. Possible dups.
/// Returns payment credential of validator, sitting at OTxO, specified by OutRef
export async function getScriptRefValidatorPaymentCreds(
  lucid: Lucid,
  outRef: OutRef,
): Promise<string> {
  const [utxo] = await lucid.utxosByOutRef([outRef]);

  const validator = utxo.scriptRef;
  if (!validator) {
    throw Error("Could not read validator from ref UTxO");
  }

  const validatorAddressBech32 = lucid.utils.scriptToAddress(validator);
  const scriptAddress =
    paymentCredentialOf(validatorAddressBech32).hash;
  return scriptAddress;
}


// ============================================================================
// == Module Exports

// export class Deployer {
//   constructor(
//     private lucid: Lucid
//   ) { }

//   async deployAdminTokenPolicy(
//     fundId: string,
//     adminAddr: string,
//   ): Promise<TxComplete> {
//     const validator = buildAdminTokenPolicy(fundId, adminAddr);
//     return await makeDeployTx(this.lucid, validator);
//   }

//   async deployRegistryValidator(
//     admin_token: AssetClassT,
//     adminAddr: string,
//   ): Promise<TxComplete> {
//     const validator = buildRegistryValidator(
//       admin_token,
//       adminAddr,
//     );

//     return await makeDeployTx(this.lucid, validator);
//   }

//   async deployTransferValidator(
//     admin_token: AssetClassT,
//     registryOutRef: OutRef,
//   ): Promise<TxComplete> {
//     const registry_validator_addr = await getScriptRefValidadorPaymentCreds(
//       this.lucid,
//       registryOutRef,
//     );
//     const validator = buildTransferValidator(
//       admin_token,
//       registry_validator_addr,
//     );

//     return await makeDeployTx(this.lucid, validator);
//   }

// }

