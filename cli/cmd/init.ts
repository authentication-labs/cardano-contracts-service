import { Command } from "npm:commander";
import { stores } from "../../store/mod.ts";

export function createInitCommand(): Command {
  const initCmd = new Command('init')
    .description('Initialize project files')
    .option('-f, --force', 'Force overwrite existing files')
    .action(async (options) => {
      console.log('Initializing all project files...');
      console.log(`Options: ${JSON.stringify(options)}`);
      await stores.initializeAll(options.force);
      console.log('Initialization complete!');
    });

  // Init subcommands
  initCmd
    .command('deployments')
    .description('Create new deployments/deployments.json')
    .action(async (options, cmd) => {
      const parentOpts = cmd.parent?.opts();
      await stores.deploymentsStore.init(parentOpts.force);
      console.log('Deployments store initialized');
    });

  initCmd
    .command('accounts')
    .description('Create new data/accounts.json')
    .action(async (options, cmd) => {
      const parentOpts = cmd.parent?.opts();
      await stores.accountsStore.init(options.force);
      console.log('Accounts store initialized');
    });

  initCmd
    .command('tokens')
    .description('Create new data/tokens.json. Transfer tokens.')
    .action(async (options, cmd) => {
      const parentOpts = cmd.parent?.opts();
      await stores.tokensStore.init(options.force);
      console.log('Tokens store initialized');
    });

  return initCmd;
}
