// src/hooks/useZkLogin.ts
import { useState, useEffect } from 'react';
import { useCurrentClient } from '@mysten/dapp-kit-react';
import {
  prepareGoogleLoginUrl,
  parseJwt,
  getOrCreateUserSalt,
  deriveZkAddress,
  clearZkSession,
  fetchZkProof,
  getOrCreateEphemeralKeypair,
  STORAGE_KEYS as ZK_STORAGE_KEYS,
  type DecodedJwt,
} from '../zklogin';

export interface ZkAccount {
  address: string;
  email?: string;
  name?: string;
  picture?: string;
  proof?: unknown;
  provider: 'google';
}

const STORAGE_KEYS = {
  JWT: 'smartsplit_zk_jwt',
  ACCOUNT: 'smartsplit_zk_account',
  INCOMING_REQS: 'smartsplit_incoming_reqs',
  SENT_REQS: 'smartsplit_sent_reqs',
};

// Global shared state across all components using useZkLogin
let globalZkAccount: ZkAccount | null = (() => {
  try {
    const savedAccount = localStorage.getItem(STORAGE_KEYS.ACCOUNT);
    const savedJwt = localStorage.getItem(STORAGE_KEYS.JWT);
    if (savedAccount && savedJwt) {
      const decoded = parseJwt(savedJwt);
      if (decoded && (!decoded.exp || decoded.exp * 1000 > Date.now())) {
        return JSON.parse(savedAccount);
      }
    }
  } catch {}
  return null;
})();

let globalJwt: string | null = (() => {
  try {
    return localStorage.getItem(STORAGE_KEYS.JWT);
  } catch {}
  return null;
})();

const listeners = new Set<() => void>();
function emitChange() {
  listeners.forEach((listener) => listener());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('smartsplit_zk_change'));
  }
}

export function useZkLogin() {
  const client = useCurrentClient();
  const [zkAccount, setZkAccount] = useState<ZkAccount | null>(globalZkAccount);
  const [jwt, setJwt] = useState<string | null>(globalJwt);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with global store & window events
  useEffect(() => {
    const sync = () => {
      setZkAccount(globalZkAccount);
      setJwt(globalJwt);
    };
    listeners.add(sync);

    const handleStorageChange = () => {
      try {
        const savedAccount = localStorage.getItem(STORAGE_KEYS.ACCOUNT);
        const savedJwt = localStorage.getItem(STORAGE_KEYS.JWT);
        if (savedAccount && savedJwt) {
          const decoded = parseJwt(savedJwt);
          if (decoded && (!decoded.exp || decoded.exp * 1000 > Date.now())) {
            globalZkAccount = JSON.parse(savedAccount);
            globalJwt = savedJwt;
          } else {
            globalZkAccount = null;
            globalJwt = null;
          }
        } else {
          globalZkAccount = null;
          globalJwt = null;
        }
      } catch {
        globalZkAccount = null;
        globalJwt = null;
      }
      sync();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('smartsplit_zk_change', handleStorageChange);

    return () => {
      listeners.delete(sync);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('smartsplit_zk_change', handleStorageChange);
    };
  }, []);

  async function loginWithGoogle() {
    setIsLoading(true);
    setError(null);
    try {
      const systemState = await client.getCurrentSystemState();
      const maxEpoch = Number(systemState.systemState.epoch) + 2;
      const url = prepareGoogleLoginUrl(maxEpoch);
      window.location.href = url;
    } catch (err: any) {
      console.error('Failed to initiate Google zkLogin:', err);
      setError('Failed to initiate Google login');
      setIsLoading(false);
    }
  }

  async function completeZkLogin(idToken: string): Promise<ZkAccount | null> {
    setIsLoading(true);
    setError(null);
    try {
      const decoded: DecodedJwt | null = parseJwt(idToken);
      if (!decoded || !decoded.sub) {
        throw new Error('Invalid OAuth ID token received from Google');
      }

      const salt = getOrCreateUserSalt();
      const address = deriveZkAddress(idToken, salt);
      const randomness =
        sessionStorage.getItem(ZK_STORAGE_KEYS.RANDOMNESS) ||
        localStorage.getItem(ZK_STORAGE_KEYS.RANDOMNESS);
      const maxEpochValue =
        sessionStorage.getItem(ZK_STORAGE_KEYS.MAX_EPOCH) ||
        localStorage.getItem(ZK_STORAGE_KEYS.MAX_EPOCH);
      if (!randomness || !maxEpochValue) {
        throw new Error('zkLogin session data is missing. Please click Google Sign-In again.');
      }

      const proof = await fetchZkProof({
        jwt: idToken,
        maxEpoch: Number(maxEpochValue),
        jwtRandomness: randomness,
        userSalt: salt,
        keypair: getOrCreateEphemeralKeypair(),
      });

      const account: ZkAccount = {
        address,
        email: decoded.email,
        name: decoded.name || decoded.email?.split('@')[0] || 'Google User',
        picture: decoded.picture,
        proof,
        provider: 'google',
      };

      // Persist active zkLogin session
      localStorage.setItem(STORAGE_KEYS.JWT, idToken);
      localStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(account));
      globalZkAccount = account;
      globalJwt = idToken;
      emitChange();

      setZkAccount(account);
      setJwt(idToken);

      return account;
    } catch (err: any) {
      console.error('Failed to complete zkLogin:', err);
      setError(err.message || 'Failed to complete login');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  function logoutZkLogin() {
    clearZkSession();
    localStorage.removeItem(STORAGE_KEYS.JWT);
    localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
    localStorage.removeItem(STORAGE_KEYS.INCOMING_REQS);
    localStorage.removeItem(STORAGE_KEYS.SENT_REQS);
    globalZkAccount = null;
    globalJwt = null;
    emitChange();
    setZkAccount(null);
    setJwt(null);
    setError(null);
  }

  return {
    zkAccount,
    jwt,
    isZkLoggedIn: !!zkAccount,
    isLoading,
    error,
    loginWithGoogle,
    completeZkLogin,
    logoutZkLogin,
  };
}
