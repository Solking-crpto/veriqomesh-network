'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  BrowserEip1193SignerProvider,
  MONAD_METROPOLIS_PARAMS,
  EIP1193Provider,
} from '@trustmesh/sdk';

export const MONAD_CHAIN_ID = 10143;
export const MONAD_RPC_URL = 'https://testnet-rpc.monad.xyz';
export const MONAD_EXPLORER_URL = 'https://testnet.monadvision.com';

export interface MonadWalletState {
  isAvailable: boolean;
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isMonadTestnet: boolean;
  balanceMon: string | null;
  isConnecting: boolean;
  error: string | null;
  signerProvider: BrowserEip1193SignerProvider | null;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  switchNetwork: () => Promise<boolean>;
  refreshBalance: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
}

export function useMonadWallet(): MonadWalletState {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balanceMon, setBalanceMon] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signerProvider, setSignerProvider] = useState<BrowserEip1193SignerProvider | null>(null);

  // Initialize and check window.ethereum
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { ethereum?: EIP1193Provider }).ethereum) {
      const eth = (window as unknown as { ethereum: EIP1193Provider }).ethereum;
      setIsAvailable(true);
      const adapter = new BrowserEip1193SignerProvider(eth);
      setSignerProvider(adapter);

      // Check if already authorized
      eth
        .request({ method: 'eth_accounts' })
        .then((accounts) => {
          const accs = accounts as string[];
          if (accs && accs.length > 0) {
            setAddress(accs[0]);
            setIsConnected(true);
            eth
              .request({ method: 'eth_chainId' })
              .then((cId) => {
                setChainId(parseInt(cId as string, 16));
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!address) {
      setBalanceMon(null);
      return;
    }
    try {
      const readProvider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
      const balWei = await readProvider.getBalance(address);
      const formatted = ethers.formatEther(balWei);
      // Round to 4 decimal places for UI display
      const num = parseFloat(formatted);
      setBalanceMon(num.toFixed(4));
    } catch {
      // In case of transient RPC failure, preserve current or set to 0.0000
    }
  }, [address]);

  // Update balance when address or chainId changes
  useEffect(() => {
    if (isConnected && address) {
      refreshBalance();
    }
  }, [isConnected, address, chainId, refreshBalance]);

  // Attach event listeners for account and chain changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const eth = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
    if (!eth || !eth.on || !eth.removeListener) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        setError(null);
      } else {
        setAddress(null);
        setIsConnected(false);
        setBalanceMon(null);
      }
    };

    const handleChainChanged = (...args: unknown[]) => {
      const newChainHex = args[0] as string;
      setChainId(parseInt(newChainHex, 16));
    };

    eth.on('accountsChanged', handleAccountsChanged);
    eth.on('chainChanged', handleChainChanged);

    return () => {
      if (eth.removeListener) {
        eth.removeListener('accountsChanged', handleAccountsChanged);
        eth.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    setError(null);
    if (typeof window === 'undefined') return null;
    const eth = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
    if (!eth) {
      const errMsg = 'No injected wallet found. Please install MetaMask or an EIP-1193 compatible wallet.';
      setError(errMsg);
      return null;
    }

    setIsConnecting(true);
    try {
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
      if (!accounts || accounts.length === 0) {
        throw new Error('User rejected wallet connection');
      }

      const activeAccount = accounts[0];
      setAddress(activeAccount);
      setIsConnected(true);

      const rawChainId = (await eth.request({ method: 'eth_chainId' })) as string;
      const parsedChainId = parseInt(rawChainId, 16);
      setChainId(parsedChainId);

      const adapter = new BrowserEip1193SignerProvider(eth);
      setSignerProvider(adapter);

      // If connected on wrong chain, offer switch
      if (parsedChainId !== MONAD_CHAIN_ID) {
        try {
          await adapter.switchToMonad();
          setChainId(MONAD_CHAIN_ID);
        } catch {
          setError('Connected, but wrong network. Please switch to Monad Metropolis Testnet (10143).');
        }
      }

      return activeAccount;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(msg);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setBalanceMon(null);
    setError(null);
  }, []);

  const switchNetwork = useCallback(async (): Promise<boolean> => {
    if (!signerProvider) return false;
    try {
      setError(null);
      const success = await signerProvider.switchToMonad();
      if (success) {
        setChainId(MONAD_CHAIN_ID);
      }
      return success;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to switch network';
      setError(msg);
      return false;
    }
  }, [signerProvider]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!signerProvider) {
      throw new Error('Wallet not connected or signer unavailable');
    }
    return signerProvider.signMessage(message);
  }, [signerProvider]);

  return {
    isAvailable,
    isConnected,
    address,
    chainId,
    isMonadTestnet: chainId === MONAD_CHAIN_ID,
    balanceMon,
    isConnecting,
    error,
    signerProvider,
    connect,
    disconnect,
    switchNetwork,
    refreshBalance,
    signMessage,
  };
}
