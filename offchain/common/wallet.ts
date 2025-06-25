import { Blockfrost, Lucid, Network, TxComplete } from "lucid";
import { checkEnvVars } from "../../libs/env.ts";

function getCExplorerLink(network: Network, txHash: string): string {
  const baseUrls: { [key in "Mainnet" | "Preprod" | "Preview"] : string } = {
    Mainnet: "https://cexplorer.io",
    Preprod: "https://preprod.cexplorer.io",
    Preview: "https://preview.cexplorer.io",
  }

  const baseUrl = baseUrls[network as "Mainnet" | "Preprod" | "Preview"];
  return `${baseUrl}/tx/${txHash}`;
}

export async function createLucid() {
  const envVarNames = [
    "BLOCKFROST_URL",
    "LUCID_NETWORK",
    "BLOCKFROST_PROJECT_ID",
  ] as const;
  const env = checkEnvVars(envVarNames);
  const lucid = await new Lucid({
    provider: new Blockfrost(
      env.BLOCKFROST_URL,
      env.BLOCKFROST_PROJECT_ID,
    ),
    network: env.LUCID_NETWORK as Network,
  });
  return lucid;
}

export async function selectWallet(): Promise<Lucid> {
  const lucid = await createLucid();
  const env = checkEnvVars(["WALLET_SEED"]);
  lucid.selectWalletFromSeed(env.WALLET_SEED);
  return lucid;
}

export async function signAndSubmit(
  lucid: Lucid,
  tx: TxComplete,
): Promise<string> {
  console.log(`Submitting transaction ... ${getCExplorerLink(lucid.network, tx.toHash())}`);
  const txSigned = await tx.sign().commit();
  console.log("Signed");
  const txHash = await txSigned.submit();
  console.log(`Submitted ${txHash}`);
  console.log("Waiting for transaction to be confirmed...");
  const success = await lucid.awaitTx(txHash);
  console.log(`Success: ${success}`);
  return txHash;
}
