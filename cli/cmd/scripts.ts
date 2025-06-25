import { Addresses, Utils } from "lucid";
import { Command } from "commander";
import { stores } from "../../store/mod.ts";
import { createLucid } from "../../offchain/common/wallet.ts";

async function showScriptsInfo(fundId: string): Promise<void> {
  const lucid = await createLucid();
  const deployment = stores.deploymentsStore.data.find(d => d.fundId === fundId);
  if (!deployment) {
    console.error(`No deployment found for fund ID: ${fundId}`);
    return;
  }
  const scripts = deployment.scripts;
  
  for (const [name, script] of Object.entries(scripts)) {
    const addr = Addresses.scriptToAddress(lucid.network, script);
    const hash = Addresses.scriptToCredential(script).hash;
    console.log(`${name}: ${addr} ${hash}`);
  }
}

export function createScriptsCommand(): Command {
  const scriptsCmd = new Command('scripts')
    .hook('preAction', async () => {
      await stores.loadAll();
      console.log('All stores loaded successfully.');
    })
    .description('Cardano scripts inspection')
    .option('--fund-id <id>', 'Fund ID')


  scriptsCmd
    .command('info')
    .description('Show script info')
    .action((_opts, cmd) => {
      const parentOpts = cmd.parent?.opts();
      showScriptsInfo(parentOpts?.fundId);
    });

  return scriptsCmd;
}
