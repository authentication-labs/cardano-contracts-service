import { AddressDetails, Addresses } from "lucid";


export function isCredHash(hash: string): boolean {
  return /^[0-9a-fA-F]{56}$/.test(hash); // 28 bytes = 56 hex chars
}

export function inspectBech32Address(address: string): AddressDetails | undefined {
  try {
    return Addresses.inspect(address);
  } catch {
    return undefined;
  }
}
