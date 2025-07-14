import { Request, Response } from 'express';
import { RegistryService } from './registry.service.ts';
import {
  CreateRegistryInput,
  RegistryParamsInput,
  RemoveFromWhitelistInput,
  AddToWhitelistInput,
  AddTokenContractInput,
  GetTokenContractsInput,
  GetTokenPoliciesInput,
  RemoveTokenContractInput,
} from './registry.schemas.ts';

export async function createRegistryHandler(
  req: Request<{}, {}, CreateRegistryInput>,
  res: Response
) {
  try {
    const result = await RegistryService.createRegistry(req.body);
    res.status(201).json(result);
  } catch (e: any) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
}

export async function getRegistryHandler(
  req: Request<RegistryParamsInput>,
  res: Response
) {
  try {
    const result = await RegistryService.getRegistry(req.params.fundId);
    res.status(200).json(result);
  } catch (e: any) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
}

export async function getWhitelistHandler(
  req: Request<RegistryParamsInput>,
  res: Response
) {
  try {
    const result = await RegistryService.getWhitelist(req.params.fundId);
    res.status(200).json(result);
  } catch (e: any) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
}

export async function addToWhitelistHandler(
  req: Request<AddToWhitelistInput['params'], {}, AddToWhitelistInput['body']>,
  res: Response
) {
  try {
    const result = await RegistryService.addToWhitelist(
      req.params.fundId,
      req.body.addresses,
    );
    res.status(201).json(result);
  } catch (e: any) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
}

export async function removeFromWhitelistHandler(
  req: Request<RemoveFromWhitelistInput>,
  res: Response
) {
  try {
    const result = await RegistryService.removeFromWhitelist(
      req.params.fundId,
      req.params.address
    );
    res.status(200).json({ success: result });
  } catch (e: any) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
}

export async function addTokenContractHandler(
  req: Request<AddTokenContractInput['params'], {}, AddTokenContractInput['body']>,
  res: Response
) {
  try {
    const result = await RegistryService.addTokenContract(
      req.params.fundId,
      req.body.policyId,
    );
    res.status(201).json(result);
  } catch (e: any) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
}

export async function getTokenContractsHandler(
  req: Request<GetTokenContractsInput>,
  res: Response
) {
  try {
    const result = await RegistryService.getTokenContracts(req.params.fundId);
    res.status(200).json(result);
  } catch (e: any) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
}

export async function getTokenPoliciesHandler(
  req: Request<GetTokenPoliciesInput>,
  res: Response
) {
  try {
    const result = await RegistryService.getTokenPolicies(req.params.fundId);
    res.status(200).json(result);
  } catch (e: any) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
}

export async function removeTokenContractHandler(
  req: Request<RemoveTokenContractInput>,
  res: Response
) {
  try {
    const result = await RegistryService.removeTokenContract(
      req.params.fundId,
      req.params.policyId
    );
    res.status(200).json({ success: result });
  } catch (e: any) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
}
