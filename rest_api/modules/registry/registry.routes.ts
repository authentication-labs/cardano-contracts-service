import { Router } from 'express';
import {
  createRegistryHandler,
  getRegistryHandler,
  getWhitelistHandler,
  addToWhitelistHandler,
  removeFromWhitelistHandler,
  addTokenContractHandler,
  getTokenContractsHandler,
  getTokenPoliciesHandler,
  removeTokenContractHandler,
} from './registry.controller.ts';
import {
  createRegistrySchema,
  registryParamsSchema,
  removeFromWhitelistSchema,
  addToWhitelistSchema,
  addTokenContractSchema,
  getTokenContractsSchema,
  getTokenPoliciesSchema,
  removeTokenContractSchema,
} from './registry.schemas.ts';
import { validate } from '../../middleware.ts';

const router = Router();

// POST /registries - Create a new registry
router.post('/', validate(createRegistrySchema), createRegistryHandler);

// GET /registries/{fundId} - Get registry metadata
router.get('/:fundId', validate(registryParamsSchema), getRegistryHandler);

// GET /registries/{fundId}/whitelist - Get the list of whitelisted addresses
router.get('/:fundId/whitelist', validate(registryParamsSchema), getWhitelistHandler);

// POST /registries/{fundId}/whitelist - Add an address to the whitelist
router.post('/:fundId/whitelist', validate(addToWhitelistSchema), addToWhitelistHandler);

// DELETE /registries/{fundId}/whitelist/{address} - Remove an address from the whitelist
router.delete('/:fundId/whitelist/:address', validate(removeFromWhitelistSchema), removeFromWhitelistHandler);

// POST /registries/{fundId}/tokens - Add a token contract to the registry
router.post('/:fundId/tokens', validate(addTokenContractSchema), addTokenContractHandler);

// GET /registries/{fundId}/tokens - Get token contracts for the registry
router.get('/:fundId/tokens', validate(getTokenContractsSchema), getTokenContractsHandler);

// GET /registries/{fundId}/policies - Get token policies for the registry
router.get('/:fundId/policies', validate(getTokenPoliciesSchema), getTokenPoliciesHandler);

// DELETE /registries/{fundId}/tokens/{policyId} - Remove a token contract from the registry
router.delete('/:fundId/tokens/:policyId', validate(removeTokenContractSchema), removeTokenContractHandler);

export default router;
