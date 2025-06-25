import { Command } from "npm:commander";
import { ExecRegistryOps, ExecTransferOps } from "../../manage/operations_facade.ts";



export function createOpCommand(): Command {
  const defaultScriptsSrc = Deno.env.get('DEFAULT_SCRIPTS_SRC') || 'inline';

  const opCmd = new Command('op')
    .description('Perform operations')
    .option('--fund-id <string>', 'Fund ID to use')
    .option('--scripts-src <inline|outref>', 'Script source: inline or outref', defaultScriptsSrc)
    .option('--account <account>', 'Account (alias or bech32). Who will sign and submit transactions');

  // ===========================================================================
  // === Registry operations subcommands

  const opRegistryCmd = opCmd
    .command('registry')
    .description('Registry operations');

  opRegistryCmd
    .command('add')
    .description('Add addresses to registry')
    .argument('<addresses...>', 'Addresses to add. Format: raw (28 bytes creds hash).')
    .action(async (addresses, options, command) => {
      const parentOpts = command.parent?.parent?.opts();
      const registryOps = new ExecRegistryOps(parentOpts?.fundId, parentOpts?.scriptsSrc, parentOpts?.account);
      await registryOps.init();
      await registryOps.add(addresses);
    });

  const opRegistryRmCmd = opRegistryCmd
    .command('rm')
    .description('Remove from registry');

  opRegistryRmCmd
    .command('addr')
    .description('Remove address')
    .argument('<address>', 'Address to remove. Format: raw (28 bytes creds hash)')
    .action(async (address, options, command) => {
      const parentOpts = command.parent?.parent?.parent?.opts();
      const registryOps = new ExecRegistryOps(parentOpts?.fundId, parentOpts?.scriptsSrc, parentOpts?.account);
      await registryOps.init();
      await registryOps.removeAddr(address);
    });

  opRegistryRmCmd
    .command('outref')
    .description('Remove outref')
    .argument('<outref>', 'Output reference to remove')
    .action(async (outref, options, command) => {
      const parentOpts = command.parent?.parent?.parent?.opts();
      const registryOps = new ExecRegistryOps(parentOpts?.fundId, parentOpts?.scriptsSrc, parentOpts?.account);
      await registryOps.init();
      await registryOps.removeOutref(outref);
    });

  // ===========================================================================
  // === Transfer operations subcommands

  const opTransferCmd = opCmd
    .command('transfer')
    .description('Transfer operations')
    .option('--asset <asset>', 'Asset in policyId:assetNameTxt format');

  opTransferCmd
    .command('deposit')
    .description('Lock tokens in transfer smart contract')
    .argument('<targets...>', 'Targets in format "credsHash:amount"')
    .action(async (targets, options, command) => {
      const parentOpts = command.parent?.parent?.opts();
      const transferOpts = command.parent?.opts();
      const transferOps = new ExecTransferOps(parentOpts?.fundId, parentOpts?.scriptsSrc, parentOpts?.account, transferOpts?.asset);
      await transferOps.init();
      await transferOps.deposit(targets);
    });

  opTransferCmd
    .command('to')
    .description('Transfer to targets')
    .argument('<targets...>', 'Targets in format "credsHash:amount"')
    .action(async (targets, options, command) => {
      const parentOpts = command.parent?.parent?.opts();
      const transferOpts = command.parent?.opts();
      const transferOps = new ExecTransferOps(parentOpts?.fundId, parentOpts?.scriptsSrc, parentOpts?.account, transferOpts?.asset);
      await transferOps.init();
      await transferOps.to(targets);
    });

  opTransferCmd
    .command('spend')
    .description('Spend outrefs to targets')
    .argument('<outrefs>', 'Output references to spend (comma-separated)')
    .argument('<targets...>', 'Targets in format "credsHash:amount"')
    .action(async (outrefs, targets, options, command) => {
      const parentOpts = command.parent?.parent?.opts();
      const transferOpts = command.parent?.opts();
      const transferOps = new ExecTransferOps(parentOpts?.fundId, parentOpts?.scriptsSrc, parentOpts?.account, transferOpts?.asset);
      await transferOps.init();
      await transferOps.spend(outrefs, targets);
    });

  return opCmd;
}
