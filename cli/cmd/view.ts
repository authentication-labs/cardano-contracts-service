import { Command } from "commander";
import { stores } from "../../store/mod.ts";
import { Assets, Data, Lucid, Utxo } from "lucid";
import { ScriptsBag } from "../../store/schemas/deployment.ts";
import { createLucid } from "../../offchain/common/wallet.ts";
import { toLucidAsset } from "../../store/schemas/common.ts";
import { FundActionBase } from "../../manage/fund_action_base.ts";
import { ScriptsLoader } from "../../manage/scripts_loader.ts";
import { DeployedScript } from "../../offchain/common/scripts.ts";
import { RegistryDatum, RegistryDatumT, TransferDatum, TransferDatumT } from "../../offchain/domain_types.ts";
import { assetToUnit, fromUnitToAsset } from "../../offchain/common/assets.ts";
import { toStoreAsset } from "../../store/schemas/mod.ts";
import { viewUnit } from "../utils.ts";

class ViewUtil extends FundActionBase {
  protected scripts: ScriptsBag<DeployedScript> | undefined;

  constructor(
    lucid: Lucid,
    fundId: string,
    protected scriptsSrc: 'inline' | 'outref',
  ) {
    super(lucid, fundId);
  }

  async init(): Promise<void> {
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
  }

  // ==========================================================================
  // === Helpers

  private extractDatum<T>(datum: string | undefined, schema: T): T | undefined {
    if (!datum) {
      return undefined;
    }
    try {
      const parsedDatum = Data.from<T>(datum, schema);
      return parsedDatum;
    } catch (_) {
      return undefined;
    }
  }

  private extractRegistryDatum(datum: string | undefined): string[] | undefined {
    return this.extractDatum<RegistryDatumT>(datum, RegistryDatum);
  }

  private extractTransferDatum(datum: string | undefined): string | undefined {
    return this.extractDatum<TransferDatumT>(datum, TransferDatum);
  }

  private assetsHasAdminToken(assets: Assets): boolean {
    const adminTokenUnit = assetToUnit(toLucidAsset(this.deployment.params.adminToken));
    return Object.entries(assets).some(([unit, amount]) => {
      if (unit === adminTokenUnit) {
        return amount > 0n;
      }
      return false;
    });
  }

  private viewRegistryDatum(datum: string | undefined): string {
    if (!datum) {
      return "No datum found.";
    }
    try {
      const parsedDatum = Data.from(datum, RegistryDatum as unknown as RegistryDatumT);
      return parsedDatum.join(', ');
    } catch (error: any) {
      return `Error parsing datum: ${error.message}`;
    }
  }

  // ===========================================================================
  // === Actions

  async viewWhitelist() {
    if (!this.scripts) {
      throw new Error("Scripts not loaded. Call init() first.");
    }
    const registryScriptAddr = this.scripts.Registry.address;
    const utxos = await this.lucid.utxosAt(registryScriptAddr);
    if (utxos.length === 0) {
      console.log(`No UTxOs found at the Registry address: ${registryScriptAddr}`);
      return;
    }
    console.log(`Found ${utxos.length} UTxOs at the Registry address: ${registryScriptAddr}`);

    const whitelist = utxos
      .filter(utxo => this.assetsHasAdminToken(utxo.assets))
      .map(utxo => {
        const datum = this.extractRegistryDatum(utxo.datum);
        return [utxo, datum] as [Utxo, string[] | undefined];
      })
      .filter(([_, datum]) => datum !== undefined)
      .map(([utxo, datum]) => {
        return datum!.map(addrHash => [addrHash, `${utxo.txHash}#${utxo.outputIndex}`]);
      })
      .flat()

    console.log(`Found ${whitelist.length} whitelisted addresses:\n`);

    const report: string = whitelist
      .sort()
      .map(([addr, utxoView]) => {
        return `  - ${addr} (${utxoView})`;
      })
      .join('\n') + '\n';

    console.log(report);
  }

  async viewRegistryUtxos() {
    if (!this.scripts) {
      throw new Error("Scripts not loaded. Call init() first.");
    }
    const registryScriptAddr = this.scripts.Registry.address;
    const utxos = await this.lucid.utxosAt(registryScriptAddr);
    if (utxos.length === 0) {
      console.log(`No UTxOs found at the Registry address: ${registryScriptAddr}`);
      return;
    }
    console.log(`Found ${utxos.length} UTxOs at the Registry address: ${registryScriptAddr}\n`);

    const report: string = utxos.map(utxo => {
      const datum = this.viewRegistryDatum(utxo.datum);

      const assets = Object
        .entries(utxo.assets)
        .map(([unit, amount]) => {
          return `  - ${viewUnit(unit)} = ${amount}`;
        })
        .join('\n');

      return [
        `UTxO: ${utxo.txHash}#${utxo.outputIndex}`,
        `Datum: ${datum}`,
        `Assets:\n${assets}`
      ].join('\n');
    }).join('\n\n') + '\n';

    console.log(report);
  }

  async listFunds() {
    if (!this.scripts) {
      throw new Error("Scripts not loaded. Call init() first.");
    }

    const utxos = await this.lucid.utxosAt(this.scripts.Transfer.creds);

    if (utxos.length === 0) {
      console.log("No Transfer UTxOs found.");
      return;
    }

    // Group UTxOs by owner using reduce
    const utxosByOwner = utxos.reduce((acc, utxo) => {
      const ownerHash = this.extractTransferDatum(utxo.datum);
      if (!ownerHash) {
        return acc; // Skip UTxOs without valid datum
      }
      
      if (!acc[ownerHash]) {
        acc[ownerHash] = [];
      }
      acc[ownerHash].push(utxo);
      return acc;
    }, {} as Record<string, Utxo[]>);

    const ownerCount = Object.keys(utxosByOwner).length;

    // Generate report using functional style
    const reports = Object.entries(utxosByOwner).map(([ownerHash, ownerUtxos]) => {
      // Calculate total assets for this owner (excluding lovelace)
      const totalAssets = ownerUtxos.reduce((acc, utxo) => {
        Object.entries(utxo.assets).forEach(([unit, amount]) => {
          if (unit !== 'lovelace') {
            acc[unit] = (acc[unit] || 0n) + amount;
          }
        });
        return acc;
      }, {} as Record<string, bigint>);

      // Format total assets section
      const totalAssetEntries = Object.entries(totalAssets);
      const totalAssetsSection = totalAssetEntries.length === 0 
        ? ['  Total Assets:', '    - No assets (only lovelace)']
        : [
            '  Total Assets:',
            ...totalAssetEntries.map(([unit, amount]) => `    - ${viewUnit(unit)} = ${amount}`)
          ];

      // Format UTxOs section
      const utxosSection = [
        '  UTxOs:',
        ...ownerUtxos.map(utxo => {
          const nonLovelaceAssets = Object.entries(utxo.assets).filter(([unit]) => unit !== 'lovelace');
          const utxoHeader = `    - ${utxo.txHash}#${utxo.outputIndex}. Assets:`;
          
          return nonLovelaceAssets.length === 0
            ? [utxoHeader, '        - No assets (only lovelace)']
            : [
                utxoHeader,
                ...nonLovelaceAssets.map(([unit, amount]) => `        - ${viewUnit(unit)} = ${amount}`)
              ];
        }).flat()
      ];

      // Return complete owner report
      return [
        `Owner: ${ownerHash}`,
        ...totalAssetsSection,
        ...utxosSection
      ];
    });

    // Combine all parts of the report
    const report = [
      `Found ${utxos.length} Transfer UTxOs for ${ownerCount} owners:`,
      '',
      ...reports.map((ownerReport, index) => 
        index < reports.length - 1 
          ? [...ownerReport, ''] 
          : ownerReport
      ).flat()
    ].join('\n');

    console.log(report);
  }
}

export function createViewCommand(): Command {
  const defaultScriptsSrc = Deno.env.get('DEFAULT_SCRIPTS_SRC') || 'inline';
  
  const viewCmd = new Command('view')
    .hook('preAction', async () => {
      await stores.loadAll();
      console.log('All stores loaded successfully.');
    })
    .description('View blockchain stuff...')

  viewCmd
    .command('reg')
    .description('View UTxOs at the Registry script address')
    .option('--fund-id <id>', 'Fund ID')
    .option('--scripts-src <inline|outref>', 'Script source: inline or outref', defaultScriptsSrc)
    .action(async (options) => {
      const lucid = await createLucid();
      const viewUtil = new ViewUtil(lucid, options.fundId, options.scriptsSrc);
      await viewUtil.init();
      await viewUtil.viewRegistryUtxos();
    });

  viewCmd
    .command('whitelist')
    .description('View Whitelist at the Registry')
    .option('--fund-id <id>', 'Fund ID')
    .option('--scripts-src <inline|outref>', 'Script source: inline or outref', defaultScriptsSrc)
    .action(async (options) => {
      const lucid = await createLucid();
      const viewUtil = new ViewUtil(lucid, options.fundId, options.scriptsSrc);
      await viewUtil.init();
      await viewUtil.viewWhitelist();
    });

  viewCmd
    .command('funds')
    .description('List all Transfer UTxOs grouped by owner')
    .option('--fund-id <id>', 'Fund ID')
    .option('--scripts-src <inline|outref>', 'Script source: inline or outref', defaultScriptsSrc)
    .action(async (options) => {
      const lucid = await createLucid();
      const viewUtil = new ViewUtil(lucid, options.fundId, options.scriptsSrc);
      await viewUtil.init();
      await viewUtil.listFunds();
    });

  return viewCmd;
}
