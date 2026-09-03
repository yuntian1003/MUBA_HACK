// src/hooks/useZkLogin.ts
import { useState, useEffect } from 'react';
import {
  prepareGoogleLoginUrl,
  parseJwt,
  getOrCreateUserSalt,
  deriveZkAddress,
  clearZkSession,
  type DecodedJwt,
} from '../zklogin';

export interface ZkAccount {
  address: string;
  email?: string;
  name?: string;
  picture?: string;
  provider: 'google';
}

const STORAGE_KEYS = {
  JWT: 'smartsplit_zk_jwt',
  ACCOUNT: 'smartsplit_zk_account',
};

export function useZkLogin() {
  const [zkAccount, setZkAccount] = useState<ZkAccount | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    const savedAccount = localStorage.getItem(STORAGE_KEYS.ACCOUNT);
    const savedJwt = localStorage.getItem(STORAGE_KEYS.JWT);

    if (savedAccount && savedJwt) {
      try {
        const decoded = parseJwt(savedJwt);
        if (decoded) {
          setZkAccount(JSON.parse(savedAccount));
          setJwt(savedJwt);
        } else {
          // Token expired or invalid
          logoutZkLogin();
        }
      } catch {
        logoutZkLogin();
      }
    }
  }, []);

  function loginWithGoogle() {
    setIsLoading(true);
    setError(null);
    try {
      const url = prepareGoogleLoginUrl(2000);
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

      const account: ZkAccount = {
        address,
        email: decoded.email,
        name: decoded.name || decoded.email?.split('@')[0] || 'Google User',
        picture: decoded.picture,
        provider: 'google',
      };

      // Persist active zkLogin session
      localStorage.setItem(STORAGE_KEYS.JWT, idToken);
      localStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(account));

      setZkAccount(account);
      setJwt(idToken);

      return account;
    } catch (err: any) {
      console.error('Failed to complete zkLogin:', err);
      setError(err.message || 'Failed to complete login');
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  function logoutZkLogin() {
    clearZkSession();
    localStorage.removeItem(STORAGE_KEYS.JWT);
    localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
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
