import { CreateRegistryInput } from './registry.schemas.ts';
import { DeploymentItem } from '../../../store/schemas/deployment.ts';
import { stores } from '../../../store/mod.ts';
import { DeployTool } from '../../../manage/deploy_tool.ts';
import { ExecRegistryOps } from '../../../manage/operations_facade.ts';
import { createLucid } from '../../../offchain/common/wallet.ts';
import { ScriptsLoader } from '../../../manage/scripts_loader.ts';
import { RegistryDatum, RegistryDatumT } from '../../../offchain/domain_types.ts';
import { assetToUnit } from '../../../offchain/common/assets.ts';
import { toLucidAsset } from '../../../store/schemas/common.ts';
import { Data, Assets } from 'lucid';
import { TokenItem } from '../../../store/schemas/token.ts';


// Helper functions
function extractRegistryDatum(datum: string | undefined): string[] | undefined {
  if (!datum) {
    return undefined;
  }
  try {
    const parsedDatum = Data.from<RegistryDatumT>(datum, RegistryDatum);
    return parsedDatum;
  } catch (_) {
    return undefined;
  }
}

function assetsHasAdminToken(assets: Assets, adminTokenUnit: string): boolean {
  return Object.entries(assets).some(([unit, amount]) => {
    if (unit === adminTokenUnit) {
      return amount > 0n;
    }
    return false;
  });
}

const env = {
  DEFAULT_SCRIPTS_SRC: (Deno.env.get('DEFAULT_SCRIPTS_SRC') || 'inline') as 'inline' | 'outref',
} as const satisfies {
  DEFAULT_SCRIPTS_SRC: 'inline' | 'outref';
};

export class RegistryService {

  static async createRegistry(input: CreateRegistryInput): Promise<DeploymentItem> {
    console.log('createRegistry', input);
    await stores.loadAll();
    console.log('stores.loadAll');

    const lucid = await createLucid();
    console.log('lucid', lucid);
    const deployTool = new DeployTool(lucid);
    console.log('deployTool', deployTool);
    const deployment = await deployTool.executeDeployAll({
      fundId: input.fundId,
      adminAddr: input.adminAddr,
      save: true,
    });
    console.log('deployment', deployment);
    return deployment;
  }

  static async getRegistry(fundId: string): Promise<DeploymentItem> {
    await stores.loadAll();

    const deployment = stores.deploymentsStore.data.find(item => item.fundId === fundId);
    if (!deployment) {
      throw new Error(`Registry not found: ${fundId}`);
    }

    return deployment;
  }

  static async getWhitelist(fundId: string): Promise<string[]> {
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

    const registryScriptAddr = scripts.Registry.address;
    const utxos = await lucid.utxosAt(registryScriptAddr);

    const adminTokenUnit = assetToUnit(toLucidAsset(deployment.params.adminToken));

    const whitelist = utxos
      .filter(utxo => assetsHasAdminToken(utxo.assets, adminTokenUnit))
      .map(utxo => {
        const datum = extractRegistryDatum(utxo.datum);
        return datum;
      })
      .filter(datum => datum !== undefined)
      .flat();

    return whitelist;
  }

  static async addToWhitelist(
    fundId: string,
    addresses: string[],
  ): Promise<void> {
    await stores.loadAll();
    const fund = stores.deploymentsStore.data.find(item => item.fundId === fundId);
    if (!fund) {
      throw new Error(`Registry not found: ${fundId}`);
    }
    const accountBech32 = fund.buildArgs.Registry.adminAddr;
    const registryOps = new ExecRegistryOps(fundId, env.DEFAULT_SCRIPTS_SRC, accountBech32);
    await registryOps.init();
    await registryOps.add(addresses);
  }

  static async removeFromWhitelist(
    fundId: string,
    address: string
  ): Promise<boolean> {
    await stores.loadAll();

    const deployment = stores.deploymentsStore.data.find(item => item.fundId === fundId);
    if (!deployment) {
      throw new Error(`Registry not found: ${fundId}`);
    }

    // Use the admin address from the deployment build args
    const adminAddr = deployment.buildArgs.Registry.adminAddr;

    const registryOps = new ExecRegistryOps(fundId, env.DEFAULT_SCRIPTS_SRC, adminAddr);
    await registryOps.init();
    await registryOps.removeAddr(address);

    return true;
  }

  static async addTokenContract(
    fundId: string,
    policyId: string
  ): Promise<TokenItem> {
    await stores.loadAll();

    // Verify the fund exists
    const deployment = stores.deploymentsStore.data.find(item => item.fundId === fundId);
    if (!deployment) {
      throw new Error(`Registry not found: ${fundId}`);
    }

    // Get tokens from the store
    const tokensStore = stores.tokensStore;
    const tokens = tokensStore.data;

    // Check if a token with the same policy already exists
    const existingTokenIndex = tokens.findIndex(token =>
      token.asset.policy === policyId
    );

    let tokenItem: TokenItem;

    if (existingTokenIndex !== -1) {
      // Token with same policy exists, update it with fundId
      const existingToken = tokens[existingTokenIndex];
      tokenItem = {
        ...existingToken,
        fundId: fundId,
        tokenContractAddr: deployment.scripts.Transfer.address
      };

      // Remove the existing token and add the updated one
      tokensStore.remove(token => token.asset.policy === policyId);
      tokensStore.add(tokenItem);

      console.log(`Token with policy ${policyId} already exists, updated with fundId ${fundId}`);
    } else {
      // Create new token item
      tokenItem = {
        timestamp: new Date(),
        fundId: fundId,
        tokenContractAddr: deployment.scripts.Transfer.address, // Use the transfer contract address
        asset: {
          policy: policyId,
          name: `token_${fundId}_${Date.now()}` // Generate a unique name
        }
      };

      // Add to tokens store using the store's add method
      tokensStore.add(tokenItem);

      console.log(`New token contract added to registry for fund ${fundId}:`, {
        policyId
      });
    }

    // Save the updated store
    await tokensStore.save();

    return tokenItem;
  }

  static async getTokenContracts(fundId: string): Promise<TokenItem[]> {
    await stores.loadAll();

    // Verify the fund exists
    const deployment = stores.deploymentsStore.data.find(item => item.fundId === fundId);
    if (!deployment) {
      throw new Error(`Registry not found: ${fundId}`);
    }

    // Get tokens from the store
    const tokens = stores.tokensStore.data;

    // Filter tokens that belong to this fund
    const fundTokens = tokens.filter(token => token.fundId === fundId);

    return fundTokens;
  }

  static async getTokenPolicies(fundId: string): Promise<{ tokenName: string; policy: string }[]> {
    await stores.loadAll();

    // Verify the fund exists
    const deployment = stores.deploymentsStore.data.find(item => item.fundId === fundId);
    if (!deployment) {
      throw new Error(`Registry not found: ${fundId}`);
    }

    // Get tokens from the store
    const tokens = stores.tokensStore.data;

    // Filter tokens that belong to this fund and extract policy IDs
    // const fundTokenPolicies = tokens
    //   .filter(token => token.fundId === fundId)
    //   .map(token => token.asset.policy);
    // return [{tokenname:token.asset.name, policy:token.asset.policy}]
    const fundTokenPolicies = tokens
      .filter(token => token.fundId === fundId)
      .map(token => ({ tokenName: token.asset.name, policy: token.asset.policy }));
    return fundTokenPolicies;
  }

  static async removeTokenContract(
    fundId: string,
    policyId: string
  ): Promise<boolean> {
    await stores.loadAll();

    // Verify the fund exists
    const deployment = stores.deploymentsStore.data.find(item => item.fundId === fundId);
    if (!deployment) {
      throw new Error(`Registry not found: ${fundId}`);
    }

    // Get tokens from the store
    const tokensStore = stores.tokensStore;
    const tokens = tokensStore.data;

    // Find the token to remove
    const tokenIndex = tokens.findIndex(token =>
      token.fundId === fundId && token.asset.policy === policyId
    );

    if (tokenIndex === -1) {
      throw new Error(`Token contract with policy ID ${policyId} not found for fund ${fundId}`);
    }

    // Remove the token using the store's remove method
    const removed = tokensStore.remove(token =>
      token.fundId === fundId && token.asset.policy === policyId
    );

    if (!removed) {
      throw new Error(`Failed to remove token contract with policy ID ${policyId}`);
    }

    // Save the updated store
    await tokensStore.save();

    console.log(`Token contract removed from registry for fund ${fundId}:`, {
      policyId
    });

    return true;
  }
}
