import { fromHex, Lucid, Script, toHex } from "lucid";
import * as cbor from "cbor";

import plutusBlueprint from "../../onchain/plutus.json" with {
  type: "json",
};

export function getPlutusBlueprint(title: string) {
  const validator = plutusBlueprint.validators.find((v) => v.title === title);
  if (!validator) {
    throw new Error(`Validator ${title} not present in plutus.json`);
  }
  return validator;
}

export function readValidator(title: string): Script {
  const validator = getPlutusBlueprint(title);
  return {
    type: "PlutusV3",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}

export function getValidatorAddrBech32(lucid: Lucid, title: string) {
  const alwaysFailValidator = readValidator(title);
  return lucid.utils.scriptToAddress(
    alwaysFailValidator,
  );
}
