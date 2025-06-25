import { Addresses, Credential, Lucid, OutRef, paymentCredentialOf, Script, Utxo } from "lucid";

export type DeployedScript = {
  creds: Credential;
  address: string;
  script: Script
} & (
    {
      kind: "deployed",
      outRef: OutRef;
      refUtxo: Utxo;
    } | {
      kind: "inline",
    }
  )

export class ScriptUtil {
  constructor(
    private lucid: Lucid
  ) { }

  fromInline(script: Script): DeployedScript {
    const address = Addresses.scriptToAddress(this.lucid.network, script);
    const creds = Addresses.scriptToCredential(script);
    return {
      kind: "inline",
      creds,
      address,
      script,
    }
  }

  async fromOutRef(outRef: OutRef): Promise<DeployedScript> {
    const utxos = await this.lucid.utxosByOutRef([outRef]);

    if (utxos.length === 0) {
      throw new Error(`No UTxOs found for outRef: ${outRef.txHash}#${outRef.outputIndex}`);
    }

    const scriptUtxo = utxos[0];
    const validator = scriptUtxo.scriptRef;
    if (!validator) {
      throw Error("Could not read validator from ref UTxO");
    }

    const validatorAddressBech32 = this.lucid.utils.scriptToAddress(validator);
    const scriptCreds = paymentCredentialOf(validatorAddressBech32);

    const address = Addresses.credentialToAddress(this.lucid.network, scriptCreds);

    return {
      kind: "deployed",
      creds: scriptCreds,
      address,
      outRef,
      refUtxo: scriptUtxo,
      get script(): Script {
        if (!this.refUtxo.scriptRef) {
          throw new Error("No script reference found in the UTxO");
        }
        return this.refUtxo.scriptRef
      }
    }
  }
}
