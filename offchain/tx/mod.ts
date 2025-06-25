import { Data, Lucid, OutRef, Tx, Utxo, DatumVariant, Assets, paymentCredentialOf, Addresses } from "lucid";
import { AssetClassT, RegistryDatum, RegistryDatumT, TransferDatum, TransferDatumT } from "../domain_types.ts";
import { assetToUnit } from "../common/assets.ts";
import { DeployedScript } from "../common/scripts.ts";
import { ScriptName, ScriptsBag } from "../../store/schemas/mod.ts";
import { addresses_drepToCredential } from "https://deno.land/x/lucid@0.20.11/rs_lib/pkg/lucid_core_bg.wasm";
import { toStoreAsset } from "../../store/schemas/common.ts";
import { viewUnit } from "../../cli/utils.ts";


export type TransferTarget = {
  address: string;
  amount: bigint;
}

function filterUtxosContainingAddresses(addresses: string[], utxos: Utxo[]): Utxo[] {
  const addrSet = new Set(addresses);
  const result: Utxo[] = [];

  for (const utxo of utxos) {
    if (addrSet.size === 0) {
      break;
    }
    if (!utxo.datum) {
      continue;
    }
    const datum = Data.from<RegistryDatumT>(
      utxo.datum,
      RegistryDatum as unknown as RegistryDatumT,
    );

    const tickets = datum.filter(d => addrSet.has(d));

    if (tickets.length > 0) {
      result.push(utxo);
      for (const ticket of tickets) {
        addrSet.delete(ticket);
      }
    }
  }
  if (addrSet.size > 0) {
    throw Error(`Not all addresses found in UTxOs: ${Array.from(addrSet).join(", ")}`);
  }
  return result;
}

function jsonToStr(obj: any): string {
  return JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value,
    2
  );
}

function getTransferDatum(hash: string): DatumVariant {
  return {
    Inline: Data.to<TransferDatumT>(hash, TransferDatum as unknown as TransferDatumT)
  };
}

// Select UTxOs to cover the total amount
function selectUtxosToCoverAmount(utxos: Utxo[], asset: AssetClassT, totalAmount: bigint): Utxo[] {
  const unit = assetToUnit(asset);
  const selectedUtxos: Utxo[] = [];
  let accumulatedAmount = 0n;
  for (const utxo of utxos) {
    if (accumulatedAmount >= totalAmount) {
      break;
    }
    selectedUtxos.push(utxo);
    accumulatedAmount += utxo.assets[unit];
  }
  if (accumulatedAmount < totalAmount) {
    throw Error("Not enough UTxOs to cover the transfer amount");
  }
  return selectedUtxos;
}

class OperationsBase {
  constructor(
    protected lucid: Lucid,
    protected adminToken: AssetClassT,
    protected scripts: ScriptsBag<DeployedScript>
  ) { }

  protected attachScripts(tx: Tx, scripts: ScriptName[]): Tx {
    for (const [scriptName, script] of Object.entries(this.scripts)) {
      if (scripts.includes(scriptName as ScriptName)) {
        if (script.kind === "inline") {
          console.log(`Attaching inline script: ${scriptName}`);
          tx.attachScript(script.script);
        } else if (script.kind === "deployed") {
          console.log(`Reading from deployed script: ${scriptName}`);
          tx = tx.readFrom([script.refUtxo]);
        } else {
          throw new Error(`Unknown script kind: ${(script as any).kind}`);
        }
      }
    }
    return tx;
  }

  protected newTx(attachScripts: ScriptName[]): Tx {
    const tx = this.lucid.newTx();
    this.attachScripts(tx, attachScripts);
    return tx;
  }

  protected async getCollateralUtxo(): Promise<Utxo> {
    const collateralUtxo = await this.lucid.wallet.getUtxos()
      .then(us => us
        .filter(u =>
          Object.keys(u.assets).length === 1
          && u.assets['lovelace']
          && u.assets['lovelace'] > 0n
        )
        .sort((b, a) => {
          if (a.assets['lovelace'] < b.assets['lovelace']) return -1;
          if (a.assets['lovelace'] > b.assets['lovelace']) return 1;
          return 0;
        })
      )
      .then(ux => ux[0]);
    return collateralUtxo;
  }
}

export class RegistryOps extends OperationsBase {
  constructor(
    lucid: Lucid,
    adminToken: AssetClassT,
    scripts: ScriptsBag<DeployedScript>
  ) {
    super(lucid, adminToken, scripts);
  }

  // address - in hex format
  private findUtxoToRemove(address: string, utxos: Utxo[]): [Utxo, DatumVariant | undefined] {
    let filteredUtxo: Utxo | undefined = undefined;
    let addrsToAddBack: string[] = [];

    for (const utxo of utxos) {
      if (!utxo.datum) {
        continue;
      }
      const datum = Data.from<RegistryDatumT>(
        utxo.datum,
        RegistryDatum as unknown as RegistryDatumT,
      );

      if (datum.includes(address)) {
        filteredUtxo = utxo;
        addrsToAddBack = datum.filter(d => d !== address);
        break;
      }
    }

    if (!filteredUtxo) {
      throw Error(`No UTxO found for address: ${address}`);
    }

    const addedBackDatum: DatumVariant | undefined = addrsToAddBack.length > 0
      ? {
        Inline: Data.to<RegistryDatumT>(
          addrsToAddBack,
          RegistryDatum as unknown as RegistryDatumT
        )
      }
      : undefined;

    return [filteredUtxo, addedBackDatum];
  }

  // address - in hex format
  add(addresses: string[]): Tx {
    console.log("Adding addresses to registry:", addresses);
    const hashes = addresses; // .map(a => paymentCredentialOf(a).hash);
    // console.log("Hashes:", hashes);
    console.log(`Length of hashes in bytes: ${hashes.map(h => h.length / 2).join(", ")} (Expect 28 for each)`);
    const datum: DatumVariant = {
      Inline: Data.to(hashes, RegistryDatum as unknown as RegistryDatumT)
    }
    console.log("Datum:", datum);
    const assets: Assets = {
      [assetToUnit(this.adminToken)]: 1n
    };

    return this.newTx(["AdminToken"])
      .mint(assets, Data.void())
      .addSigner("{{own.payment}}") // required by minting policy
      .payToContract(this.scripts.Registry.address, datum, assets)
  }

  async removeByUtxo(utxos: Utxo[]): Promise<Tx> {
    const unit = assetToUnit(this.adminToken);

    // Calculate the total amount of admin tokens in the UTxOs
    const totalAmount = utxos.reduce((acc, u) => {
      if (!u.assets || !u.assets[unit]) {
        return acc;
      }
      return acc + u.assets[assetToUnit(this.adminToken)];
    }, 0n);


    // const collateralUtxo = await this.getCollateralUtxo();
    // console.log("Collateral UTxO:", collateralUtxo);

    return this.newTx(["AdminToken", "Registry"])
      //.collectFrom([collateralUtxo])
      .collectFrom(utxos, Data.void())
      .mint({ [unit]: -1n * totalAmount }, Data.void())
      .addSigner("{{own.payment}}")
  }

  async removeByOutRef(outRefs: OutRef[]): Promise<Tx> {
    const utxos = await this.lucid.utxosByOutRef(outRefs)
    return await this.removeByUtxo(utxos);
  }

  // address - in hex format
  async removeByAddr(address: string): Promise<Tx> {
    const unit = assetToUnit(this.adminToken);
    const utxos = await this.lucid.utxosAtWithUnit(this.scripts.Registry.creds, assetToUnit(this.adminToken));

    const [utxoToSpend, addedBackDatum] = this.findUtxoToRemove(address, utxos);

    let tx = this.newTx(["Registry"])
      .collectFrom([utxoToSpend], Data.void())
      .mint({ [unit]: -1n * utxoToSpend.assets[unit] }, Data.void())
      .addSigner("{{own.payment}}")

    if (addedBackDatum) {
      tx = tx
        .payToContract(this.scripts.Registry.address, addedBackDatum, { [unit]: 1n })
        .mint({ [unit]: 1n }, Data.void());
    }

    if (!addedBackDatum || utxoToSpend.assets[unit] > 1n) {
      // If we need to burn tokens, then we need to attach the AdminToken script
      // If we just spent 1 token and mint it back at change UTxO - this doesn't involve burning and minting, rather just moving.
      // In this case we must not attach the AdminToken script. 
      // If you still attach it, then the transaction will fail with "ExtraneousScriptWitnessesUTXOW".
      this.attachScripts(tx, ["AdminToken"]);
      console.log("AdminToken script for minting/burning attached.");
    } else {
      console.log("No need to attach AdminToken script, just moving tokens.");
    }

    return tx;
  }
}

export class TransferOps extends OperationsBase {
  private whitelist: Utxo[] = [];

  constructor(
    lucid: Lucid,
    adminToken: AssetClassT,
    scripts: ScriptsBag<DeployedScript>,
    private sender: string, // Payment credential hash
  ) {
    super(lucid, adminToken, scripts);
  }

  private getSenderTicket(): Utxo {
    console.log(`Sender: ${this.sender}`);
    // console.log(`Whitelist: ${jsonToStr(this.whitelist)}`);
    console.log(`Searching for sender in whitelist...`);
    const senderTicket: Utxo | undefined = this.whitelist.find(u => {
      if (!u.datum) {
        return false
      }
      const datum = Data.from<RegistryDatumT>(
        u.datum,
        RegistryDatum as unknown as RegistryDatumT,
      );
      console.log(`Datum: ${datum.join(", ")}`);
      return datum.includes(this.sender);
    });

    if (!senderTicket) {
      throw Error("Sender ticket not found in whitelist");
    }
    return senderTicket;
  }

  private calculateChange(utxos: Utxo[], asset: AssetClassT, totalAmount: bigint): bigint {
    const unit = assetToUnit(asset);

    // Calculate accumulated amount of assets in the UTxOs
    const accumulatedAmount = utxos.reduce((acc, u) => {
      acc += u.assets[unit] || 0n;
      return acc;
    }, 0n)

    if (accumulatedAmount < totalAmount) {
      throw Error(`Not enough UTxOs to cover the transfer amount: ${accumulatedAmount} < ${totalAmount}`);
    }

    return accumulatedAmount - totalAmount;
  }

  async loadWhitelist(): Promise<void> {
    this.whitelist = await this.lucid.utxosAtWithUnit(
      this.scripts.Registry.creds,
      assetToUnit(this.adminToken)
    );
    console.log(`Loaded ${this.whitelist.length} whitelist UTxOs.`);
  }

  deposit(asset: AssetClassT, targets: TransferTarget[]): Tx {
    const tx = this.lucid.newTx()
    for (const target of targets) {
      const datum: DatumVariant = {
        Inline: Data.to<TransferDatumT>(target.address, TransferDatum as unknown as TransferDatumT)
      }
      const assets: Assets = {
        [assetToUnit(asset)]: target.amount
      };
      tx.payToContract(this.scripts.Transfer.address, datum, assets);
    }
    return tx;
  }

  async spend(asset: AssetClassT, utxos: Utxo[], targets: TransferTarget[]): Promise<Tx> {
    await this.loadWhitelist();
    const unit = assetToUnit(asset);
    const senderTicket: Utxo = this.getSenderTicket();
    const recipientsTickets: Utxo[] = filterUtxosContainingAddresses(
      targets.map(t => t.address),
      this.whitelist
    );

    console.log('Ticket unique addresses: ', [...new Set([
      senderTicket.address,
      ...recipientsTickets.map(r => r.address)
    ])]
      .map(addr => {
        const hash = Addresses.addressToCredential(addr).hash;
        return `${addr} (${hash})`;
      })
      .join("\n"));

    console.log([
      `UTxOs to spend: `,
      ...utxos.map(u => {
        const addr = u.address;
        const hash = Addresses.addressToCredential(addr).hash;
        return `  - ${addr} (${hash})`;
      }),
    ].join("\n"));

    const tx = this.newTx(["Transfer"])
      .readFrom([senderTicket])
      .readFrom(recipientsTickets)
      .collectFrom(utxos, Data.void())
      .addSigner("{{own.payment}}");

    console.log(`Transfer contract. Address: ${this.scripts.Transfer.address}, Hash: ${this.scripts.Transfer.creds.hash}`);

    for (const target of targets) {
      const datum = getTransferDatum(target.address);
      const assets: Assets = {
        [unit]: target.amount
      };
      tx.payToContract(this.scripts.Transfer.address, datum, assets);
    }

    // Calculate sender's change
    const totalAmount = targets.reduce((acc, target) => acc + target.amount, 0n);
    const senderChange = this.calculateChange(utxos, asset, totalAmount);

    if (senderChange > 0n) {
      console.log(`Sender change: ${senderChange}`);
      const datum = getTransferDatum(this.sender);
      tx.payToContract(this.scripts.Transfer.address, datum, {
        [unit]: senderChange
      });
    } else {
      console.log(`No sender change.`);
    }

    return tx;
  }

  async transfer(asset: AssetClassT, targets: TransferTarget[]): Promise<Tx> {
    const totalAmount = targets.reduce((acc, t) => acc + t.amount, 0n);
    const unit = assetToUnit(asset);
    const transferScript = this.scripts.Transfer;

    console.log(`Transfer contract params. ${transferScript.address} ${transferScript.creds.hash}`);

    const allUtxos = await this.lucid.utxosAtWithUnit(this.scripts.Transfer.creds, unit);

    console.log(`Found ${allUtxos.length} UTxOs for asset ${unit}.`);

    console.log(`Sender: ${this.sender}`);

    const ownUtxos = allUtxos.filter(u => {
      if (!u.datum) {
        return false
      }
      const datum = Data.from<TransferDatumT>(
        u.datum,
        TransferDatum as unknown as TransferDatumT,
      );
      return datum === this.sender;
    });

    if (ownUtxos.length === 0) {
      throw Error("No valid UTxOs found for transfer.");
    }

    const selectedUtxos = selectUtxosToCoverAmount(ownUtxos, asset, totalAmount)
    return await this.spend(asset, selectedUtxos, targets);
  }
}
