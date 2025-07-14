import { Router } from 'express';
import {
  depositHandler,
  transferToHandler,
  spendHandler,
  getFundsHandler,
  purchaseHandler,
} from './transfer.controller.ts';
import {
  depositSchema,
  transferToSchema,
  spendSchema,
  getFundsSchema,
  purchaseSchema,
} from './transfer.schemas.ts';
import { validate } from '../../middleware.ts';

const router = Router();

// POST /transfers/{fundId}/deposit - Deposit tokens to transfer contract
router.post('/:fundId/deposit', validate(depositSchema), depositHandler);

// POST /transfers/{fundId}/transfer - Transfer tokens to targets
router.post('/:fundId/transfer', validate(transferToSchema), transferToHandler);

// POST /transfers/{fundId}/spend - Spend specific UTxOs to targets
router.post('/:fundId/spend', validate(spendSchema), spendHandler);

// GET /transfers/{fundId}/funds - Get transfer funds grouped by owner
router.get('/:fundId/funds', validate(getFundsSchema), getFundsHandler);

// POST /transfers/{fundId}/purchase - Purchase tokens (for whitelisted users)
router.post('/:fundId/purchase', validate(purchaseSchema), purchaseHandler);

export default router; 