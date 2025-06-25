import { KeyDetails, Crypto, Addresses, Network } from "lucid";

function generateAccount(network: Network): { address: string; details: KeyDetails, seedPhrase: string } {
  const seedPhrase = Crypto.generateSeed();
  const details = Crypto.seedToDetails(seedPhrase, 0, "Payment");
  const address = Addresses.credentialToAddress(network, details.credential);
  return { address, details, seedPhrase };
}

const acc = generateAccount("Preview");
console.log("Generated Account:", acc);


const creds = Addresses.addressToCredential(acc.address);

console.log("Credential:", creds);