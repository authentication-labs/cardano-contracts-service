import { createLucid } from "../offchain/common/wallet.ts";

const addr = Deno.args[0];

const lucid = await createLucid();
const utxos = await lucid.utxosAt(addr);
console.log("UTXOs at address:", addr);
console.log(utxos);
