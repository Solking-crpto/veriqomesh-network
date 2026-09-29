/**
 * Blockchain Network Configurations
 * Primary Target: Monad Metropolis
 */

export interface NetworkConfig {
  chainId: number;
  name: string;
  isTestnet: boolean;
  rpcUrls: {
    default: string;
    public: string[];
  };
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorers: {
    default: {
      name: string;
      url: string;
    };
  };
  contracts?: {
    escrowHub?: string;
    disputeHub?: string;
    receiptRegistry?: string;
  };
}

export const MONAD_METROPOLIS_TESTNET: NetworkConfig = {
  chainId: 10143,
  name: 'Monad Metropolis Testnet',
  isTestnet: true,
  rpcUrls: {
    default: 'https://testnet-rpc.monad.xyz',
    public: [
      'https://testnet-rpc.monad.xyz',
      'https://rpc-testnet.monadinfra.com',
      'https://rpc.ankr.com/monad_testnet',
    ],
  },
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: 'MonadVision',
      url: 'https://testnet.monadvision.com',
    },
  },
};

export const DEVNET_LOCAL: NetworkConfig = {
  chainId: 31337,
  name: 'Anvil Local Devnet',
  isTestnet: true,
  rpcUrls: {
    default: 'http://127.0.0.1:8545',
    public: ['http://127.0.0.1:8545'],
  },
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: 'Local Explorer',
      url: 'http://localhost:8545',
    },
  },
};

export const SUPPORTED_NETWORKS: Record<number, NetworkConfig> = {
  [MONAD_METROPOLIS_TESTNET.chainId]: MONAD_METROPOLIS_TESTNET,
  [DEVNET_LOCAL.chainId]: DEVNET_LOCAL,
};

export const DEFAULT_CHAIN_ID = MONAD_METROPOLIS_TESTNET.chainId;
