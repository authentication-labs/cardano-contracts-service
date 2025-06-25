# Cardano Funds

- [Cardano Funds](#cardano-funds)
  - [Tech Stack](#tech-stack)
  - [Project Structure](#project-structure)
  - [Usage](#usage)
    - [Overview](#overview)
    - [Scripts Source Parameter: `inline` or from `outref`](#scripts-source-parameter-inline-or-from-outref)
    - [`man` CLI Tool Commands](#man-cli-tool-commands)
    - [REST API](#rest-api)
  - [Cardano services](#cardano-services)
  - [Demo](#demo)
  - [Cardano Errors Troubleshooting](#cardano-errors-troubleshooting)
    - [InsufficientCollateral](#insufficientcollateral)
    - [ExtraneousScriptWitnessesUTXOW](#extraneousscriptwitnessesutxow)

Project is build based on [Cardano Funds Technical Requirements](./docs/technical-requirements.md) document. See it for hight-level overview of the project.

## Tech Stack

- **Cardano** - Blockchain platform
- **TypeScript** - Programming language for offchain code, CLI, REST API
- **Deno** - TypeScript runtime

Cardano interaction:
- **Aiken** - Smart contract language for Cardano blockchain
- **Lucid** - Typescript Library for building Cardano transactions

REST API libs:
- **Zod** - TypeScript schema validation library
- **OpenAPI** - Specification for building APIs
- **Swagger UI** - Provide Web UI for API documentation


## Project Structure

- `cli/` - Command-line interface for project management
- `data/` - Data files (accounts, deployments, tokens)
- `docs/` - Technical requirements and documentation
- `libs/` - Shared libraries and utilities
- `manage/` - Tools for smart contract deployment, rebuild. And operations facade.
- `offchain/` - Code for creating valid transactions
- `onchain/` - Aiken smart contracts for Cardano blockchain
- `rest_api/` - REST API server with OpenAPI documentation
- `scripts/` - AdHoc scripts
- `store/` - Data persistence layer with Zod schemas

## Usage

### Overview

Environment variables are stored in `.env` file, which is loaded by the CLI and scripts. See `.env.example` for reference.

Run arbitrary deno script:

    deno run -A --env-file $script

Type check:

    deno check

Aiken:

    cd onchain
    aiken check                         # Run Tests
    aiken build                         # For production   
    aiken build --trace-level verbose   # For debugging

Management CLI:

    ./man --help
    
Run script from `scripts/` directory    
    
    ./script $script_name <args...>


### Scripts Source Parameter: `inline` or from `outref`

Default value is defined by `CONTRACT_REF_TYPE` env variable.

This parameter affects how smart contracts are referenced in transactions:
- `inline` - contract script is attached directly to the transaction (useful for debugging)
- `outref` - contract references pre-deployed UTXO with scriptRef (recommended for production)

For debugging, inline is more convenient since you can use `./man rebuild` to quickly recompile without redeploying. This allows local testing (test different smart contract implementations or add traces) against various transactions without the need to redeploy contracts.


### `man` CLI Tool Commands

This tool is used to manage the project, deploy contracts, and perform operations on the Cardano blockchain.

- `init` - Initialize project files
  - `deployments` - Create new deployments/deployments.json
  - `accounts` - Create new data/accounts.json
  - `tokens` - Create new data/tokens.json. Transfer tokens.
- `accounts` - Accounts management
  - `add` - Generate new account
  - `rm` - Remove account
  - `list` - List accounts
  - `send` - Send assets
- `mint` - Mint demo tokens for transfers
- `deploy` - Deploy contracts
  - `all` - Deploy all contracts
  - `admin-token` - Deploy admin token
  - `registry` - Deploy registry
  - `transfer` - Deploy transfer
- `rebuild` - Rebuild contracts
- `op` - Perform operations
  - `registry` - Registry operations
    - `add` - Add addresses to registry
    - `rm` - Remove from registry
      - `addr` - Remove address
      - `outref` - Remove outref
  - `transfer` - Transfer operations
    - `deposit` - Lock tokens in transfer smart contract
    - `to` - Transfer to targets
    - `spend` - Spend outrefs to targets
- `view` - View blockchain stuff...
  - `reg` - View UTxOs at the Registry script address
  - `whitelist` - View Whitelist at the Registry
  - `funds` - List all Transfer UTxOs grouped by owner
- `scripts` - Cardano scripts inspection
  - `info` - Show script info
- `env` - Show environment variables

### REST API

To start the REST API server, run:

```bash
deno task api
```

This will start the server on `http://localhost:3000` and serve the OpenAPI documentation. You can trigger the API endpoints from Swagger UI at `http://localhost:3000/openapi`. 


## Cardano services

You can use the following services to interact with the Cardano blockchain:

- [Testnet Faucet](https://docs.cardano.org/cardano-testnets/tools/faucet) to get some test ADA (in order to pay fees for transactions).
- Explorers
  - https://cardanoscan.io/ https://preview.cardanoscan.io/
  - https://cexplorer.io/ https://preview.cexplorer.io/


## Demo

Sequence:

- `./man init` - initialize data storage for deployments, accounts and tokens.
- `./man accounts` - generate new Cardano wallet accounts, stored in `data/accounts.json`.
- use [faucet](https://docs.cardano.org/cardano-testnets/tools/faucet) - fund accounts with test ADA from Cardano testnet faucet.
- `./man mint` - create custom tokens (saved in `data/tokens.json`).
- `./man deploy` - deploy Aiken smart contracts, records saved in `data/deployments.json`.
- `./man op` - execute operations on blockchain with deployed contracts (transfers, registry interactions).

See [Testing Scenario](./docs/testing-scenario.md) for more details.

## Cardano Errors Troubleshooting

### InsufficientCollateral

```
error: Uncaught (in promise) Error: {"contents":{"contents":{"contents":{"era":"ShelleyBasedEraConway","error":["ConwayUtxowFailure (UtxoFailure (InsufficientCollateral (DeltaCoin (-3972116159)) (Coin 372153)))","ConwayUtxowFailure (UtxoFailure (IncorrectTotalCollateralField (DeltaCoin (-3972116159)) (Coin 372153)))","ConwayUtxowFailure (UtxoFailure NoCollateralInputs)","ConwayUtxowFailure (UtxoFailure (BadInputsUTxO (fromList [TxIn (TxId {unTxId = SafeHash \"e98017a685c546d846d1e20529eb5282c7bed6e3ac31b0887ffd44ab3e543271\"}) (TxIx {unTxIx = 1})])))","ConwayUtxowFailure (UtxoFailure (ValueNotConservedUTxO (Mismatch {mismatchSupplied = MaryValue (Coin 0) (MultiAsset (fromList [(PolicyID {policyID = ScriptHash \"ea24da0f99f438dce13d2ea5be44201b4645b5d0fd33afdb5d8e444c\"},fromList [(\"6631\",1)])])), mismatchExpected = MaryValue (Coin 3972488312) (MultiAsset (fromList [(PolicyID {policyID = ScriptHash \"ea24da0f99f438dce13d2ea5be44201b4645b5d0fd33afdb5d8e444c\"},fromList [(\"6631\",1)])]))})))","ConwayUtxowFailure (UtxoFailure (UtxosFailure (CollectErrors [BadTranslation (BabbageContextError (AlonzoContextError (TranslationLogicMissingInput (TxIn (TxId {unTxId = SafeHash \"e98017a685c546d846d1e20529eb5282c7bed6e3ac31b0887ffd44ab3e543271\"}) (TxIx {unTxIx = 1})))))])))"],"kind":"ShelleyTxValidationError"},"tag":"TxValidationErrorInCardanoMode"},"tag":"TxCmdTxSubmitValidationError"},"tag":"TxSubmitFail"}
```

This error indicates that the transaction failed due to insufficient collateral. It may happen because information about UToXs is not yet propagated through the network, so the transaction is not valid at the moment of submission. Usually you can just try again.

### ExtraneousScriptWitnessesUTXOW

```
error: Uncaught (in promise) Error: {"contents":{"contents":{"contents":{"era":"ShelleyBasedEraConway","error":["ConwayUtxowFailure (ExtraneousScriptWitnessesUTXOW (fromList [ScriptHash \"ea24da0f99f438dce13d2ea5be44201b4645b5d0fd33afdb5d8e444c\"]))"],"kind":"ShelleyTxValidationError"},"tag":"TxValidationErrorInCardanoMode"},"tag":"TxCmdTxSubmitValidationError"},"tag":"TxSubmitFail"}
```

Possible causes:
- The obvious cause: You are trying to submit a transaction with a script attached, but the script is not actually used in the transaction. 
- There is no mint and burn operations, just transfer of tokens (i.e. 1 spent at input and 1 sent to output), but you've attached minting policy.
