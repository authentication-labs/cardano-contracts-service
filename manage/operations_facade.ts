// ===========================================================================
// === Base Operations Class

import { Lucid, Tx, fromText } from "lucid";
import { DeployedScript } from "../offchain/common/scripts.ts";
import { parseOutRef } from "../offchain/common/tx.ts";
import { createLucid, signAndSubmit } from "../offchain/common/wallet.ts";
import { AssetClassT } from "../offchain/domain_types.ts";
import { RegistryOps, TransferOps, TransferTarget } from "../offchain/tx/mod.ts";
import { stores } from "../store/mod.ts";
import { AccountItem } from "../store/schemas/account.ts";
import { toLucidAsset, OutRef } from "../store/schemas/common.ts";
import { DeploymentItem, ScriptsBag } from "../store/schemas/deployment.ts";
import { ScriptsLoader } from "./scripts_loader.ts";
import { assetFromUnitTxt } from "./utils.ts";

function convertToTargets(targetsStr: string[]): TransferTarget[] {
  return targetsStr.map(target => {
    const [address, amountStr] = target.split(':');
    if (!address || isNaN(parseInt(amountStr))) {
      throw new Error(`Invalid target format: ${target}. Expected "address:amount".`);
    }
    const amount = BigInt(amountStr);
    return { address, amount };
  });
}

abstract class ExecOpsBase {
  protected lucid!: Lucid;
  protected deployment!: DeploymentItem;
  protected scripts: ScriptsBag<DeployedScript> | undefined;
  protected account!: AccountItem;

  constructor(
    protected fundId: string,
    protected scriptsSrc: 'inline' | 'outref',
    // Account alias or address in Bech32 format
    protected accountId: string
  ) {
  }

  private async loadScripts(): Promise<void> {
    const scriptsLoader = new ScriptsLoader(this.lucid, this.deployment);
    
    if (this.scriptsSrc === 'outref') {
      console.log('Loading scripts from outref...');
      await scriptsLoader.fromOutRef();
    } else if (this.scriptsSrc === 'inline') {
      console.log('Loading scripts from inline...');
      scriptsLoader.fromInline();
    } else {
      throw new Error(`Invalid scripts source: ${this.scriptsSrc}. Expected 'inline' or 'outref'.`);
    }
    
    this.scripts = scriptsLoader.scripts;
    // this.deployment = scriptsLoader.deployment; // update after possible rebuild
  }

  protected async init(): Promise<void> {
    await stores.loadAll();
    console.log('All stores loaded successfully.');

    this.deployment = this.getDeployment();
    this.account = this.getAccount();

    this.lucid = await createLucid();
    this.lucid.selectWalletFromPrivateKey(this.account.account.details.privateKey);
    // this.lucid.selectWalletFromSeed(this.account.account.seedPhrase!, {
    //   addressType: 'Base',
    //   index: 0,
    // });

    await this.loadScripts();

    if (!this.scripts) {
      throw new Error("Scripts not loaded. Ensure deployment scripts are available.");
    }

    console.log([
      `ExecOps initialized successfully with parameters:`,
      `Deployment FundId: ${this.deployment.fundId}`,
      `Account: ${this.accountId} (${this.account.account.address}) ${JSON.stringify(this.account.account.details.credential, null, 2)}`,
      `All scripts loaded successfully.`
    ].join('\n'));
  }

  protected getDeployment(): DeploymentItem {
    if (!this.fundId) {
      throw new Error("Deployment parameter is required");
    }

    const deploymentItem = stores.deploymentsStore.data.find(item => item.fundId === this.fundId);
    if (!deploymentItem) {
      throw new Error(`Deployment not found: ${this.fundId}`);
    }

    return deploymentItem;
  }

  protected getAccount(): AccountItem {
    if (!this.accountId) {
      throw new Error("Account parameter is required");
    }

    return stores.accountsStore.ensureAccount(this.accountId);
  }

  protected logTxHash(txHash: string): void {
    console.log([
      'Operation completed successfully!',
      `Transaction Hash: ${txHash}`,
    ].join('\n'));
  }

  protected async completeTx(tx: Tx): Promise<void> {
    const txComplete = await tx.commit();
    console.log('completeTx | Transaction ready for signing and submission:', txComplete.toString());

    // const utxos = await this.lucid.wallet.getUtxos()
    // console.log('completeTx | Current UTxOs:', utxos);

    const txHash = await signAndSubmit(this.lucid, txComplete);
    this.logTxHash(txHash);
  }
}

// ===========================================================================
// === Registry Operations Class

export class ExecRegistryOps extends ExecOpsBase {
  private registryOps!: RegistryOps

  constructor(
    fundId: string,
    scriptsSrc: 'inline' | 'outref',
    /// Account alias or address in Bech32 format
    accountId: string
  ) {
    super(fundId, scriptsSrc, accountId);
  }

  override async init(): Promise<void> {
    await super.init();

    if (!this.scripts) {
      throw new Error("Scripts not loaded. Ensure deployment scripts are available.");
    }

    this.registryOps = new RegistryOps(
      this.lucid,
      toLucidAsset(this.deployment.params.adminToken),
      this.scripts,
    );
  }

  // address - in hex format
  async add(addresses: string[]): Promise<void> {
    console.log('Starting registry add operation...');

    const tx = this.registryOps.add(addresses);
    await this.completeTx(tx);
  }

  // address - in hex format
  async removeAddr(address: string): Promise<void> {
    console.log('Starting registry remove address operation...');

    const tx = await this.registryOps.removeByAddr(address);
    await this.completeTx(tx);
  }

  async removeOutref(outref: string): Promise<void> {
    console.log('Starting registry remove outref operation...');

    const outRef: OutRef = parseOutRef(outref);
    const tx = await this.registryOps.removeByOutRef([outRef]);
    await this.completeTx(tx);
  }
}

// ===========================================================================
// === Transfer Operations Class

export class ExecTransferOps extends ExecOpsBase {
  private transferOps!: TransferOps;
  private assetClass: AssetClassT;

  constructor(
    fundId: string,
    scriptsSrc: 'inline' | 'outref',
    accountId: string,
    asset: string
  ) {
    super(fundId, scriptsSrc, accountId);
    this.assetClass = assetFromUnitTxt(asset);
  }

  override async init(): Promise<void> {
    await super.init();
    if (!this.scripts) {
      throw new Error("Scripts not loaded. Ensure deployment scripts are available.");
    }
    
    this.transferOps = new TransferOps(
      this.lucid,
      toLucidAsset(this.deployment.params.adminToken),
      this.scripts,
      this.account.account.details.credential.hash, // sender: Payment credential hash
    );
  }

  async deposit(targetsStr: string[]): Promise<void> {
    console.log('Starting transfer deposit operation...');

    const targets = convertToTargets(targetsStr);
    const tx = await this.transferOps.deposit(this.assetClass, targets);
    await this.completeTx(tx);
  }

  async to(targetsStr: string[]): Promise<void> {
    console.log('Starting transfer to operation...');
    const targets = convertToTargets(targetsStr);
    const tx = await this.transferOps.transfer(this.assetClass, targets);
    await this.completeTx(tx);
  }

  async spend(outrefs: string, targets: string[]): Promise<void> {
    console.log('Starting transfer spend operation...');

    const outRefList = outrefs.split(',').map(parseOutRef);
    const utxos = await this.lucid.utxosByOutRef(outRefList);
    const targetsConverted = convertToTargets(targets);
    const tx = await this.transferOps.spend(this.assetClass, utxos, targetsConverted);
    await this.completeTx(tx);
  }
}