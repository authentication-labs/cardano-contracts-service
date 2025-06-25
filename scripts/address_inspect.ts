import { inspectBech32Address, isCredHash } from "../offchain/common/addresses.ts";


const addrs: Array<[string, string]> = [
  ["bech32Address", "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgse35a3x"],
  ["credentialHash", "019493315cd92eb5d8c4304e67b7e16ae36d61d34502694657811a2c8e32c728d3861e164cab28cb8f006448139c8f1740ffb8e7aa9e5232dc"],
  ["addr1-bech", "addr_test1vzzmdyp768tpspema5q7wfq0l9ag0894umsgpa6d5yreklqu4dckk"],
  ["addr1-pubkey", "3bd238b6cd7a2b1c9b926064cde840a744d2661dd2bef1dc05ffb5fade461add"],
  ["addr1-credhash", "85b6903ed1d618073bed01e7240ff97a879cb5e6e080f74da1079b7c"]
];


for (const [label, address] of addrs) {
  const bech32 = inspectBech32Address(address);
  if (bech32) {
    console.log(`${label} is a valid Bech32 address:`, bech32);
  } else if (isCredHash(address)) {
    console.log(`${label} is a valid credential hash. ${address}`);
  } else {
    console.log(`${label} is not a valid Bech32 address or credential hash. ${address}`);
  }
  console.log("-------------------------------");
}
