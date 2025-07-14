import {
  OpenAPIRegistry,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Import existing schemas
import {
  createRegistrySchema,
  addToWhitelistSchema,
  addTokenContractSchema,
  getTokenContractsSchema,
  getTokenPoliciesSchema,
  removeTokenContractSchema,
} from '../modules/registry/registry.schemas.ts';
import {
  depositSchema,
  transferToSchema,
  spendSchema,
  getFundsSchema,
  purchaseSchema,
} from '../modules/transfer/transfer.schemas.ts';
import { DeploymentItemSchema } from '../../store/schemas/deployment.ts';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// Register common components
const ErrorResponseSchema = z.object({
  error: z.string(),
}).openapi('ErrorResponse');

const SuccessResponseSchema = z.object({
  success: z.boolean(),
}).openapi('SuccessResponse');

const WhitelistResponseSchema = z.array(z.string()).openapi('WhitelistResponse');

const TransferFundSchema = z.object({
  owner: z.string(),
  totalAssets: z.record(z.string(), z.string()), // bigint as string
  utxos: z.array(z.object({
    outRef: z.string(),
    assets: z.record(z.string(), z.string()), // bigint as string
  })),
}).openapi('TransferFund');

const TransferFundsResponseSchema = z.array(TransferFundSchema).openapi('TransferFundsResponse');

// Token contract schemas
const TokenContractSchema = z.object({
  timestamp: z.string(),
  fundId: z.string(),
  tokenContractAddr: z.string(),
  description: z.string().optional(),
  asset: z.object({
    policy: z.string(),
    name: z.string(),
  }),
}).openapi('TokenContract');

const TokenContractsResponseSchema = z.array(TokenContractSchema).openapi('TokenContractsResponse');

const TokenPoliciesResponseSchema = z.array(z.string()).openapi('TokenPoliciesResponse');

// Register request/response schemas with OpenAPI metadata
const CreateRegistryRequestSchema = createRegistrySchema.shape.body.openapi('CreateRegistryRequest', {
  description: 'Request body for creating a new registry',
  example: {
    fundId: 'fund-001',
    adminAddr: 'addr_test1vq2qs6kmh5677ye75j89ystykqmvpwy3sg7d8urr9gxzf2cqs4dcl',
  },
});

const DeploymentResponseSchema = DeploymentItemSchema.openapi('DeploymentResponse', {
  description: 'Registry deployment information',
});

// Register path parameters
const FundIdParam = registry.registerParameter(
  'FundId',
  z.string().openapi({
    param: {
      name: 'fundId',
      in: 'path',
      description: 'Unique identifier for the fund',
    },
    example: 'fund-001',
  })
);

const AddressParam = registry.registerParameter(
  'Address',
  z.string().openapi({
    param: {
      name: 'address',
      in: 'path',
      description: 'Address (Payment Credential Hash) for whitelist',
    },
    example: '14086adbbd35ef133ea48e524164b036c0b891823cd3f0632a0c24ab',
  })
);

const PolicyIdParam = registry.registerParameter(
  'PolicyId',
  z.string().openapi({
    param: {
      name: 'policyId',
      in: 'path',
      description: 'Policy ID for the token contract',
    },
    example: '9d52489d9c475b7c2847cec2b4a154c0b9c887967c57015071633229',
  })
);

const err500 = {
  description: 'Internal server error',
  content: {
    'application/json': {
      schema: ErrorResponseSchema,
    },
  },
}

// ============================================================================
// === Register API paths

// Health check endpoint
registry.registerPath({
  method: 'get',
  path: '/healthcheck',
  description: 'Check if the API is running',
  summary: 'Health check',
  tags: ['Health'],
  responses: {
    200: {
      description: 'API is running',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }).openapi('HealthResponse', {
            example: { message: 'API is up and running!' }
          }),
        },
      },
    },
  },
});

// POST /registries - Create a new registry
registry.registerPath({
  method: 'post',
  path: '/registries',
  description: 'Create a new registry for a fund',
  summary: 'Create registry',
  tags: ['Registry'],
  request: {
    body: {
      description: 'Registry creation parameters',
      content: {
        'application/json': {
          schema: CreateRegistryRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Registry created successfully',
      content: {
        'application/json': {
          schema: DeploymentResponseSchema,
        },
      },
    },
    500: err500,
  },
});

// GET /registries/{fundId} - Get registry metadata
registry.registerPath({
  method: 'get',
  path: '/registries/{fundId}',
  description: 'Get registry metadata by fund ID',
  summary: 'Get registry',
  tags: ['Registry'],
  request: {
    params: z.object({ fundId: FundIdParam }),
  },
  responses: {
    200: {
      description: 'Registry metadata',
      content: {
        'application/json': {
          schema: DeploymentResponseSchema,
        },
      },
    },
    500: err500,
  },
});

// GET /registries/{fundId}/whitelist - Get whitelist
registry.registerPath({
  method: 'get',
  path: '/registries/{fundId}/whitelist',
  description: 'Get the list of whitelisted addresses for a fund',
  summary: 'Get whitelist',
  tags: ['Whitelist'],
  request: {
    params: z.object({ fundId: FundIdParam }),
  },
  responses: {
    200: {
      description: 'List of whitelisted addresses',
      content: {
        'application/json': {
          schema: WhitelistResponseSchema,
        },
      },
    },
    500: err500,
  },
});

// POST /registries/{fundId}/whitelist - Add addresses to whitelist
registry.registerPath({
  method: 'post',
  path: '/registries/{fundId}/whitelist',
  description: 'Add one or more addresses to the whitelist',
  summary: 'Add to whitelist',
  tags: ['Whitelist'],
  request: {
    params: z.object({ fundId: FundIdParam }),
    body: {
      description: 'Addresses to add to whitelist',
      content: {
        'application/json': {
          schema: addToWhitelistSchema.shape.body.openapi('AddToWhitelistRequest', {
            description: 'Request body for adding addresses to whitelist',
            example: {
              addresses: [
                '14086adbbd35ef133ea48e524164b036c0b891823cd3f0632a0c24ab',
                'b5896daaefd576a7cdf4fb19900fc412e2739f125c10cc502110cc59',
              ]
            },
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Addresses added to whitelist successfully',
      content: {
        'application/json': {
          schema: z.object({}).openapi('EmptyResponse'),
        },
      },
    },
    500: err500,
  },
});

// DELETE /registries/{fundId}/whitelist/{address} - Remove address from whitelist
registry.registerPath({
  method: 'delete',
  path: '/registries/{fundId}/whitelist/{address}',
  description: 'Remove an address from the whitelist',
  summary: 'Remove from whitelist',
  tags: ['Whitelist'],
  request: {
    params: z.object({
      fundId: FundIdParam,
      address: AddressParam,
    }),
  },
  responses: {
    200: {
      description: 'Address removed from whitelist successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    500: err500,
  },
});

// POST /registries/{fundId}/tokens - Add token contract
registry.registerPath({
  method: 'post',
  path: '/registries/{fundId}/tokens',
  description: 'Add a token contract to the fund registry',
  summary: 'Add token contract',
  tags: ['Token'],
  request: {
    params: z.object({ fundId: FundIdParam }),
    body: {
      description: 'Token contract information',
      content: {
        'application/json': {
          schema: addTokenContractSchema.shape.body.openapi('AddTokenContractRequest', {
            description: 'Request body for adding token contract',
            example: {
              policyId: '9d52489d9c475b7c2847cec2b4a154c0b9c887967c57015071633229',
            },
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Token contract added successfully',
      content: {
        'application/json': {
          schema: TokenContractSchema,
        },
      },
    },
    500: err500,
  },
});

// GET /registries/{fundId}/tokens - Get token contracts
registry.registerPath({
  method: 'get',
  path: '/registries/{fundId}/tokens',
  description: 'Get all token contracts for a fund',
  summary: 'Get token contracts',
  tags: ['Token'],
  request: {
    params: z.object({ fundId: FundIdParam }),
  },
  responses: {
    200: {
      description: 'List of token contracts',
      content: {
        'application/json': {
          schema: TokenContractsResponseSchema,
        },
      },
    },
    500: err500,
  },
});

// GET /registries/{fundId}/policies - Get token policies
registry.registerPath({
  method: 'get',
  path: '/registries/{fundId}/policies',
  description: 'Get all token policy IDs for a fund',
  summary: 'Get token policies',
  tags: ['Token'],
  request: {
    params: z.object({ fundId: FundIdParam }),
  },
  responses: {
    200: {
      description: 'List of token policy IDs',
      content: {
        'application/json': {
          schema: TokenPoliciesResponseSchema,
        },
      },
    },
    500: err500,
  },
});

// DELETE /registries/{fundId}/tokens/{policyId} - Remove token contract
registry.registerPath({
  method: 'delete',
  path: '/registries/{fundId}/tokens/{policyId}',
  description: 'Remove a token contract from the fund registry',
  summary: 'Remove token contract',
  tags: ['Token'],
  request: {
    params: z.object({
      fundId: FundIdParam,
      policyId: PolicyIdParam,
    }),
  },
  responses: {
    200: {
      description: 'Token contract removed successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    404: {
      description: 'Token contract not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: err500,
  },
});

// ============================================================================
// === Transfer API paths

// POST /transfers/{fundId}/deposit - Deposit tokens
registry.registerPath({
  method: 'post',
  path: '/transfers/{fundId}/deposit',
  description: 'Deposit tokens to transfer smart contract',
  summary: 'Deposit tokens',
  tags: ['Transfer'],
  request: {
    params: z.object({ fundId: FundIdParam }),
    body: {
      description: 'Deposit parameters',
      content: {
        'application/json': {
          schema: depositSchema.shape.body.openapi('DepositRequest', {
            description: 'Request body for depositing tokens',
            example: {
              asset: 'f1f167caef58d4a5bbddabaa8fa29101d670d7ae593dd7901c5d4a7e:t1',
              account: 'addr_test1vq2qs6kmh5677ye75j89ystykqmvpwy3sg7d8urr9gxzf2cqs4dcl',
              targets: [
                'c7057b222e290d220f10497f3d7a38d7cafc7fe0b4f6ab846bd3c953:100000',
                '85b6903ed1d618073bed01e7240ff97a879cb5e6e080f74da1079b7c:90000',
              ],
            },
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Tokens deposited successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    500: err500,
  },
});

// POST /transfers/{fundId}/transfer - Transfer tokens
registry.registerPath({
  method: 'post',
  path: '/transfers/{fundId}/transfer',
  description: 'Transfer tokens to targets within the transfer contract',
  summary: 'Transfer tokens',
  tags: ['Transfer'],
  request: {
    params: z.object({ fundId: FundIdParam }),
    body: {
      description: 'Transfer parameters',
      content: {
        'application/json': {
          schema: transferToSchema.shape.body.openapi('TransferRequest', {
            description: 'Request body for transferring tokens',
            example: {
              asset: 'f1f167caef58d4a5bbddabaa8fa29101d670d7ae593dd7901c5d4a7e:t1',
              account: 'addr_test1vq2qs6kmh5677ye75j89ystykqmvpwy3sg7d8urr9gxzf2cqs4dcl',
              targets: [
                'a3dded605762e998fba7e6938550a66f73031af899fb1309b5fcbdd5:10',
              ],
            },
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Tokens transferred successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    500: err500,
  },
});

// POST /transfers/{fundId}/spend - Spend UTxOs
registry.registerPath({
  method: 'post',
  path: '/transfers/{fundId}/spend',
  description: 'Spend specific UTxOs to targets',
  summary: 'Spend UTxOs',
  tags: ['Transfer'],
  request: {
    params: z.object({ fundId: FundIdParam }),
    body: {
      description: 'Spend parameters',
      content: {
        'application/json': {
          schema: spendSchema.shape.body.openapi('SpendRequest', {
            description: 'Request body for spending UTxOs',
            example: {
              asset: 'f1f167caef58d4a5bbddabaa8fa29101d670d7ae593dd7901c5d4a7e:t1',
              account: 'addr_test1vq2qs6kmh5677ye75j89ystykqmvpwy3sg7d8urr9gxzf2cqs4dcl',
              outrefs: 'b32b2fe50fb42910a3d562565ef87511fc4b4bc7d2817d7e35d2cae8cfce5faa#0',
              targets: [
                'a3dded605762e998fba7e6938550a66f73031af899fb1309b5fcbdd5:50',
              ],
            },
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'UTxOs spent successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    500: err500,
  },
});

// GET /transfers/{fundId}/funds - Get funds
registry.registerPath({
  method: 'get',
  path: '/transfers/{fundId}/funds',
  description: 'Get transfer funds grouped by owner',
  summary: 'Get funds',
  tags: ['Transfer'],
  request: {
    params: z.object({ fundId: FundIdParam }),
  },
  responses: {
    200: {
      description: 'Transfer funds information',
      content: {
        'application/json': {
          schema: TransferFundsResponseSchema,
        },
      },
    },
    500: err500,
  },
});

// POST /transfers/{fundId}/purchase - Purchase tokens
registry.registerPath({
  method: 'post',
  path: '/transfers/{fundId}/purchase',
  description: 'Purchase tokens from a fund (requires whitelist membership)',
  summary: 'Purchase tokens',
  tags: ['Transfer'],
  request: {
    params: z.object({ fundId: FundIdParam }),
    body: {
      description: 'Purchase parameters',
      content: {
        'application/json': {
          schema: purchaseSchema.shape.body.openapi('PurchaseRequest', {
            description: 'Request body for purchasing tokens',
            example: {
              asset: '9d52489d9c475b7c2847cec2b4a154c0b9c887967c57015071633229:t1',
              account: 'admin_account',
              amount: '1000',
              paymentCredentialHash: 'a9ed5d2f7dfcff93e8e6e1d88e3e47c55fe8174f5d97099ba129ed39',
            },
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Tokens purchased successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema,
        },
      },
    },
    400: {
      description: 'Purchase validation error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: err500,
  },
});

export { registry };
