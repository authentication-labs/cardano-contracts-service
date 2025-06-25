import { OutRef } from "lucid";

export function parseOutRef(outRefString: string): OutRef {
  const parts = outRefString.split("#");
  if (parts.length !== 2) {
    throw new Error(`Invalid OutRef format: ${outRefString}. Expected format: txHash#outputIndex`);
  }
  
  const [txHash, outputIndexStr] = parts;
  const outputIndex = parseInt(outputIndexStr, 10);
  
  if (isNaN(outputIndex) || outputIndex < 0) {
    throw new Error(`Invalid output index: ${outputIndexStr}. Must be a non-negative integer`);
  }
  
  return {
    txHash,
    outputIndex,
  };
}
