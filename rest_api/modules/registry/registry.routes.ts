import { Router } from 'express';
import {
  createRegistryHandler,
  getRegistryHandler,
  getWhitelistHandler,
  addToWhitelistHandler,
  removeFromWhitelistHandler,
} from './registry.controller.ts';
import {
  createRegistrySchema,
  registryParamsSchema,
  removeFromWhitelistSchema,
  addToWhitelistSchema,
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

export default router;
