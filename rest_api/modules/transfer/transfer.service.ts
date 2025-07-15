import { ExecTransferOps } from '../../../manage/operations_facade.ts';
import { stores } from '../../../store/mod.ts';
import { createLucid } from '../../../offchain/common/wallet.ts';
import { ScriptsLoader } from '../../../manage/scripts_loader.ts';
import { TransferDatum, TransferDatumT } from '../../../offchain/domain_types.ts';
import { Data, Assets } from 'lucid';
import { RegistryDatum, RegistryDatumT } from '../../../offchain/domain_types.ts';
import { assetToUnit } from '../../../offchain/common/assets.ts';
import { toLucidAsset } from '../../../store/schemas/common.ts';

const env = {
  DEFAULT_SCRIPTS_SRC: (Deno.env.get('DEFAULT_SCRIPTS_SRC') || 'inline') as 'inline' | 'outref',
} as const satisfies {
  DEFAULT_SCRIPTS_SRC: 'inline' | 'outref';
};

export interface TransferFund {
  owner: string;
  totalAssets: Record<string, bigint>;
  utxos: Array<{
    outRef: string;
    assets: Record<string, bigint>;
  }>;
}

export interface UserBalance {
  paymentCredentialHash: string;
  totalAssets: Record<string, string>;
  utxos: Array<{
    outRef: string;
    assets: Record<string, string>;
  }>;
}

export class TransferService {

  static async deposit(
    fundId: string,
    asset: string,
    account: string,
    targets: string[],
  ): Promise<void> {
    await stores.loadAll();

    const deployment = stores.deploymentsStore.data.find(item => item.fundId === fundId);
    if (!deployment) {
      throw new Error(`Registry not found: ${fundId}`);
    }

    // Parse asset to get policy ID
    const [policyId, assetName] = asset.split(':');
    if (!policyId || !assetName) {
      throw new Error(`Invalid asset format. Expected format: policyId:assetName, got: ${asset}`);
    }

    // Check if token is registered with the fund
    const tokens = stores.tokensStore.data;
    const isTokenRegistered = tokens.some(token =>
      token.fundId === fundId && token.asset.policy === policyId
    );

    if (!isTokenRegistered) {
      throw new Error(`Token with policy ID ${policyId} is not registered for fund ${fundId}`);
    }

    // Validate targets format
    for (const target of targets) {
      const [credentialHash, amount] = target.split(':');
      if (!credentialHash || !amount) {
        throw new Error(`Invalid target format. Expected format: credentialHash:amount, got: ${target}`);
      }

      const amountBigInt = BigInt(amount);
      if (amountBigInt <= 0n) {
        throw new Error(`Invalid amount in target ${target}. Amount must be greater than 0`);
      }
    }

    // Check if sender has sufficient balance
    const lucid = await createLucid();
    const senderUtxos = await lucid.utxosAt(account);
    const assetUnit = `${policyId}${assetName}`;

    let senderBalance = 0n;
    for (const utxo of senderUtxos) {
      if (utxo.assets[assetUnit]) {
        senderBalance += utxo.assets[assetUnit] as bigint;
      }
    }

    // Calculate total amount to deposit
    const totalDepositAmount = targets.reduce((sum, target) => {
      const amount = BigInt(target.split(':')[1]);
      return sum + amount;
    }, 0n);

    if (senderBalance < totalDepositAmount) {
      throw new Error(`Insufficient balance. Available: ${senderBalance}, Required: ${totalDepositAmount}`);
    }

    const transferOps = new ExecTransferOps(fundId, env.DEFAULT_SCRIPTS_SRC, account, asset);
    await transferOps.init();
    await transferOps.deposit(targets);
  }

  static async transferTo(
    fundId: string,
    asset: string,
    account: string,
    targets: string[],
  ): Promise<void> {
    await stores.loadAll();

    const deployment = stores.deploymentsStore.data.find(item => item.fundId === fundId);
    if (!deployment) {
      throw new Error(`Registry not found: ${fundId}`);
    }

    const transferOps = new ExecTransferOps(fundId, env.DEFAULT_SCRIPTS_SRC, account, asset);
    await transferOps.init();
    await transferOps.to(targets);
  }

  static async spend(
    fundId: string,
    asset: string,
    account: string,
    outrefs: string,
    targets: string[],
  ): Promise<void> {
    await stores.loadAll();

    const deployment = stores.deploymentsStore.data.find(item => item.fundId === fundId);
    if (!deployment) {
      throw new Error(`Registry not found: ${fundId}`);
    }

    const transferOps = new ExecTransferOps(fundId, env.DEFAULT_SCRIPTS_SRC, account, asset);
    await transferOps.init();
    await transferOps.spend(outrefs, targets);
  }

  static async getFunds(fundId: string): Promise<TransferFund[]> {
    await stores.loadAll();

    const deployment = stores.deploymentsStore.data.find(item => item.fundId === fundId);
    if (!deployment) {
      throw new Error(`Registry not found: ${fundId}`);
    }

    const lucid = await createLucid();
    const scriptsLoader = new ScriptsLoader(lucid, deployment);
    scriptsLoader.fromInline();

    const scripts = scriptsLoader.scripts;
    if (!scripts) {
      throw new Error("Scripts not loaded");
    }

    const transferScriptAddr = scripts.Transfer.address;
    const utxos = await lucid.utxosAt(transferScriptAddr);

    // Group UTxOs by owner (from datum)
    const ownerGroups = new Map<string, TransferFund>();

    for (const utxo of utxos) {
      if (!utxo.datum) continue;

      try {
        // Extract owner from datum
        const owner = Data.from<TransferDatumT>(
          utxo.datum,
          TransferDatum as unknown as TransferDatumT,
        );

        if (!ownerGroups.has(owner)) {
          ownerGroups.set(owner, {
            owner,
            totalAssets: {},
            utxos: [],
          });
        }

        const fund = ownerGroups.get(owner)!;

        // Add UTxO to owner's funds
        fund.utxos.push({
          outRef: `${utxo.txHash}#${utxo.outputIndex}`,
          assets: utxo.assets,
        });

        // Update total assets
        for (const [unit, amount] of Object.entries(utxo.assets)) {
          if (!fund.totalAssets[unit]) {
            fund.totalAssets[unit] = 0n;
          }
          fund.totalAssets[unit] += amount as bigint;
        }
      } catch (error) {
        console.warn(`Failed to parse UTxO datum: ${utxo.txHash}#${utxo.outputIndex}`, error);
      }
    }

    return Array.from(ownerGroups.values());
  }

  static async getUserBalance(
    fundId: string,
    paymentCredentialHash: string,
  ): Promise<UserBalance | null> {
    await stores.loadAll();

    const deployment = stores.deploymentsStore.data.find(item => item.fundId === fundId);
    if (!deployment) {
      throw new Error(`Registry not found: ${fundId}`);
    }

    const lucid = await createLucid();
    const scriptsLoader = new ScriptsLoader(lucid, deployment);
    scriptsLoader.fromInline();

    const scripts = scriptsLoader.scripts;
    if (!scripts) {
      throw new Error("Scripts not loaded");
    }

    const transferScriptAddr = scripts.Transfer.address;
    const utxos = await lucid.utxosAt(transferScriptAddr);

    // Filter UTxOs for the specific user
    const userUtxos: Array<{
      outRef: string;
      assets: Record<string, bigint>;
    }> = [];
    const totalAssets: Record<string, bigint> = {};

    for (const utxo of utxos) {
      if (!utxo.datum) continue;

      try {
        // Extract owner from datum
        const owner = Data.from<TransferDatumT>(
          utxo.datum,
          TransferDatum as unknown as TransferDatumT,
        );

        // Check if this UTxO belongs to the requested user
        if (owner === paymentCredentialHash) {
          userUtxos.push({
            outRef: `${utxo.txHash}#${utxo.outputIndex}`,
            assets: utxo.assets,
          });

          // Update total assets
          for (const [unit, amount] of Object.entries(utxo.assets)) {
            if (!totalAssets[unit]) {
              totalAssets[unit] = 0n;
            }
            totalAssets[unit] += amount as bigint;
          }
        }
      } catch (error) {
        console.warn(`Failed to parse UTxO datum: ${utxo.txHash}#${utxo.outputIndex}`, error);
      }
    }

    // If no UTxOs found for the user, return null
    if (userUtxos.length === 0) {
      return null;
    }

    // Convert BigInt values to strings for JSON serialization
    return {
      paymentCredentialHash,
      totalAssets: Object.fromEntries(
        Object.entries(totalAssets).map(([unit, amount]) => [unit, amount.toString()])
      ),
      utxos: userUtxos.map(utxo => ({
        outRef: utxo.outRef,
        assets: Object.fromEntries(
          Object.entries(utxo.assets).map(([unit, amount]) => [unit, amount.toString()])
        ),
      })),
    };
  }

  static async purchase(
    fundId: string,
    asset: string,
    account: string,
    amount: string,
    paymentCredentialHash: string,
  ): Promise<void> {
    // Execute CLI command instead of actual purchase logic
    const command = `./man op --fund-id ${fundId} --account ${account} transfer --asset ${asset} deposit ${paymentCredentialHash}:${amount}`;

    console.log(`Executing CLI command: ${command}`);
    console.log(`Current working directory: ${Deno.cwd()}`);

    try {
      // Try to find the man script in the project root
      const projectRoot = new URL('../../../', import.meta.url);
      const manScriptPath = new URL('./man', projectRoot);

      console.log(`Looking for man script at: ${manScriptPath.pathname}`);

      // Check if the man script exists
      try {
        await Deno.stat(manScriptPath.pathname);
        console.log(`Man script found at: ${manScriptPath.pathname}`);
      } catch (statError) {
        console.log(`Man script not found at: ${manScriptPath.pathname}, trying relative path`);
      }

      // Execute the CLI command using Deno.run
      const process = Deno.run({
        cmd: [
          "deno",
          "run",
          "-A",
          "--env-file",
          "cli/mod.ts",
          "op",
          "--fund-id", fundId,
          "--account", account,
          "transfer",
          "--asset", asset,
          "deposit",
          `${paymentCredentialHash}:${amount}`
        ],
        cwd: Deno.cwd(),
        stdout: "piped",
        stderr: "piped",
      });

      const { code } = await process.status();
      const stdout = new TextDecoder().decode(await process.output());
      const stderr = new TextDecoder().decode(await process.stderrOutput());

      if (code !== 0) {
        throw new Error(`CLI command failed with code ${code}: ${stderr}`);
      }

      console.log(`CLI command output: ${stdout}`);

    } catch (error) {
      console.error(`Failed to execute CLI command: ${error.message}`);
      throw new Error(`Failed to execute transfer command: ${error.message}`);
    }
  }
} 