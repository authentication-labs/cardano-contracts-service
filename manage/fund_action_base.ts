import { Lucid } from "lucid";
import { DeploymentItem } from "../store/schemas/deployment.ts";
import { stores } from "../store/mod.ts";

export abstract class FundActionBase {
  public deployment: DeploymentItem;
  
  constructor(
    public lucid: Lucid,
    public fundId: string,
  ) {
    const deployment = stores.deploymentsStore.data.find(d => d.fundId === fundId);
    if (!deployment) {
      throw new Error('Fund ID is required for rebuilding contracts.');
    }
    this.deployment = deployment;
  }
}
