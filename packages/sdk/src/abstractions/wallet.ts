/**
 * Signer and Wallet Abstraction Layer
 * Accommodates EIP-1193 standard wallets (MetaMask, Rabby, Coinbase Wallet),
 * sponsor wallets, and programmatic providers without vendor lock-in.
 */

export interface TransactionRequest {
  to: string;
  data?: string;
  value?: string;
  gasLimit?: string;
}

export interface ISignerProvider {
  /**
   * Return the current active EVM account address
   */
  getAddress(): Promise<string>;

  /**
   * Sign arbitrary data or typed structured data (EIP-712)
   */
  signMessage(message: string | Uint8Array): Promise<string>;

  /**
   * Sign and broadcast a transaction to the network
   */
  sendTransaction(transaction: TransactionRequest): Promise<string>;

  /**
   * Return current network chain ID
   */
  getChainId(): Promise<number>;

  /**
   * Optional helper to wait for transaction receipt confirmation
   */
  waitForTransaction?(txHash: string, timeoutMs?: number): Promise<{
    transactionHash: string;
    blockNumber: number;
    status: number;
  }>;
}

export interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

export const MONAD_METROPOLIS_PARAMS = {
  chainId: '0x279f', // 10143
  chainName: 'Monad Metropolis Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  blockExplorerUrls: ['https://testnet.monadvision.com'],
};

/**
 * Production-ready browser wallet adapter for EIP-1193 providers (MetaMask, Rabby, etc.)
 */
export class BrowserEip1193SignerProvider implements ISignerProvider {
  private readonly _provider: EIP1193Provider;

  constructor(provider: EIP1193Provider) {
    if (!provider || typeof provider.request !== 'function') {
      throw new Error('Invalid EIP-1193 provider supplied to BrowserEip1193SignerProvider');
    }
    this._provider = provider;
  }

  async getAddress(): Promise<string> {
    const accounts = (await this._provider.request({ method: 'eth_accounts' })) as string[];
    if (accounts && accounts.length > 0) {
      return accounts[0];
    }
    // If not connected yet, request account access explicitly
    const requested = (await this._provider.request({ method: 'eth_requestAccounts' })) as string[];
    if (!requested || requested.length === 0) {
      throw new Error('No EVM account available from browser wallet');
    }
    return requested[0];
  }

  async getChainId(): Promise<number> {
    const rawChainId = (await this._provider.request({ method: 'eth_chainId' })) as string;
    return parseInt(rawChainId, 16);
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const account = await this.getAddress();
    const hexMessage =
      typeof message === 'string'
        ? (message.startsWith('0x') ? message : '0x' + Buffer.from(message, 'utf8').toString('hex'))
        : '0x' + Buffer.from(message).toString('hex');

    const signature = (await this._provider.request({
      method: 'personal_sign',
      params: [hexMessage, account],
    })) as string;

    return signature;
  }

  async sendTransaction(transaction: TransactionRequest): Promise<string> {
    const account = await this.getAddress();
    const valueHex = transaction.value && transaction.value !== '0'
      ? '0x' + BigInt(transaction.value).toString(16)
      : '0x0';

    const txParams: Record<string, string> = {
      from: account,
      to: transaction.to,
      data: transaction.data || '0x',
      value: valueHex,
    };

    if (transaction.gasLimit) {
      txParams.gas = '0x' + BigInt(transaction.gasLimit).toString(16);
    }

    const txHash = (await this._provider.request({
      method: 'eth_sendTransaction',
      params: [txParams],
    })) as string;

    return txHash;
  }

  /**
   * Prompts the browser wallet to switch to Monad Metropolis Testnet (Chain ID 10143).
   * Automatically prompts to add the chain if not present in the user's wallet.
   */
  async switchToMonad(): Promise<boolean> {
    try {
      await this._provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_METROPOLIS_PARAMS.chainId }],
      });
      return true;
    } catch (err: unknown) {
      // Error code 4902 indicates chain has not been added to wallet
      const errorObj = err as { code?: number };
      if (errorObj?.code === 4902) {
        await this._provider.request({
          method: 'wallet_addEthereumChain',
          params: [MONAD_METROPOLIS_PARAMS],
        });
        return true;
      }
      throw err;
    }
  }

  /**
   * Polls for transaction confirmation using JSON-RPC
   */
  async waitForTransaction(
    txHash: string,
    timeoutMs = 60000
  ): Promise<{ transactionHash: string; blockNumber: number; status: number }> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const receipt = (await this._provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      })) as { transactionHash: string; blockNumber: string; status: string } | null;

      if (receipt && receipt.blockNumber) {
        return {
          transactionHash: receipt.transactionHash,
          blockNumber: parseInt(receipt.blockNumber, 16),
          status: parseInt(receipt.status, 16),
        };
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error(`Timeout waiting for transaction confirmation: ${txHash}`);
  }
}
