
import {
  AccountItem, AccountItemSchema, DeploymentItem, DeploymentItemSchema,
  Network, Networks,
  NetworkSchema, TokenItem, TokenItemSchema
} from "./schemas/mod.ts";
import { BaseStore } from "./baseStore.ts";
import z from "zod";
import { Addresses } from "lucid";

class AccountsStore extends BaseStore<AccountItem> {
  protected getItemSchema(): z.ZodSchema {
    return AccountItemSchema;
  }
  protected getStoreName(): string {
    return "accounts";
  }

  private isAddr(addressOrName: string): boolean {
    try {
      Addresses.addressToCredential(addressOrName);
      return true;
    } catch {
      return false;
    }
  }

  private _ensureAccount(predicate: (acc: AccountItem) => boolean, addressOrName: string): AccountItem {
    const account = this.data.find(predicate);  
    if (!account) {
      throw new Error(`Account not found: ${addressOrName}`);
    }
    return account;
  }
  
  ensureAddress(addressOrName: string, owner: boolean = false): string {
    if (!addressOrName) {
      throw new Error("Address is required");
    }
  
    if (this.isAddr(addressOrName)) {
      if (owner) {
        const account = this._ensureAccount(acc => acc.account.address === addressOrName, addressOrName);
        return account.account.address;
      }
      return addressOrName;
    } else {
      const account = this._ensureAccount(acc => acc.name === addressOrName, addressOrName);
      return account.account.address;
    }
  }

  ensureAccount(addressOrName: string): AccountItem {
    if (!addressOrName) {
      throw new Error("Address is required");
    }
    
    const predicate = this.isAddr(addressOrName)
      ? (acc: AccountItem) => acc.account.address === addressOrName
      : (acc: AccountItem) => acc.name === addressOrName;

    const account = this._ensureAccount(predicate, addressOrName);
    return account;
  }
}

class DeploymentsStore extends BaseStore<DeploymentItem> {
  protected getItemSchema(): z.ZodSchema {
    return DeploymentItemSchema;
  }
  protected getStoreName(): string {
    return "deployments";
  }
}

class TokensStore extends BaseStore<TokenItem> {
  protected getItemSchema(): z.ZodSchema {
    return TokenItemSchema;
  }
  protected getStoreName(): string {
    return "tokens";
  }
}

class StoresFacade {
  private _accountsStore: AccountsStore | null = null;
  private _tokensStore: TokensStore | null = null;
  private _deploymentsStore: DeploymentsStore | null = null;

  constructor(
    public network: Network
  ) { }

  get accountsStore(): AccountsStore {
    if (!this._accountsStore) {
      const filePath = `data/accounts.json`;
      this._accountsStore = new AccountsStore(filePath, this.network);
    }
    return this._accountsStore;
  }

  get tokensStore(): TokensStore {
    if (!this._tokensStore) {
      const filePath = `data/tokens.json`;
      this._tokensStore = new TokensStore(filePath, this.network);
    }
    return this._tokensStore;
  }

  get deploymentsStore(): DeploymentsStore {
    if (!this._deploymentsStore) {
      const filePath = `data/deployments.json`;
      this._deploymentsStore = new DeploymentsStore(filePath, this.network);
    }
    return this._deploymentsStore;
  }

  async initializeAll(force: boolean = false): Promise<void> {
    await Promise.all([
      this.accountsStore.init(force),
      this.tokensStore.init(force),
      this.deploymentsStore.init(force)
    ]);
  }

  async loadAll(): Promise<void> {
    await Promise.all([
      this.accountsStore.load(),
      this.tokensStore.load(),
      this.deploymentsStore.load()
    ]);
  }
}

export function getNetwork(): Network {
  const network = Deno.env.get("LUCID_NETWORK");
  if (!network) {
    throw new Error("LUCID_NETWORK environment variable is not set.");
  }
  const parsed = NetworkSchema.safeParse(network);
  if (!parsed.success) {
    throw new Error(`Invalid LUCID_NETWORK value: ${network}. Expected one of: ${Networks.join(", ")}`);
  }
  return parsed.data
}

// Singleton instance
export const stores = new StoresFacade(getNetwork());
