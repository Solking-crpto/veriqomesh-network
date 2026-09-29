/**
 * Type-safe Environment Variable Loader and Schema Validator
 */

declare const process: {
  env: Record<string, string | undefined>;
};

export interface AppEnvironment {
  nodeEnv: 'development' | 'test' | 'production';
  monadRpcUrl: string;
  monadChainId: number;
  databaseUrl: string;
  aiProvider: 'gemini' | 'openai' | 'anthropic' | 'local' | 'mock';
  aiApiKey?: string;
  storageProvider: 'ipfs' | 's3' | 'local' | 'memory';
  authProvider: 'injected' | 'privy' | 'dynamic' | 'turnkey' | 'sponsor';
  evidenceEncryptionKey: string;
}

export function loadEnvironment(overrideEnv?: Record<string, string | undefined>): AppEnvironment {
  const envSource = overrideEnv ?? (typeof process !== 'undefined' ? process.env : {});
  const nodeEnv = (envSource.NODE_ENV as 'development' | 'test' | 'production') || 'development';

  return {
    nodeEnv,
    monadRpcUrl: envSource.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz',
    monadChainId: parseInt(envSource.MONAD_CHAIN_ID || '10143', 10),
    databaseUrl: envSource.DATABASE_URL || 'postgresql://localhost:5432/trustmesh_dev',
    aiProvider: (envSource.AI_PROVIDER as AppEnvironment['aiProvider']) || 'mock',
    aiApiKey: envSource.AI_PROVIDER_API_KEY,
    storageProvider: (envSource.STORAGE_PROVIDER as AppEnvironment['storageProvider']) || 'local',
    authProvider: (envSource.AUTH_PROVIDER as AppEnvironment['authProvider']) || 'injected',
    evidenceEncryptionKey: envSource.EVIDENCE_ENCRYPTION_KEY || '0'.repeat(64),
  };
}
