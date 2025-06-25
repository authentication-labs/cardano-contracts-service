import { Command } from "npm:commander";
import { createInitCommand } from "./cmd/init.ts";
import { createAccountsCommand } from "./cmd/accounts.ts";
import { createDeployCommand } from "./cmd/deploy.ts";
import { createMintCommand } from "./cmd/mint.ts";
import { createOpCommand } from "./cmd/op.ts";
import { getNetwork } from "../store/mod.ts";
import { createRebuildCommand } from "./cmd/rebuild.ts";
import { createViewCommand } from "./cmd/view.ts";
import { createScriptsCommand } from "./cmd/scripts.ts";

// Show environment information relevant to the application
function showEnvironmentInfo() {
  const vars = [
    "BLOCKFROST_PROJECT_ID",
    "BLOCKFROST_URL",
    "LUCID_NETWORK",
    "DEFAULT_SCRIPTS_SRC",
  ]

  const varsReport = vars.map((v) => {
    const value = Deno.env.get(v);
    return `  ${v}: ${value ? value : "Not set"}`;
  }).join("\n");

  console.log(`Env Vars:\n\n${varsReport}\n`);
}

// Main program
const program = new Command();

program
  .name('cardano-funds')
  .description('Cardano Funds Management CLI')
  .version('1.0.0')
  .hook('preAction', () => {
    // showEnvironmentInfo();
  });

const envCmd = new Command('env')
  .description('Show environment variables')
  .action(() => {
    showEnvironmentInfo();
  });

program.addCommand(createInitCommand());
program.addCommand(createAccountsCommand());
program.addCommand(createMintCommand());
program.addCommand(createDeployCommand());
program.addCommand(createRebuildCommand());
program.addCommand(createOpCommand());
program.addCommand(createViewCommand());
program.addCommand(createScriptsCommand());
program.addCommand(envCmd);


// Run the program
program.parse();
