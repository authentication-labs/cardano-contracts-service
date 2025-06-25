import { Lucid, fromText, toUnit, TxComplete, paymentCredentialOf, Script } from "lucid";
import { RetryHandler } from "../libs/retry_handler.ts";
import { fromUnitToAsset } from "../offchain/common/assets.ts";
import { makeDeployTx } from "../offchain/common/deploy.ts";
import { createLucid, signAndSubmit } from "../offchain/common/wallet.ts";
import { AssetClassT } from "../offchain/domain_types.ts";
import { buildAdminTokenPolicy, buildRegistryValidator, buildTransferValidator } from "../offchain/validators/build.ts";
import { stores } from "../store/mod.ts";
import { OutRef, toStoreAsset } from "../store/schemas/common.ts";
import { DeploymentItem } from "../store/schemas/deployment.ts";

export class DeployTool {

  constructor(private lucid: Lucid) { }

  // ===========================================================================
  // === Helpers 

  private unitFromMintingScript(validator: Script, fundId: string): string {
    const scriptUtil = this.lucid.newScript(validator);
    const policyId = scriptUtil.toHash();
    const tokenNameHex = fromText(fundId);
    const unit = toUnit(policyId, tokenNameHex);
    return unit;
  }

  private extractOutRefFromTx(completedTx: TxComplete): OutRef {
    return {
      txHash: completedTx.toHash(),
      outputIndex: 0, // Assuming the first output is the one we want
    }
  }

  private assetFromUnit(unit: string): AssetClassT {
    try {
      return fromUnitToAsset(unit);
    } catch (error) {
      throw new Error("Failed to parse asset from unit", { cause: error });
    }
  }

  private createRetryHandler() {
    return new RetryHandler({
      maxAttempts: 8,
      delayMs: 3000,
      errorMessageSubstring: "ValueNotConservedUTxO",
    });
  }

  // ===========================================================================
  // === Actions 

  async executeDeployAdminToken(params: {
    fundId: string;
    adminAddr: string;
  }): Promise<{
    unit: string;
    outRef: OutRef;
    script: Script;
    buildArgs: {
      tokenName: string;
      adminAddr: string;
    }
  }> {
    console.log('Starting admin token deployment.');
    console.log('Parameters:', params);

    const adminAcc = stores.accountsStore.ensureAccount(params.adminAddr);
    const lucid = await createLucid()
    lucid.selectWalletFromPrivateKey(adminAcc.account.details.privateKey);

    // const deployer = new Deployer(lucid);
    // const completedTx = await deployer.deployAdminTokenPolicy(params.fundId, adminAcc.account.address);

    const script = buildAdminTokenPolicy(params.fundId, adminAcc.account.address)
    const completedTx = await makeDeployTx(lucid, script);
    const txHash = await signAndSubmit(lucid, completedTx);
    const adminPolicyOutRef = this.extractOutRefFromTx(completedTx);

    // Extract admin token unit
    const validator = buildAdminTokenPolicy(params.fundId, adminAcc.account.address);
    const adminTokenUnit = this.unitFromMintingScript(validator, params.fundId);

    console.log([
      'Admin token deployment successful!',
      `  Fund ID: ${params.fundId}`,
      `  Admin Address: ${params.adminAddr}, ${adminAcc.account.address}`,
      `  Admin Token Unit: ${adminTokenUnit}`,
      `  Transaction Hash: ${txHash}`
    ].join('\n'));

    return {
      unit: adminTokenUnit,
      outRef: adminPolicyOutRef,
      script,
      buildArgs: {
        tokenName: params.fundId,
        adminAddr: adminAcc.account.address,
      }
    };
  }

  async executeDeployRegistry(params: {
    adminToken: string;
    adminAddr: string;
  }): Promise<{
    outRef: OutRef,
    script: Script,
    scriptHash: string,
    buildArgs: {
      admin_token: AssetClassT;
      adminAddr: string;
    }
  }> {
    console.log('Starting registry deployment...');
    console.log('Parameters:', params);

    const adminToken: AssetClassT = this.assetFromUnit(params.adminToken);
    const adminAcc = stores.accountsStore.ensureAccount(params.adminAddr);
    const lucid = await createLucid()
    lucid.selectWalletFromPrivateKey(adminAcc.account.details.privateKey);

    // const deployer = new Deployer(lucid);
    // const completedTx = await deployer.deployRegistryValidator(adminToken, adminAcc.account.address);

    const script = buildRegistryValidator(adminToken, adminAcc.account.address);
    const completedTx = await makeDeployTx(lucid, script);
    const txHash = await signAndSubmit(lucid, completedTx);
    const registryOutRef = this.extractOutRefFromTx(completedTx);

    const validatorAddressBech32 = lucid.utils.scriptToAddress(script);
    const scriptAddrHash = paymentCredentialOf(validatorAddressBech32).hash;

    console.log([
      'Registry deployment successful!',
      `  Admin Token: ${params.adminToken}`,
      `  Admin Address: ${params.adminAddr}, ${adminAcc.account.address}`,
      `  Registry OutRef: ${registryOutRef.txHash}#${registryOutRef.outputIndex}`,
      `  Transaction Hash: ${txHash}`
    ].join('\n'));

    return {
      outRef: registryOutRef,
      script,
      scriptHash: scriptAddrHash,
      buildArgs: {
        admin_token: adminToken,
        adminAddr: adminAcc.account.address,
      }
    };
  }

  async executeDeployTransfer(params: {
    adminToken: string;
    registryScriptHash: string;
    wallet: string;
  }): Promise<{
    outRef: OutRef,
    script: Script,
    buildArgs: {
      admin_token: AssetClassT;
      registry_script_hash: string;
    }
  }> {
    await stores.loadAll();
    console.log('Starting transfer deployment...');
    console.log('Parameters:', params);

    const adminToken: AssetClassT = this.assetFromUnit(params.adminToken);
    const walletAcc = stores.accountsStore.ensureAccount(params.wallet);
    const lucid = await createLucid()
    lucid.selectWalletFromPrivateKey(walletAcc.account.details.privateKey);

    // const deployer = new Deployer(lucid);
    // const completedTx = await deployer.deployTransferValidator(adminToken, registryOutRef);

    const script = await buildTransferValidator(adminToken, params.registryScriptHash);
    const completedTx = await makeDeployTx(lucid, script);
    const txHash = await signAndSubmit(lucid, completedTx);
    const transferOutRef = this.extractOutRefFromTx(completedTx);

    console.log([
      'Transfer deployment successful!',
      `  Admin Token: ${params.adminToken}`,
      `  Registry Script Hash: ${params.registryScriptHash}`,
      `  Transaction Hash: ${txHash}`,
      `  Transfer OutRef: ${transferOutRef.txHash}#${transferOutRef.outputIndex}`
    ].join('\n'));

    return {
      outRef: transferOutRef,
      script,
      buildArgs: {
        admin_token: adminToken,
        registry_script_hash: params.registryScriptHash,
      }
    };
  }

  async executeDeployAll(params: {
    fundId: string;
    adminAddr: string;
    save: boolean;
  }): Promise<DeploymentItem> {
    console.log('Starting deployment...');
    console.log('Parameters:', params);

    const retry = this.createRetryHandler();

    const adminTokenDpl = await retry.try(async () => {
      return await this.executeDeployAdminToken({
        fundId: params.fundId,
        adminAddr: params.adminAddr,
      });
    });

    const registryDpl = await retry.try(async () => {
      return await this.executeDeployRegistry({
        adminToken: adminTokenDpl.unit,
        adminAddr: params.adminAddr,
      });
    });

    const transferDpl = await retry.try(async () => {
      return await this.executeDeployTransfer({
        adminToken: adminTokenDpl.unit,
        registryScriptHash: registryDpl.scriptHash,
        wallet: params.adminAddr,
      });
    });

    console.log('All contracts deployed successfully!');

    const deploymentItem: DeploymentItem = {
      timestamp: new Date(),
      fundId: params.fundId,
      params: {
        adminToken: toStoreAsset(fromUnitToAsset(adminTokenDpl.unit)),
      },
      scripts: {
        AdminToken: adminTokenDpl.script,
        Registry: registryDpl.script,
        Transfer: transferDpl.script,
      },
      scriptRefs: {
        AdminToken: adminTokenDpl.outRef,
        Registry: registryDpl.outRef,
        Transfer: transferDpl.outRef,
      },
      buildArgs: {
        AdminToken: adminTokenDpl.buildArgs,
        Registry: {
          admin_token: toStoreAsset(registryDpl.buildArgs.admin_token),
          adminAddr: registryDpl.buildArgs.adminAddr,
        },
        Transfer: {
          admin_token: toStoreAsset(transferDpl.buildArgs.admin_token),
          registry_script_hash: transferDpl.buildArgs.registry_script_hash,
        },
      }
    };

    // Save deployment if requested
    if (params.save) {
      stores.deploymentsStore.add(deploymentItem);
      await stores.deploymentsStore.save();
      console.log('Deployment saved to deployments.json');
    }

    return deploymentItem;
  }
}