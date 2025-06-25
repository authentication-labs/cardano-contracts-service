import { Command } from "commander";
import { stores } from "../../store/mod.ts";
import { Lucid, paymentCredentialOf, Script } from "lucid";
import { buildAdminTokenPolicy, buildRegistryValidator, buildTransferValidator } from "../../offchain/validators/build.ts";
import { createLucid } from "../../offchain/common/wallet.ts";
import { AssetClass, toLucidAsset } from "../../store/schemas/common.ts";
import { FundActionBase } from "../../manage/fund_action_base.ts";

class RebuildUtil extends FundActionBase{

  constructor(
    lucid: Lucid,
    fundId: string,
  ) {
    super(lucid, fundId);
  }

  // === Helpers

  private getAssetClass(script: Script, tokenName: string): AssetClass {
    const scriptUtil = this.lucid.newScript(script);
    const policy = scriptUtil.toHash();

    return {
      policy,
      name: tokenName,
    };
  }

  private getAdminTokenAssetClass(): AssetClass {
    const { tokenName } = this.deployment.buildArgs.AdminToken;
    return this.getAssetClass(this.deployment.scripts.AdminToken, tokenName);
  }

  private getRegistryScriptHash(): string {
    const registryScript = this.deployment.scripts.Registry;
    const validatorAddressBech32 = this.lucid.utils.scriptToAddress(registryScript);
    const scriptAddrHash = paymentCredentialOf(validatorAddressBech32).hash;
    return scriptAddrHash;
  }

  // === Builders

  private rebuildAdminToken() {
    const { tokenName, adminAddr } = this.deployment.buildArgs.AdminToken;
    const script = buildAdminTokenPolicy(tokenName, adminAddr)
    const assetClass = this.getAssetClass(this.deployment.scripts.AdminToken, tokenName);

    // Updates:
    this.deployment.scripts.AdminToken = script;
    this.deployment.params.adminToken.policy = assetClass.policy;
  }

  private rebuildRegistryValidator() {
    // Update Build Args
    this.deployment.buildArgs.Registry.admin_token = this.getAdminTokenAssetClass();

    // Rebuild the script
    const { admin_token, adminAddr } = this.deployment.buildArgs.Registry;
    const script = buildRegistryValidator(toLucidAsset(admin_token), adminAddr);

    // Updates:
    this.deployment.scripts.Registry = script;
  }

  private rebuildTransferValidator() {
    // Update Build Args
    this.deployment.buildArgs.Transfer.registry_script_hash = this.getRegistryScriptHash();
    this.deployment.buildArgs.Transfer.admin_token = this.getAdminTokenAssetClass();

    // Rebuild the script
    const { admin_token, registry_script_hash } = this.deployment.buildArgs.Transfer;
    const script = buildTransferValidator(toLucidAsset(admin_token), registry_script_hash);

    // Updates:
    this.deployment.scripts.Transfer = script;
  }
  
  // === Public Methods

  async rebuild() {
    this.rebuildAdminToken();
    this.rebuildRegistryValidator();
    this.rebuildTransferValidator();

    // Save the updated deployment
    await stores.deploymentsStore.save();
  }
}

export function createRebuildCommand(): Command {
  const rebuildCmd = new Command('rebuild')
    .hook('preAction', async () => {
      await stores.loadAll();
      console.log('All stores loaded successfully.');
    })
    .description('Rebuild contracts')
    .option('--fund-id <id>', 'Fund ID')
    .action(async (options) => {
      const lucid = await createLucid();
      const rebuildUtil = new RebuildUtil(lucid, options.fundId);
      await rebuildUtil.rebuild();
    });

  return rebuildCmd;
}
