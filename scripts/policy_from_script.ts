import { Script } from "lucid";
import { stores } from "../store/mod.ts";
import { createLucid } from "../offchain/common/wallet.ts";

await stores.loadAll();

const deployment = stores.deploymentsStore.data[0];

const script: Script = deployment.scripts.AdminToken;

const lucid = await createLucid();

console.log(`Network: ${lucid.network}`);

const scriptUtil = lucid.newScript(script);
const policyId = scriptUtil.toHash();

console.log(`Policy ID: ${policyId}`);