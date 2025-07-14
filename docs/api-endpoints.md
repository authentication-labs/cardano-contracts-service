# Cardano Contracts Service - API Endpoints Documentation

## Overview

This service provides a comprehensive API for managing Cardano smart contracts, token registries, and transfer operations. The system supports fund management, user whitelisting, token registration, and purchase functionality.

## Core Functionalities

### 1. **Fund Registry Management**
- Create and manage fund registries
- Control access through admin tokens

### 2. **User Whitelisting**
- Add/remove user payment credential hashes to fund whitelists
- Control who can participate in fund operations

### 3. **Token Contract Registration**
- Register token policy IDs for funds
- Associate tokens with specific funds for purchase operations

### 4. **Token Purchase System**
- Allow whitelisted users to purchase tokens from funds
- Secure transfer operations with validation

---

## API Endpoints

### Health Check

#### **Health Check**
```http
GET /healthcheck
```

**Response:**
```json
{
  "message": "API is up and running!"
}
```

### Registry Management

#### **Create Registry**
```http
POST /registries
```

**Request Body:**
```json
{
  "fundId": "fund123",
  "adminAddr": "addr_test1vp57sedtqw47d8yw8lh8vmdx88rdxq0fvq0z8da2t6zzpjsj664j2"
}
```

**Response:**
```json
{
  "fundId": "fund123",
  "network": "Preprod",
  "params": {
    "adminToken": {
      "policy": "abcd1234...",
      "name": "admin_token"
    }
  },
  "buildArgs": {
    "Registry": {
      "adminAddr": "addr_test1vp57sedtqw47d8yw8lh8vmdx88rdxq0fvq0z8da2t6zzpjsj664j2"
    }
  }
}
```

#### **Get Registry**
```http
GET /registries/{fundId}
```

**Response:**
```json
{
  "fundId": "fund123",
  "network": "Preprod",
  "params": { ... },
  "buildArgs": { ... }
}
```

### User Whitelisting

#### **Add Users to Whitelist**
```http
POST /registries/{fundId}/whitelist
```

**Request Body:**
```json
{
  "addresses": [
    "abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
    "efgh5678901234efgh5678901234efgh5678901234efgh5678901234efgh567890"
  ]
}
```

**Response:**
```json
{
  "success": true
}
```

#### **Get Whitelist**
```http
GET /registries/{fundId}/whitelist
```

**Response:**
```json
[
  "abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
  "efgh5678901234efgh5678901234efgh5678901234efgh5678901234efgh567890"
]
```

#### **Remove User from Whitelist**
```http
DELETE /registries/{fundId}/whitelist/{address}
```

**Response:**
```json
{
  "success": true
}
```

### Token Contract Registration

#### **Add Token Contract**
```http
POST /registries/{fundId}/tokens
```

**Request Body:**
```json
{
  "policyId": "9d52489d9c475b7c2847cec2b4a154c0b9c887967c57015071633229"
}
```

**Response:**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "fundId": "fund123",
  "tokenContractAddr": "addr_test1...",
  "asset": {
    "policy": "9d52489d9c475b7c2847cec2b4a154c0b9c887967c57015071633229",
    "name": "token_fund123_1705312200000"
  }
}
```

#### **Get Token Contracts**
```http
GET /registries/{fundId}/tokens
```

**Response:**
```json
[
  {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "fundId": "fund123",
    "tokenContractAddr": "addr_test1...",
    "asset": {
      "policy": "9d52489d9c475b7c2847cec2b4a154c0b9c887967c57015071633229",
      "name": "token_fund123_1705312200000"
    }
  }
]
```

#### **Get Token Policies**
```http
GET /registries/{fundId}/policies
```

**Response:**
```json
[
  "9d52489d9c475b7c2847cec2b4a154c0b9c887967c57015071633229",
  "f1f167caef58d4a5bbddabaa8fa29101d670d7ae593dd7901c5d4a7e"
]
```

#### **Remove Token Contract**
```http
DELETE /registries/{fundId}/tokens/{policyId}
```

**Response:**
```json
{
  "success": true
}
```

### Transfer Operations

#### **Deposit Tokens**
```http
POST /transfers/{fundId}/deposit
```

**Request Body:**
```json
{
  "asset": "policyId:assetNameTxt",
  "account": "account_alias_or_bech32_address",
  "targets": ["credentialHash:amount"]
}
```

**Validation:**
- Token must be registered with the fund
- Sender must have sufficient balance
- Target format must be `credentialHash:amount`
- All amounts must be greater than 0

**Response:**
```json
{
  "success": true
}
```

**Error Examples:**
```json
{
  "error": "Token with policy ID 3943354a4d255889dd93a1c09b3317915b2108c03ff4387fa1dd8b6b is not registered for fund 686c0c6dc5f1291f1c52971d"
}
```
```json
{
  "error": "Insufficient balance. Available: 5000, Required: 10000"
}
```

### Deposit Operations

#### **Deposit Tokens to Transfer Contract**
```http
POST /transfers/{fundId}/deposit
```

**Description:**
Deposits tokens from a sender's account into the transfer contract for a specific fund. This is a prerequisite for token purchases.

**Request Body:**
```json
{
  "asset": "policyId:assetNameTxt",
  "account": "account_alias_or_bech32_address",
  "targets": ["credentialHash:amount"]
}
```

**Parameters:**
- `fundId` (path): Unique identifier for the fund
- `asset` (body): Asset in `policyId:assetNameTxt` format
- `account` (body): Sender's account alias or bech32 address
- `targets` (body): Array of targets in `credentialHash:amount` format

**Validation Rules:**
1. **Fund Existence**: Fund must exist in the registry
2. **Token Registration**: Token must be registered with the fund
3. **Asset Format**: Must follow `policyId:assetName` format
4. **Target Format**: Each target must follow `credentialHash:amount` format
5. **Amount Validation**: All amounts must be greater than 0
6. **Sender Balance**: Sender must have sufficient tokens to deposit
7. **Total Amount**: Total deposit amount must not exceed sender's balance

**Response:**
```json
{
  "success": true
}
```

**Error Responses:**

**Token Not Registered:**
```json
{
  "error": "Token with policy ID 3943354a4d255889dd93a1c09b3317915b2108c03ff4387fa1dd8b6b is not registered for fund 686c0c6dc5f1291f1c52971d"
}
```

**Invalid Asset Format:**
```json
{
  "error": "Invalid asset format. Expected format: policyId:assetName, got: 3943354a4d255889dd93a1c09b3317915b2108c03ff4387fa1dd8b6b"
}
```

**Invalid Target Format:**
```json
{
  "error": "Invalid target format. Expected format: credentialHash:amount, got: a9ed5d2f7dfcff93e8e6e1d88e3e47c55fe8174f5d97099ba129ed39"
}
```

**Insufficient Balance:**
```json
{
  "error": "Insufficient balance. Available: 5000, Required: 10000"
}
```

**Invalid Amount:**
```json
{
  "error": "Invalid amount in target a9ed5d2f7dfcff93e8e6e1d88e3e47c55fe8174f5d97099ba129ed39:0. Amount must be greater than 0"
}
```

**Usage Examples:**

**Single Target Deposit:**
```bash
curl -X POST http://localhost:3000/transfers/686c0c6dc5f1291f1c52971d/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "3943354a4d255889dd93a1c09b3317915b2108c03ff4387fa1dd8b6b:ayotoken",
    "account": "addr_test1vp57sedtqw47d8yw8lh8vmdx88rdxq0fvq0z8da2t6zzpjsj664j2",
    "targets": ["a9ed5d2f7dfcff93e8e6e1d88e3e47c55fe8174f5d97099ba129ed39:10000"]
  }'
```

**Multiple Targets Deposit:**
```bash
curl -X POST http://localhost:3000/transfers/686c0c6dc5f1291f1c52971d/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "3943354a4d255889dd93a1c09b3317915b2108c03ff4387fa1dd8b6b:ayotoken",
    "account": "addr_test1vp57sedtqw47d8yw8lh8vmdx88rdxq0fvq0z8da2t6zzpjsj664j2",
    "targets": [
      "a9ed5d2f7dfcff93e8e6e1d88e3e47c55fe8174f5d97099ba129ed39:5000",
      "b5896daaefd576a7cdf4fb19900fc412e2739f125c10cc502110cc59:3000"
    ]
  }'
```

**Pre-Deposit Validation Steps:**
1. **Check Fund Status:**
   ```bash
   curl -X GET http://localhost:3000/registries/686c0c6dc5f1291f1c52971d
   ```

2. **Verify Token Registration:**
   ```bash
   curl -X GET http://localhost:3000/registries/686c0c6dc5f1291f1c52971d/policies
   ```

3. **Check Current Funds:**
   ```bash
   curl -X GET http://localhost:3000/transfers/686c0c6dc5f1291f1c52971d/funds
   ```

**Post-Deposit Verification:**
```bash
curl -X GET http://localhost:3000/transfers/686c0c6dc5f1291f1c52971d/funds
```

**Business Logic:**
- Tokens are moved from the sender's wallet to the transfer contract
- Each target receives the specified amount of tokens
- Tokens remain locked in the contract until purchased or transferred
- Only whitelisted users can purchase deposited tokens
- The sender must sign the transaction to authorize the deposit

**Security Considerations:**
- Sender must have sufficient balance for the total deposit amount
- All amounts are validated to prevent zero or negative transfers
- Asset format validation prevents malformed requests
- Target format validation ensures proper recipient specification

#### **Transfer Tokens**
```http
POST /transfers/{fundId}/transfer
```

**Request Body:**
```json
{
  "asset": "policyId:assetNameTxt",
  "account": "account_alias_or_bech32_address",
  "targets": ["credentialHash:amount"]
}
```

#### **Spend Specific UTxOs**
```http
POST /transfers/{fundId}/spend
```

**Request Body:**
```json
{
  "asset": "policyId:assetNameTxt",
  "account": "account_alias_or_bech32_address",
  "outrefs": "txHash#outputIndex",
  "targets": ["credentialHash:amount"]
}
```

#### **Get Transfer Funds**
```http
GET /transfers/{fundId}/funds
```

**Response:**
```json
[
  {
    "owner": "credentialHash",
    "totalAssets": {
      "policyId:assetName": "1000"
    },
    "utxos": [
      {
        "outRef": "txHash#outputIndex",
        "assets": {
          "policyId:assetName": "1000"
        }
      }
    ]
  }
]
```

### Purchase Operations

#### **Purchase Tokens**
```http
POST /transfers/{fundId}/purchase
```

**Request Body:**
```json
{
  "asset": "policyId:assetNameTxt",
  "account": "account_alias_or_bech32_address",
  "amount": "1000",
  "paymentCredentialHash": "a9ed5d2f7dfcff93e8e6e1d88e3e47c55fe8174f5d97099ba129ed39"
}
```

**Validation:**
- Token must be registered with the fund
- User must be whitelisted for the fund
- Sufficient tokens must be available in transfer contract
- Amount must be greater than 0
- Asset format must be `policyId:assetName`

**Response:**
```json
{
  "success": true
}
```

**Error Examples:**
```json
{
  "error": "Token with policy ID 3943354a4d255889dd93a1c09b3317915b2108c03ff4387fa1dd8b6b is not registered for fund 686c0c6dc5f1291f1c52971d"
}
```
```json
{
  "error": "Payment credential hash a9ed5d2f7dfcff93e8e6e1d88e3e47c55fe8174f5d97099ba129ed39 is not whitelisted for fund 686c0c6dc5f1291f1c52971d"
}
```
```json
{
  "error": "Insufficient balance. Available: 5000, Requested: 10000"
}
```

---

## Complete Flow Examples

### **Scenario 1: Fund Setup and Token Registration**

1. **Create a Fund Registry**
```bash
curl -X POST http://localhost:3000/registries \
  -H "Content-Type: application/json" \
  -d '{
    "fundId": "my_fund_001",
    "adminAddr": "addr_test1vp57sedtqw47d8yw8lh8vmdx88rdxq0fvq0z8da2t6zzpjsj664j2"
  }'
```

2. **Add Token Contract**
```bash
curl -X POST http://localhost:3000/registries/my_fund_001/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "9d52489d9c475b7c2847cec2b4a154c0b9c887967c57015071633229"
  }'
```

3. **View All Token Policies**
```bash
curl -X GET http://localhost:3000/registries/my_fund_001/policies
```

4. **Remove Token Contract** (if needed)
```bash
curl -X DELETE http://localhost:3000/registries/my_fund_001/tokens/9d52489d9c475b7c2847cec2b4a154c0b9c887967c57015071633229
```

### **Scenario 2: User Onboarding and Purchase**

1. **Add User to Whitelist**
```bash
curl -X POST http://localhost:3000/registries/my_fund_001/whitelist \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": ["abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab"]
  }'
```

2. **User Purchases Tokens**
```bash
curl -X POST http://localhost:3000/transfers/my_fund_001/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "9d52489d9c475b7c2847cec2b4a154c0b9c887967c57015071633229:t1",
    "account": "admin_account",
    "amount": "1000",
    "paymentCredentialHash": "a9ed5d2f7dfcff93e8e6e1d88e3e47c55fe8174f5d97099ba129ed39"
  }'
```

### **Scenario 3: Token Management**

1. **Deposit Tokens to Contract**
```bash
curl -X POST http://localhost:3000/transfers/my_fund_001/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "9d52489d9c475b7c2847cec2b4a154c0b9c887967c57015071633229:t1",
    "account": "admin_account",
    "targets": ["abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab:1000"]
  }'
```

2. **Check Available Funds**
```bash
curl -X GET http://localhost:3000/transfers/my_fund_001/funds
```

### **Scenario 4: Real-World Example with Minted Token**

1. **Mint Token** (using CLI)
```bash
./man mint --account addr_test1vp57sedtqw47d8yw8lh8vmdx88rdxq0fvq0z8da2t6zzpjsj664j2 --name t1 --amount 1000000000
```

2. **Register Token with Fund**
```bash
curl -X POST http://localhost:3000/registries/fund_001/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "9d52489d9c475b7c2847cec2b4a154c0b9c887967c57015071633229"
  }'
```

3. **Add User to Whitelist**
```bash
curl -X POST http://localhost:3000/registries/fund_001/whitelist \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": ["abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab"]
  }'
```

4. **Purchase Tokens**
```bash
curl -X POST http://localhost:3000/transfers/fund_001/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "9d52489d9c475b7c2847cec2b4a154c0b9c887967c57015071633229:t1",
    "account": "admin_account",
    "amount": "1000",
    "paymentCredentialHash": "a9ed5d2f7dfcff93e8e6e1d88e3e47c55fe8174f5d97099ba129ed39"
  }'
```

### **Scenario 5: Token Policy Management**

1. **Add Multiple Token Contracts**
```bash
# Add first token
curl -X POST http://localhost:3000/registries/fund_001/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "9d52489d9c475b7c2847cec2b4a154c0b9c887967c57015071633229"
  }'

# Add second token
curl -X POST http://localhost:3000/registries/fund_001/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "f1f167caef58d4a5bbddabaa8fa29101d670d7ae593dd7901c5d4a7e"
  }'
```

2. **View All Token Policies**
```bash
curl -X GET http://localhost:3000/registries/fund_001/policies
```

3. **View Detailed Token Contracts**
```bash
curl -X GET http://localhost:3000/registries/fund_001/tokens
```

4. **Remove Specific Token Policy**
```bash
curl -X DELETE http://localhost:3000/registries/fund_001/tokens/f1f167caef58d4a5bbddabaa8fa29101d670d7ae593dd7901c5d4a7e
```

5. **Verify Removal**
```bash
curl -X GET http://localhost:3000/registries/fund_001/policies
```

### **Scenario 6: Complete Deposit and Purchase Flow with Validation**

1. **Check Fund Status**
```bash
# Verify fund exists
curl -X GET http://localhost:3000/registries/686c0c6dc5f1291f1c52971d

# Check whitelist
curl -X GET http://localhost:3000/registries/686c0c6dc5f1291f1c52971d/whitelist

# Check registered tokens
curl -X GET http://localhost:3000/registries/686c0c6dc5f1291f1c52971d/policies
```

2. **Add User to Whitelist** (if not already done)
```bash
curl -X POST http://localhost:3000/registries/686c0c6dc5f1291f1c52971d/whitelist \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": ["a9ed5d2f7dfcff93e8e6e1d88e3e47c55fe8174f5d97099ba129ed39"]
  }'
```

3. **Register Token** (if not already done)
```bash
curl -X POST http://localhost:3000/registries/686c0c6dc5f1291f1c52971d/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "3943354a4d255889dd93a1c09b3317915b2108c03ff4387fa1dd8b6b"
  }'
```

4. **Check Available Funds Before Deposit**
```bash
curl -X GET http://localhost:3000/transfers/686c0c6dc5f1291f1c52971d/funds
```

5. **Deposit Tokens to Transfer Contract**
```bash
curl -X POST http://localhost:3000/transfers/686c0c6dc5f1291f1c52971d/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "3943354a4d255889dd93a1c09b3317915b2108c03ff4387fa1dd8b6b:ayotoken",
    "account": "addr_test1vp57sedtqw47d8yw8lh8vmdx88rdxq0fvq0z8da2t6zzpjsj664j2",
    "targets": ["a9ed5d2f7dfcff93e8e6e1d88e3e47c55fe8174f5d97099ba129ed39:10000"]
  }'
```

6. **Verify Tokens are Available**
```bash
curl -X GET http://localhost:3000/transfers/686c0c6dc5f1291f1c52971d/funds
```

7. **Purchase Tokens**
```bash
curl -X POST http://localhost:3000/transfers/686c0c6dc5f1291f1c52971d/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "3943354a4d255889dd93a1c09b3317915b2108c03ff4387fa1dd8b6b:ayotoken",
    "account": "addr_test1vp57sedtqw47d8yw8lh8vmdx88rdxq0fvq0z8da2t6zzpjsj664j2",
    "amount": "10000",
    "paymentCredentialHash": "a9ed5d2f7dfcff93e8e6e1d88e3e47c55fe8174f5d97099ba129ed39"
  }'
```

8. **Verify Purchase Success**
```bash
curl -X GET http://localhost:3000/transfers/686c0c6dc5f1291f1c52971d/funds
```

---

## Error Handling

### Common Error Responses

#### **Validation Errors**
```json
{
  "error": "Fund ID is required"
}
```

#### **Business Logic Errors**
```json
{
  "error": "Payment credential hash is not whitelisted for fund my_fund_001"
}
```

#### **Not Found Errors**
```json
{
  "error": "Registry not found: invalid_fund_id"
}
```

#### **Purchase Validation Errors**
```json
{
  "error": "Purchase amount must be greater than 0"
}
```

---

## Data Formats

### **Payment Credential Hash**
- 56-character hex string (28 bytes)
- Example: `a9ed5d2f7dfcff93e8e6e1d88e3e47c55fe8174f5d97099ba129ed39`

### **Asset Format**
- Format: `policyId:assetNameTxt`
- Example: `9d52489d9c475b7c2847cec2b4a154c0b9c887967c57015071633229:t1`

### **Target Format**
- Format: `credentialHash:amount`
- Example: `a9ed5d2f7dfcff93e8e6e1d88e3e47c55fe8174f5d97099ba129ed39:1000`

### **Account Format**
- Can be either:
  - Account alias (e.g., `admin_account`)
  - Bech32 address (e.g., `addr_test1vp57sedtqw47d8yw8lh8vmdx88rdxq0fvq0z8da2t6zzpjsj664j2`)

---

## Security Considerations

1. **Whitelist Validation**: All purchase operations require whitelist membership
2. **Admin Token Control**: Registry operations require admin token ownership
3. **Ownership Verification**: Users can only spend tokens they own
4. **Contract Lock**: Tokens never leave the transfer contract, only ownership changes
5. **Amount Validation**: Purchase amounts must be positive integers

---

## Testing

### **Test Environment Setup**
```bash
# Start the service
deno run --allow-all rest_api/app.ts

# Test health endpoint
curl -X GET http://localhost:3000/healthcheck

# View OpenAPI documentation
open http://localhost:3000/openapi
```

### **Sample Test Data**
```json
{
  "fundId": "686c0c6dc5f1291f1c52971d",
  "adminAddr": "addr_test1vp57sedtqw47d8yw8lh8vmdx88rdxq0fvq0z8da2t6zzpjsj664j2",
  "policyId": "9d52489d9c475b7c2847cec2b4a154c0b9c887967c57015071633229",
  "paymentCredentialHash": "a9ed5d2f7dfcff93e8e6e1d88e3e47c55fe8174f5d97099ba129ed39"
}
```

### **Environment Variables**
The service requires the following environment variables:
- `BLOCKFROST_PROJECT_ID`: Your Blockfrost project ID
- `BLOCKFROST_URL`: Blockfrost API URL (e.g., `https://cardano-preprod.blockfrost.io/api/v0`)
- `LUCID_NETWORK`: Network type (`Preprod`, `Preview`, or `Mainnet`)
- `DEFAULT_SCRIPTS_SRC`: Script source type (`inline` or `outref`)

---

## Integration Notes

- All endpoints return JSON responses
- HTTP status codes: 200 (success), 201 (created), 400 (bad request), 500 (server error)
- Authentication and authorization are handled through the existing middleware
- All blockchain transactions are signed and submitted automatically
- Network selection is based on the fund's deployment configuration
- CORS is enabled for localhost origins (3000, 3003)
- OpenAPI documentation is available at `/openapi` endpoint

---

## CLI Integration

The API works seamlessly with the existing CLI tools:

```bash
# Mint tokens
./man mint --account addr_test1vp57sedtqw47d8yw8lh8vmdx88rdxq0fvq0z8da2t6zzpjsj664j2 --name t1 --amount 1000000000

# Deploy contracts
./man deploy all --fund-id fund_001 --admin-addr addr_test1vp57sedtqw47d8yw8lh8vmdx88rdxq0fvq0z8da2t6zzpjsj664j2

# View registry
./man view reg --fund-id fund_001
```

---

## OpenAPI Documentation

### **Interactive API Documentation**

The service provides comprehensive OpenAPI documentation that can be accessed in multiple formats:

#### **Web Interface**
```bash
# Start the service
deno run --allow-all rest_api/app.ts

# Open in browser
open http://localhost:3000/openapi
```

#### **Raw OpenAPI Specification**
```bash
# Get JSON specification
curl -X GET http://localhost:3000/openapi.json

# Get YAML specification
curl -X GET http://localhost:3000/openapi.yml
```

### **API Categories**

The OpenAPI documentation is organized into the following categories:

#### **Health**
- `GET /healthcheck` - Service health status

#### **Registry**
- `POST /registries` - Create fund registry
- `GET /registries/{fundId}` - Get registry metadata

#### **Whitelist**
- `GET /registries/{fundId}/whitelist` - Get whitelisted addresses
- `POST /registries/{fundId}/whitelist` - Add addresses to whitelist
- `DELETE /registries/{fundId}/whitelist/{address}` - Remove address from whitelist

#### **Token**
- `POST /registries/{fundId}/tokens` - Add token contract to registry
- `GET /registries/{fundId}/tokens` - Get token contracts for fund
- `GET /registries/{fundId}/policies` - Get token policies for fund
- `DELETE /registries/{fundId}/tokens/{policyId}` - Remove token contract from registry

#### **Transfer**
- `POST /transfers/{fundId}/deposit` - Deposit tokens to contract
- `POST /transfers/{fundId}/transfer` - Transfer tokens within contract
- `POST /transfers/{fundId}/spend` - Spend specific UTxOs
- `GET /transfers/{fundId}/funds` - Get transfer funds
- `POST /transfers/{fundId}/purchase` - Purchase tokens from fund

### **Schema Definitions**

#### **Request Schemas**

**CreateRegistryRequest**
```json
{
  "fundId": "string",
  "adminAddr": "string"
}
```

**AddToWhitelistRequest**
```json
{
  "addresses": ["string"]
}
```

**AddTokenContractRequest**
```json
{
  "policyId": "string"
}
```

**RemoveTokenContractRequest**
```json
{
  "fundId": "string (path parameter)",
  "policyId": "string (path parameter)"
}
```

**DepositRequest**
```json
{
  "asset": "string",
  "account": "string",
  "targets": ["string"]
}
```

**TransferRequest**
```json
{
  "asset": "string",
  "account": "string",
  "targets": ["string"]
}
```

**SpendRequest**
```json
{
  "asset": "string",
  "account": "string",
  "outrefs": "string",
  "targets": ["string"]
}
```

**PurchaseRequest**
```json
{
  "asset": "string",
  "account": "string",
  "amount": "string",
  "paymentCredentialHash": "string"
}
```

#### **Response Schemas**

**HealthResponse**
```json
{
  "message": "string"
}
```

**DeploymentResponse**
```json
{
  "fundId": "string",
  "network": "string",
  "params": {
    "adminToken": {
      "policy": "string",
      "name": "string"
    }
  },
  "buildArgs": {
    "Registry": {
      "adminAddr": "string"
    }
  }
}
```

**WhitelistResponse**
```json
["string"]
```

**TokenContract**
```json
{
  "timestamp": "string",
  "fundId": "string",
  "tokenContractAddr": "string",
  "asset": {
    "policy": "string",
    "name": "string"
  }
}
```

**TokenContractsResponse**
```json
[
  {
    "timestamp": "string",
    "fundId": "string",
    "tokenContractAddr": "string",
    "asset": {
      "policy": "string",
      "name": "string"
    }
  }
]
```

**TokenPoliciesResponse**
```json
["string"]
```

**TransferFund**
```json
{
  "owner": "string",
  "totalAssets": {
    "string": "string"
  },
  "utxos": [
    {
      "outRef": "string",
      "assets": {
        "string": "string"
      }
    }
  ]
}
```

**TransferFundsResponse**
```json
[
  {
    "owner": "string",
    "totalAssets": {
      "string": "string"
    },
    "utxos": [
      {
        "outRef": "string",
        "assets": {
          "string": "string"
        }
      }
    ]
  }
]
```

**SuccessResponse**
```json
{
  "success": "boolean"
}
```

**ErrorResponse**
```json
{
  "error": "string"
}
```

### **OpenAPI Tools Integration**

#### **Swagger UI**
The service automatically serves Swagger UI for interactive API exploration:
- URL: `http://localhost:3000/openapi`
- Features: Interactive testing, schema exploration, request/response examples

#### **Code Generation**
Use the OpenAPI specification to generate client libraries:

```bash
# Generate TypeScript client
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:3000/openapi.json \
  -g typescript-fetch \
  -o ./generated-client

# Generate Python client
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:3000/openapi.json \
  -g python \
  -o ./generated-client
```

#### **Postman Collection**
Import the OpenAPI specification into Postman for API testing:
1. Open Postman
2. Click "Import"
3. Select "Link" tab
4. Enter: `http://localhost:3000/openapi.json`
5. Click "Import"

### **API Testing with OpenAPI**

#### **Using curl with OpenAPI Examples**
```bash
# Test health endpoint
curl -X GET http://localhost:3000/healthcheck

# Create registry using OpenAPI schema
curl -X POST http://localhost:3000/registries \
  -H "Content-Type: application/json" \
  -d '{
    "fundId": "test_fund_001",
    "adminAddr": "addr_test1vp57sedtqw47d8yw8lh8vmdx88rdxq0fvq0z8da2t6zzpjsj664j2"
  }'
```

#### **Using Swagger UI**
1. Navigate to `http://localhost:3000/openapi`
2. Select an endpoint
3. Click "Try it out"
4. Fill in the required parameters
5. Click "Execute"

### **OpenAPI Specification Details**

#### **Version Information**
- OpenAPI Version: 3.0.0
- API Version: 1.0.0
- Title: Cardano Funds Registry API
- Description: REST API for managing Cardano fund registries and whitelists

#### **Server Configuration**
- Development: `http://localhost:3000`
- Production: Configurable via environment variables

#### **Security**
- CORS enabled for localhost origins
- No authentication required (handled by Cardano wallet integration)
- Admin token validation for registry operations

#### **Content Types**
- Request: `application/json`
- Response: `application/json`

#### **Error Handling**
- 400: Bad Request (validation errors)
- 404: Not Found (resource not found)
- 500: Internal Server Error (server errors)

### **OpenAPI Best Practices**

The API follows OpenAPI best practices:

1. **Consistent Naming**: All endpoints follow RESTful conventions
2. **Comprehensive Schemas**: All request/response schemas are documented
3. **Examples**: Each endpoint includes practical examples
4. **Error Responses**: All possible error scenarios are documented
5. **Parameter Validation**: All parameters include validation rules
6. **Descriptive Documentation**: Each endpoint has clear descriptions

### **OpenAPI Extensions**

The service supports OpenAPI extensions for enhanced functionality:

- **x-codegen**: Custom code generation hints
- **x-examples**: Multiple examples per endpoint
- **x-tags**: Custom tagging for better organization
- **x-deprecated**: Mark deprecated endpoints

### **OpenAPI Validation**

The OpenAPI specification is validated using:

```bash
# Validate OpenAPI spec
npx @apidevtools/swagger-cli validate http://localhost:3000/openapi.json

# Check for linting issues
npx @apidevtools/swagger-cli lint http://localhost:3000/openapi.json
``` 