import { Command } from "npm:commander";
import { KeyDetails, Crypto, Addresses, Assets, Lucid } from "lucid";
import { getNetwork, stores } from "../../store/mod.ts";
import { AccountItem, Network } from "../../store/schemas/mod.ts";
import { createLucid, signAndSubmit } from "../../offchain/common/wallet.ts";
import { assetToUnit, fromUnitToAsset } from "../../offchain/common/assets.ts";
import { assetFromUnitTxt } from "../../manage/utils.ts";
import { toLucidAsset, toStoreAsset } from "../../store/schemas/common.ts";
import { viewUnit } from "../utils.ts";

// ============================================================================
// === Helpers

function generateAccount(network: Network): { address: string; details: KeyDetails, seedPhrase: string } {
  const seedPhrase = Crypto.generateSeed();
  const details = Crypto.seedToDetails(seedPhrase, 0, "Payment");
  const address = Addresses.credentialToAddress(network, details.credential);
  return { address, details, seedPhrase };
}

const getBalance = (lucid: Lucid) => async (address: string): Promise<Assets> => {
  return await lucid.utxosAt(address).then(utxos => {
    const assets: Assets = {};
    for (const utxo of utxos) {
      for (const [unit, amount] of Object.entries(utxo.assets)) {
        assets[unit] = (assets[unit] || 0n) + amount;
      }
    }
    return assets;
  });
}

// ============================================================================
// === Actions

const sendAsset = async (
  fromNameOrAddress: string,
  toNameOrAddress: string,
  unitTxt: string = 'lovelace', // Format: policyId:assetNameTxt or 'lovelace'
  amountStr: string
): Promise<void> => {
  const lucid = await createLucid();
  const toAddr = stores.accountsStore.ensureAddress(toNameOrAddress);
  const ownerAcc = stores.accountsStore.ensureAccount(fromNameOrAddress);
  const wallet: Lucid = lucid.selectWalletFromPrivateKey(ownerAcc.account.details.privateKey);

  const amount = BigInt(amountStr);

  const unit = unitTxt === 'lovelace' ? unitTxt : assetToUnit(assetFromUnitTxt(unitTxt));
  
  // Build transaction
  const tx = lucid
    .newTx()
    .payTo(toAddr, { [unit]: amount });

  const completedTx = await tx.commit();

  const txHash = await signAndSubmit(wallet, completedTx);
  
  console.log([
    'Transfer successful!',
    `  From: ${ownerAcc.account.address}`,
    `  To: ${toAddr}`,
    `  Asset: ${unitTxt}`,
    `  Amount: ${amount}`,
    `  Transaction Hash: ${txHash}`
  ].join('\n'));
}

function addAccount(name: string, description?: string): void {
  // Check if account with this name already exists
  if (name && stores.accountsStore.data.some(acc => acc.name === name)) {
    throw new Error(`Account with name '${name}' already exists`);
  }

  const account: AccountItem = {
    timestamp: new Date(),
    name: name,
    dscription: description,
    account: generateAccount(getNetwork())
  }

  stores.accountsStore.add(account);
  stores.accountsStore.save();

  console.log([
    `Account added:`,
    `  Name: ${name || 'unnamed'}`,
    `  Address: ${account.account.address}`,
    `  Visit Faucet: https://docs.cardano.org/cardano-testnets/tools/faucet to get testnet funds`,
  ].join('\n'));
}

function removeAccount(name?: string, address?: string): void {
  if (!name && !address) {
    throw new Error('Either --name or --addr must be provided');
  }

  const predicate = name 
    ? (acc: AccountItem) => acc.name === name 
    : (acc: AccountItem) => acc.account.address === address;

  const success = stores.accountsStore.remove(predicate);
  if (!success) {
    throw new Error(`No account found with ${name ? `name '${name}'` : `address '${address}'`}`);
  } else {
    stores.accountsStore.save();
  }

  console.log(`Account removed: ${name || address}`);
}

async function listAccounts(name?: string, address?: string, showBalance: boolean = false): Promise<void> {
  const lucid = await createLucid();
  let list: AccountItem[] = [];

  if (name) {
    list = stores.accountsStore.data.filter(acc => acc.name === name);
  } else if (address) {
    list = stores.accountsStore.data.filter(acc => acc.account.address === address);
  } else {
    list = stores.accountsStore.data;
  }

  if (list.length === 0) {
    console.log('No accounts found');
    return;
  }

  const result: [AccountItem, Assets][] = await Promise.all(list.map(async (acc) => {
    if (showBalance) {
      try {
        const assets = await getBalance(lucid)(acc.account.address);
        return [acc, assets];
      } catch (error) {
        console.log(`Balance: Error - ${(error as Error).message}`);
      }
    }
    return [acc, {}];
  }));

  // Print result
  for (const [acc, assets] of result) {
    console.log(`Name: ${acc.name || 'unnamed'}`);
    console.log(`Address: ${acc.account.address}`);
    console.log(`Created: ${new Date(acc.timestamp).toLocaleString()}`);

    if (assets) {
      console.log('Assets:');
      for (const [unit, amount] of Object.entries(assets)) {
        const unitTxt = viewUnit(unit);
        console.log(`  ${unitTxt} = ${amount}`);
      }
    }

    console.log(`${'-'.repeat(30)}\n`);
  }
}

// ============================================================================
// === Command

export function createAccountsCommand(): Command {
  const accountsCmd = new Command('accounts')
    .description('Accounts management')
    .hook('preAction', async () => {
      await stores.loadAll();
      console.log(`Network: ${getNetwork()}`);
    });

  // Accounts subcommands
  accountsCmd
    .command('add')
    .description('Generate new account')
    .option('--name <name>', 'Name of the account')
    .option('--description <description>', 'Description of the account')
    .action(async (options) => {
      try {
        await addAccount(options.name, options.description);
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        Deno.exit(1);
      }
    });

  accountsCmd
    .command('rm')
    .description('Remove account')
    .option('--name <name>', 'Name of the account')
    .option('--addr <address>', 'Address in bech32 format')
    .action(async (options) => {
      try {
        await removeAccount(options.name, options.addr);
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        Deno.exit(1);
      }
    });

  accountsCmd
    .command('list')
    .description('List accounts')
    .option('--name <name>', 'Display 1 account. name - account name.')
    .option('--addr <bech32>', 'Display 1 account. Address in bech32 format')
    .option('--balance', 'Show balance of accounts')
    .action(async (options) => {
      try {
        await listAccounts(options.name, options.addr, options.balance);
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        Deno.exit(1);
      }
    });

  accountsCmd
    .command('send')
    .description('Send assets')
    .requiredOption('--from <account>', 'From account (alias or bech32)')
    .requiredOption('--to <account>', 'To account or script (alias or bech32)')
    .option('--asset <asset>', 'Asset to send. Format: "policyId:assetNameTxt" or "lovelace"', 'lovelace')
    .requiredOption('--amount <amount>', 'Amount to send')
    .action(async (options) => {
      try {
        await sendAsset(options.from, options.to, options.asset, options.amount);
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        Deno.exit(1);
      }
    });

  return accountsCmd;
}
