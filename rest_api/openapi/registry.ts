import {
  OpenAPIRegistry,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Import existing schemas
import {
  createRegistrySchema,
  addToWhitelistSchema,
} from '../modules/registry/registry.schemas.ts';
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
          schema: z.any().openapi({ example: '{message: "API is up and running!"}' }),
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

export { registry };
