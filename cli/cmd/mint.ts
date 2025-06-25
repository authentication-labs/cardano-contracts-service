import { Command } from "npm:commander";
import { Data, fromText, OutRef, Script, toUnit } from "lucid";
import { buildDemoTokenPolicy } from "../../offchain/validators/build.ts";
import { createLucid, signAndSubmit } from "../../offchain/common/wallet.ts";
import { stores } from "../../store/mod.ts";

async function executeMint(params: {
  walletAddr: string; // Bech32 or alias
  tokenName: string;
  amount: string;
  dry?: boolean;
}): Promise<void> {
  await stores.loadAll();
  console.log('Starting mint operation...');
  console.log('Parameters:', params);

  // const emulator = new Emulator([{
  //   address: "addr_test1vpmt85r4tv2fswvcyuth3wppzxlj569pyp8jzlucr9amv2quu8mta",
  //   assets: { lovelace: 3000000000n },
  // }]);
  // const lucid = new Lucid({ provider: emulator });

  const lucid = await createLucid();
  
  const ownerAcc = stores.accountsStore.ensureAccount(params.walletAddr);
  lucid.selectWalletFromPrivateKey(ownerAcc.account.details.privateKey);
  const mint_amount = BigInt(params.amount);

  console.log(`Using account: ${ownerAcc.account.address}`);

  const utxos = await lucid.utxosAtWithUnit(ownerAcc.account.address, 'lovelace');
  if (utxos.length === 0) {
    console.error('No UTXOs found for the account. Please ensure it has funds.');
    return;
  }

  const utxo = utxos[0];

  const outRef: OutRef = {
    txHash: utxo.txHash,
    outputIndex: utxo.outputIndex,
  };

  const validator: Script = buildDemoTokenPolicy(
    params.tokenName,
    outRef,
  );

  console.log([
    `Validator: ${validator.script}`,
    `outRef: ${JSON.stringify(outRef)}`
  ].join('\n'));

  const scriptUtil = lucid.newScript(validator)
  const policyId = scriptUtil.toHash();
  // const policyId = validatorToScriptHash(validator);
  const tokenNameHex = fromText(params.tokenName);
  const unit = toUnit(policyId, tokenNameHex);

  console.log([
    `Policy ID: ${policyId}`, 
    `Token Unit: ${unit}`,
  ].join('\n'));

  
  const tx = await lucid
    .newTx()
    .collectFrom([utxo])
    .mint(
      { [unit]: mint_amount },
      Data.void(),
    )
    .attachScript(validator)
    // .payTo('{{own}}', {
    //   [unit]: mint_amount,
    // })

  const completedTx = await tx.commit();

  if (params.dry) {
    console.log('Dry run complete. Transaction not submitted.');
    console.log('Transaction details:', completedTx);
    const signed = await completedTx.sign().commit();
    const cborHex = signed.toString();
    console.log('CBOR Hex:', cborHex);

    // // You already have the UTxO you're collecting from
    // const inputRefs = [{ txHash: utxo.txHash, outputIndex: utxo.outputIndex }];

    // // 2. Extract inputs CBOR (the UTXOs being spent)
    // const inputsCbor = lucid.utils.utxosToCore([utxo]).map(output => 
    //   lucid.utils.toHex(lucid.utils.toBytes(output))
    // );

    // // 3. For outputs, you need the actual UTXO data that corresponds to your inputs
    // // This is typically the UTXO data you're spending from
    // const outputsCbor = lucid.utils.toHex(
    //   lucid.utils.toBytes(utxo) // The UTXO you're collecting from
    // );

    return;
  }

  const txHash = await signAndSubmit(lucid, completedTx);
  
  // Save token to store
  stores.tokensStore.add({
    timestamp: new Date(),
    asset: {
      policy: policyId,
      name: params.tokenName,
    }
  });
  await stores.tokensStore.save();

  console.log([
    'Minting successful!',
    `  Account: ${params.walletAddr}`,
    `  Token Name: ${params.tokenName}`,
    `  Amount: ${mint_amount}`,
    `  Policy ID: ${policyId}`,
    `  Transaction Hash: ${txHash}`
  ].join('\n'));
}

export function createMintCommand(): Command {
  const mintCmd = new Command('mint')
    .description('Mint demo tokens for transfers')
    .requiredOption('--account <account>', 'Wallet Account (alias or Bech32) - Tx sender and where to send.')
    .requiredOption('--name <name>', 'Token name')
    .option('--amount <amount>', 'Amount to mint (default: 1B)', '1000000000')
    .option('--dry', 'Dry run without submitting the transaction', false)
    .action(async (options) => {
      await executeMint({
        walletAddr: options.account,
        tokenName: options.name,
        amount: options.amount,
        dry: options.dry,
      });
    });

  return mintCmd;
}
