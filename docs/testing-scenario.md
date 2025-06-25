# Testing Scenario

## Prerequisites

Before running the testing commands, you need to:
- Initialize storage: `./man init`
- Generate accounts: `./man accounts add ...`
- Get some test ADA from the [faucet](https://docs.cardano.org/cardano-testnets/tools/faucet)
- Mint demo tokens: `./man mint ...`

After completing these steps, you're ready to deploy the registry with admin account specification. And then perform registry whitelist management and transfer operations.

## Testing Commands

**Deploy contracts**
```bash
./man deploy all --fund-id f2 --admin-addr a2
```
Deploy all contracts for fund f2 with admin a2

**Registry operations**
```bash
./man op --fund-id f2 --account a1 registry add 85b6903ed1d618073bed01e7240ff97a879cb5e6e080f74da1079b7c
```
Failed attempt - non-admin cannot add to registry

```bash
./man op --fund-id f2 --account a2 registry add 85b6903ed1d618073bed01e7240ff97a879cb5e6e080f74da1079b7c
```
Admin adds address to registry - success

```bash
./man op --fund-id f2 --account a2 registry add c7057b222e290d220f10497f3d7a38d7cafc7fe0b4f6ab846bd3c953 a3dded605762e998fba7e6938550a66f73031af899fb1309b5fcbdd5
```
Admin adds two more addresses to registry

**View registry**
```bash
./man view reg --fund-id f2
```
Show all registered addresses

**Deposit tokens**
```bash
./man op --fund-id f2 --account a1 transfer --asset f1f167caef58d4a5bbddabaa8fa29101d670d7ae593dd7901c5d4a7e:t1 deposit c7057b222e290d220f10497f3d7a38d7cafc7fe0b4f6ab846bd3c953:100000 85b6903ed1d618073bed01e7240ff97a879cb5e6e080f74da1079b7c:90000 a3dded605762e998fba7e6938550a66f73031af899fb1309b5fcbdd5:80000
```
Deposit tokens to transfer contract for 3 recipients

**View funds**
```bash
./man view funds --fund-id f2
```
Show token balances in transfer contract:

```
Found 3 Transfer UTxOs for 3 owners:

Owner: c7057b222e290d220f10497f3d7a38d7cafc7fe0b4f6ab846bd3c953
  Total Assets:
    - f1f167caef58d4a5bbddabaa8fa29101d670d7ae593dd7901c5d4a7e:t1 = 100000
  UTxOs:
    - b32b2fe50fb42910a3d562565ef87511fc4b4bc7d2817d7e35d2cae8cfce5faa#0. Assets:
        - f1f167caef58d4a5bbddabaa8fa29101d670d7ae593dd7901c5d4a7e:t1 = 100000

Owner: 85b6903ed1d618073bed01e7240ff97a879cb5e6e080f74da1079b7c
  Total Assets:
    - f1f167caef58d4a5bbddabaa8fa29101d670d7ae593dd7901c5d4a7e:t1 = 90000
  UTxOs:
    - b32b2fe50fb42910a3d562565ef87511fc4b4bc7d2817d7e35d2cae8cfce5faa#1. Assets:
        - f1f167caef58d4a5bbddabaa8fa29101d670d7ae593dd7901c5d4a7e:t1 = 90000

Owner: a3dded605762e998fba7e6938550a66f73031af899fb1309b5fcbdd5
  Total Assets:
    - f1f167caef58d4a5bbddabaa8fa29101d670d7ae593dd7901c5d4a7e:t1 = 80000
  UTxOs:
    - b32b2fe50fb42910a3d562565ef87511fc4b4bc7d2817d7e35d2cae8cfce5faa#2. Assets:
        - f1f167caef58d4a5bbddabaa8fa29101d670d7ae593dd7901c5d4a7e:t1 = 80000
```

**Transfer tokens**
```bash
./man op --fund-id f2 --account a1 transfer --asset f1f167caef58d4a5bbddabaa8fa29101d670d7ae593dd7901c5d4a7e:t1 to a3dded605762e998fba7e6938550a66f73031af899fb1309b5fcbdd5:10
```
Transfer 10 tokens from a1's balance to a3

**View final funds**
```bash
./man view funds --fund-id f2
```
Show updated token balances after transfer
