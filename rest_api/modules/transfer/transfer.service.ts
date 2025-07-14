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

  static async purchase(
    fundId: string,
    asset: string,
    account: string,
    amount: string,
    paymentCredentialHash: string,
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

    // Verify the user is whitelisted
    const lucid = await createLucid();
    const scriptsLoader = new ScriptsLoader(lucid, deployment);
    scriptsLoader.fromInline();

    const scripts = scriptsLoader.scripts;
    if (!scripts) {
      throw new Error("Scripts not loaded");
    }

    // Check if the payment credential hash is in the whitelist
    const registryScriptAddr = scripts.Registry.address;
    const registryUtxos = await lucid.utxosAt(registryScriptAddr);

    const adminTokenUnit = assetToUnit(toLucidAsset(deployment.params.adminToken));
    const isWhitelisted = registryUtxos.some(utxo => {
      if (!utxo.datum || !utxo.assets[adminTokenUnit]) {
        return false;
      }

      try {
        const datum = Data.from<RegistryDatumT>(
          utxo.datum,
          RegistryDatum as unknown as RegistryDatumT,
        );
        return datum.includes(paymentCredentialHash);
      } catch {
        return false;
      }
    });

    if (!isWhitelisted) {
      throw new Error(`Payment credential hash ${paymentCredentialHash} is not whitelisted for fund ${fundId}`);
    }

    // Convert amount to bigint
    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0n) {
      throw new Error("Purchase amount must be greater than 0");
    }

    // Check available balance in transfer contract by looking at total assets across all owners
    const transferScriptAddr = scripts.Transfer.address;
    const transferUtxos = await lucid.utxosAt(transferScriptAddr);

    // Find the asset unit - asset name needs to be hex-encoded
    const assetNameHex = Array.from(new TextEncoder().encode(assetName))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const assetUnit = `${policyId}${assetNameHex}`;
    console.log(`Looking for asset unit: ${assetUnit}`);
    console.log(`Available asset units in UTxOs:`, Object.keys(transferUtxos[0]?.assets || {}));

    let availableBalance = 0n;

    for (const utxo of transferUtxos) {
      if (utxo.assets[assetUnit]) {
        availableBalance += utxo.assets[assetUnit] as bigint;
      }
    }

    console.log(`Available balance for ${assetUnit}: ${availableBalance}`);

    if (availableBalance < amountBigInt) {
      throw new Error(`Insufficient balance. Available: ${availableBalance}, Requested: ${amountBigInt}`);
    }

    // Create target for the purchase (transfer to the buyer)
    const targets = [`${paymentCredentialHash}:${amount}`];

    // Execute the transfer operation
    const transferOps = new ExecTransferOps(fundId, env.DEFAULT_SCRIPTS_SRC, account, asset);
    await transferOps.init();
    await transferOps.to(targets);
  }
} 