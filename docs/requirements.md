# Whitelisted Access Control System for Funds

## Project Goal

Create a system in which token transfers are restricted to a whitelisted group of accounts. Only whitelisted accounts can send or receive tokens. The system must support multiple registries, each with its own whitelist. Tokens can only be transferred between participants within the same registry.

## Implementation Details on the Cardano Platform

* To restrict asset transfers, the asset must be locked within a smart contract. It's not possible to restrict tokens that reside in a user's wallet.
* Therefore, all asset transfers must occur within the smart contract. Tokens can be deposited into the contract, but not withdrawn. Withdrawing or burning tokens is out of the MVP scope.

## Smart Contracts

### Admin Token Policy

This token is used solely to mark UTxOs created by the administrator. On Cardano, any user can create a UTxO with arbitrary data and send it to any smart contract address. So, we need a way to validate that a given UTxO was created by the administrator.

Only the administrator has the right to mint this token. This allows us to verify that any UTxO containing the admin token was indeed created by the admin.

Each registry will have its own admin token.

**Admin token policy** is a parameterized contract with the following parameters:

* `FundID` — used as the asset name.
* `Admin address` — the address that has minting rights.

### Registry (Whitelist Management)

A parameterized contract that manages a whitelist of addresses for a specific registry (identified by FundID).

**Parameters:**

* Policy ID of the admin token — used to mark UTxOs created by the admin.
* Admin address — only the admin is allowed to spend UTxOs containing the admin token.

#### Deployment

After substituting the parameters and compiling the parameterized smart contract, we get an instance of the admin contract for a specific registry (FundID). This instance is then deployed to the blockchain. The transaction metadata includes the FundID to identify the registry.

#### Operations

The smart contract provides two operations, both performed by the administrator:

* **Add an address to the whitelist:** A new UTxO is created, containing the admin token to mark it as valid.
* **Remove an address from the whitelist:** The corresponding UTxO is spent and the admin token burned.

Each address is stored in a separate UTxO. Adding a new address creates a new UTxO; removing an address spends and deletes its UTxO.

### Transfer Contract

A parameterized smart contract. Parameters:

* Address of the registry contract where whitelisted UTxOs reside.
* Admin token policy ID.

To verify that both sender and receiver are whitelisted in the given registry, the transaction must include **reference inputs** from the registry contract—UTxOs with the sender’s and receiver’s addresses.

**Spending conditions:**

* The number of tokens spent from the contract must equal the number of tokens received back into the contract. This enforces that funds cannot leave the contract.
* Verify the sender and recipient addresses:

  * Reference UTxOs must come from the admin registry contract.
  * Each reference UTxO must contain the admin token.
  * The datum of the reference UTxOs must include the sender and recipient addresses.
* The transaction must be signed by the current owner of the tokens being transferred.

## Special Considerations

The transfer contract can accept any tokens (with an owner specified in the datum). However, transfers between owners within the contract are only allowed if both parties are whitelisted.

### Creating a New Registry

The following steps are performed to create a new registry:

* Create the admin token policy.
* Deploy an instance of the registry contract.
* Deploy an instance of the transfer contract.
* Deploy both contracts to the blockchain and record the FundID in the transaction metadata.

After that, the system is ready to:

* Manage the whitelist (admin operations).
* Accept token deposits to the transfer contract.
* Enable token transfers between whitelisted members within the transfer contract.

## REST API Service

**Endpoints:**

* `POST /registries` — Create a new registry
* `GET /registries/{fundId}` — Get registry metadata
* `GET /registries/{fundId}/whitelist` — Get the list of whitelisted addresses
* `POST /registries/{fundId}/whitelist` — Add an address to the whitelist
* `DELETE /registries/{fundId}/whitelist/{address}` — Remove an address from the whitelist

According to discussions with Humayun, the backend will store data about deployed contracts in a local database.

## Deliverables

All source code will be published on GitHub and access will be granted to specified accounts.

**Deliverables:**

* On-chain validator code in Aiken
* Off-chain code for executing operations and deploying contracts (TypeScript + Lucid)
* REST API service (TypeScript, Express, DB, lucid)
