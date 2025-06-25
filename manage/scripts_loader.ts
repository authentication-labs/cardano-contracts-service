import { Lucid } from "lucid";
import { DeploymentItem, ScriptsBag } from "../store/schemas/deployment.ts";
import { DeployedScript, ScriptUtil } from "../offchain/common/scripts.ts";
import { buildAdminTokenPolicy } from "../offchain/validators/build.ts";

export class ScriptsLoader {
  private _scripts: ScriptsBag<DeployedScript> | undefined
  private scriptUtil: ScriptUtil

  constructor(
    lucid: Lucid,
    public deployment: DeploymentItem
  ) {
    this.scriptUtil = new ScriptUtil(lucid);
  }

  get scripts(): ScriptsBag<DeployedScript> {
    if (!this._scripts) {
      throw new Error("Scripts not loaded yet. Call load() first.");
    }
    return this._scripts;
  }

  async fromOutRef(): Promise<ScriptsBag<DeployedScript>> {
    const scripts: ScriptsBag<DeployedScript> = {} as ScriptsBag<DeployedScript>;

    for (const [scriptName, outRef] of Object.entries(this.deployment.scriptRefs)) {
      if (outRef) {
        const deployedScript = await this.scriptUtil.fromOutRef(outRef);
        scripts[scriptName as keyof ScriptsBag<DeployedScript>] = deployedScript;
      } else {
        throw new Error(`No outRef found for script: ${scriptName}`);
      }
    }

    this._scripts = scripts;
    return scripts;
  }

  fromInline(): ScriptsBag<DeployedScript> {
    const scripts: ScriptsBag<DeployedScript> = {} as ScriptsBag<DeployedScript>;

    for (const [scriptName, inlineScript] of Object.entries(this.deployment.scripts)) {
      const deployedScript = this.scriptUtil.fromInline(inlineScript);
      scripts[scriptName as keyof ScriptsBag<DeployedScript>] = deployedScript;
    }

    this._scripts = scripts;
    return scripts;
  }
}
