import {
  applyParamsToScript,
  Constr,
  Data,
  fromText,
  OutRef,
  Script,
  paymentCredentialOf,
} from "lucid";
import { getPlutusBlueprint } from "../common/blueprints.ts";
import { AssetClass, AssetClassT } from "../domain_types.ts";

// ============================================================================
// == Helpers

function getCompiledCode(blueprintTitle: string): string {
  const validator = getPlutusBlueprint(blueprintTitle);
  return validator.compiledCode;
}

function makeV3Script(
  scriptInstance: string,
): Script {
  return {
    type: "PlutusV3",
    script: scriptInstance,
  };
}

// ============================================================================
// == Type Definitions

const AdminTokenScriptParams = Data.Tuple([
  Data.Bytes(),
  Data.Bytes(),
]);
type AdminTokenScriptParamsT = typeof AdminTokenScriptParams;

const RegistryScriptParams = Data.Tuple([
  AssetClass,
  Data.Bytes(),
]);
type RegistryScriptParamsT = typeof RegistryScriptParams;

const TransferScriptParams = Data.Tuple([
  AssetClass,
  Data.Bytes(),
]);
type TransferScriptParamsT = typeof TransferScriptParams;


// ============================================================================
// == Main

export function buildDemoTokenPolicy(
  tokenName: string,
  outputReference: OutRef,
): Script {
  const compiledCode = getCompiledCode("demo_token.demo_token_policy.mint");
  const outRef = new Constr(0, [
    outputReference.txHash,
    BigInt(outputReference.outputIndex),
  ]);
  const appliedValidator = applyParamsToScript(
    [fromText(tokenName), outRef],
    compiledCode,
  );
  return makeV3Script(appliedValidator);
}

export function buildAdminTokenPolicy(
  tokenName: string,
  /** Admin address in bech32 format */
  adminAddr: string,
): Script {
  const compiledCode = getCompiledCode("admin_token_policy.admin_token_policy.mint");
  const adminAddrHash = paymentCredentialOf(adminAddr).hash;
  const appliedValidator = applyParamsToScript(
    [fromText(tokenName), adminAddrHash],
    compiledCode,
    AdminTokenScriptParams as unknown as AdminTokenScriptParamsT,
  );
  return makeV3Script(appliedValidator);
}

export function buildRegistryValidator(
  admin_token: AssetClassT,
  /** Admin address in bech32 format */
  adminAddr: string,
): Script {
  const compiledCode = getCompiledCode("registry.registry.spend");
  const adminAddrHash = paymentCredentialOf(adminAddr).hash;
  const appliedValidator = applyParamsToScript(
    [admin_token, adminAddrHash],
    compiledCode,
    RegistryScriptParams as unknown as RegistryScriptParamsT,
  );
  return makeV3Script(appliedValidator);
}

export function buildTransferValidator(
  admin_token: AssetClassT,
  registry_script_hash: string,
): Script {
  const compiledCode = getCompiledCode("transfer.transfer.spend");
  const appliedValidator = applyParamsToScript(
    [admin_token, registry_script_hash],
    compiledCode,
    TransferScriptParams as unknown as TransferScriptParamsT,
  );
  return makeV3Script(appliedValidator);
}
