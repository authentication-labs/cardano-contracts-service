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
    await stores.loadAll();

    const lucid = await createLucid();
    const deployTool = new DeployTool(lucid);

    const deployment = await deployTool.executeDeployAll({
      fundId: input.fundId,
      adminAddr: input.adminAddr,
      save: true,
    });

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
}
