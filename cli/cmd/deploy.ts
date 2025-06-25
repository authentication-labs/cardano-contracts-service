import { Command } from "npm:commander";
import { createLucid } from "../../offchain/common/wallet.ts";
import { stores } from "../../store/mod.ts";
import { DeployTool } from "../../manage/deploy_tool.ts";


export function createDeployCommand(): Command {
  const deployCmd = new Command('deploy')
    .hook('preAction', async () => {
      await stores.loadAll();
      console.log('All stores loaded successfully.');
    })
    .description('Deploy contracts');

  // Deploy subcommands
  deployCmd
    .command('all')
    .description('Deploy all contracts')
    .requiredOption('--fund-id <id>', 'Fund ID')
    .requiredOption('--admin-addr <address>', 'Admin address. Alias or Bech32 format')
    .option('--save', 'Save to deployments.json', true)
    .action(async (options) => {
      const deployer = new DeployTool(await createLucid());
      await deployer.executeDeployAll({
        fundId: options.fundId,
        adminAddr: options.adminAddr,
        save: options.save,
      });
    });

  deployCmd
    .command('admin-token')
    .description('Deploy admin token')
    .requiredOption('--fund-id <id>', 'Fund ID')
    .requiredOption('--admin-addr <address>', 'Admin address')
    .action(async (options) => {
      const deployer = new DeployTool(await createLucid());
      await deployer.executeDeployAdminToken({
        fundId: options.fundId,
        adminAddr: options.adminAddr,
      });
    });

  deployCmd
    .command('registry')
    .description('Deploy registry')
    .requiredOption('--admin-token <token>', 'Admin token in Unit format')
    .requiredOption('--admin-addr <address>', 'Admin address')
    .action(async (options) => {
      const deployer = new DeployTool(await createLucid());
      await deployer.executeDeployRegistry({
        adminToken: options.adminToken,
        adminAddr: options.adminAddr,
      });
    });

  deployCmd
    .command('transfer')
    .description('Deploy transfer')
    .requiredOption('--admin-token <token>', 'Admin token in Unit format')
    .requiredOption('--registry-hash <hash>', 'Registry script hash')
    .requiredOption('--wallet <nameOrAddr>', 'Wallet to perform transaction')
    .action(async (options) => {
      const deployer = new DeployTool(await createLucid());
      await deployer.executeDeployTransfer({
        adminToken: options.adminToken,
        registryScriptHash: options.registryHash,
        wallet: options.wallet,
      });
    });

  return deployCmd;
}
