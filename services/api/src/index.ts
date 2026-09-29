/**
 * TrustMesh API Service Entrypoint
 * Orchestrates transaction state machines, escrow indices, and receipt endpoints.
 */

import { loadEnvironment } from '@trustmesh/config';
import { TransactionState } from '@trustmesh/types';

export interface ApiServerContext {
  environment: ReturnType<typeof loadEnvironment>;
  isReady: boolean;
}

export function createApiContext(): ApiServerContext {
  const env = loadEnvironment();
  return {
    environment: env,
    isReady: true,
  };
}

export function main(): void {
  const ctx = createApiContext();
  console.log(`[TrustMesh API] Service initialized in ${ctx.environment.nodeEnv} mode.`);
  console.log(`[TrustMesh API] Monad Target Chain ID: ${ctx.environment.monadChainId}`);
  console.log(`[TrustMesh API] Initial State Model Ready: ${Object.keys(TransactionState).length} states.`);
}

if (process.env.NODE_ENV !== 'test') {
  main();
}
