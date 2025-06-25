import { z } from "zod";
import { Network, Store } from "./schemas/mod.ts";
import { writeJsonFile, fileExists } from "./files.ts";
import { storeSchema } from "./schemas/common.ts";

export abstract class BaseStore<TItem> {
  protected _data: Store<TItem>;
  protected filePath: string;
  protected network: Network;

  private schema: z.ZodSchema<Store<TItem>>;

  constructor(filePath: string, network: Network) {
    this.filePath = filePath;
    this.network = network;
    this._data = this.getEmptyData();

    this.schema = storeSchema(this.getItemSchema());
  }

  private getEmptyData(): Store<TItem> {
    return {
      Mainnet: [],
      Preprod: [],
      Preview: [],
    };
  }

  protected abstract getItemSchema(): z.ZodSchema<TItem>;
  protected abstract getStoreName(): string;

  async init(force: boolean = false): Promise<void> {
    console.log(`force: ${force}`);
    this._data = this.getEmptyData();
    // Check if the file already exists
    const fileExistsFlag = await fileExists(this.filePath);
    if (fileExistsFlag && !force) {
      throw new Error(`Store ${this.getStoreName()} already exists. Use force option to overwrite.`);
    }
    await this.save();
  }

  async load(): Promise<void> {
    const content = await Deno.readTextFile(this.filePath).catch(() => {
      throw new Error(`File not found: ${this.filePath}. Initialize ${this.getStoreName()} store first.`);
    });
    
    const parsed = JSON.parse(content);

    // Validate the parsed data against the schema
    const result = this.schema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`Invalid data in ${this.getStoreName()} store: ${result.error.message}`);
    }
    this._data = result.data;
    // console.log(`Loaded ${this.getStoreName()} store from ${this.filePath}, data: ${JSON.stringify(this._data)}`);
  }

  async save(): Promise<void> {
    await writeJsonFile(this.filePath, this._data);
  }

  add(item: TItem): void {
    if (Array.isArray(this.data)) {
      this.data.push(item);
    } else {
      throw new Error(`Cannot add item to non-array data`);
    }
  }

  remove(predicate: (item: TItem) => boolean): boolean {
    if (Array.isArray(this.data)) {
      const index = this.data.findIndex(predicate);
      if (index !== -1) {
        this.data.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  get data(): TItem[] {
    return this._data[this.network] || [];
  }
}
