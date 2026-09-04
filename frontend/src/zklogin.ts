// src/zklogin.ts
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  generateNonce,
  generateRandomness,
  jwtToAddress,
  getExtendedEphemeralPublicKey,
} from '@mysten/sui/zklogin';

export const STORAGE_KEYS = {
  EPHEMERAL_KEY: 'smartsplit_zk_ephemeral_key',
  RANDOMNESS: 'smartsplit_zk_randomness',
  MAX_EPOCH: 'smartsplit_zk_max_epoch',
  SALT: 'smartsplit_zk_user_salt',
  JWT: 'smartsplit_zk_jwt',
  PROOF: 'smartsplit_zk_proof',
};

export interface DecodedJwt {
  sub: string;
  email?: string;
  name?: string;
  exp?: number;
  iat?: number;
  picture?: string;
  iss?: string;
  aud?: string;
}

/**
 * Decode JWT token payload without external library
 */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const REDIRECT_URI = typeof window !== 'undefined'
  ? `${window.location.origin}/auth/callback`
  : 'http://localhost:5173/auth/callback';

export function parseJwt(jwtToken: string): DecodedJwt | null {
  try {
    const base64Url = jwtToken.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to parse JWT:', err);
    return null;
  }
}

/**
 * Get or create ephemeral Ed25519 keypair for zkLogin session
 */
export function getOrCreateEphemeralKeypair(): Ed25519Keypair {
  const existingSecret =
    sessionStorage.getItem(STORAGE_KEYS.EPHEMERAL_KEY) ||
    localStorage.getItem(STORAGE_KEYS.EPHEMERAL_KEY);
  if (existingSecret) {
    try {
      const secretBytes = new Uint8Array(JSON.parse(existingSecret));
      return Ed25519Keypair.fromSecretKey(secretBytes);
    } catch {
      // Fall through to generate new keypair if parse fails
    }
  }

  const keypair = new Ed25519Keypair();
  const secretKeyBytes = Array.from(keypair.getSecretKey());
  const serialized = JSON.stringify(secretKeyBytes);
  sessionStorage.setItem(STORAGE_KEYS.EPHEMERAL_KEY, serialized);
  localStorage.setItem(STORAGE_KEYS.EPHEMERAL_KEY, serialized);
  return keypair;
}

/**
 * Clear stored ephemeral session data
 */
export function clearZkSession() {
  sessionStorage.removeItem(STORAGE_KEYS.EPHEMERAL_KEY);
  sessionStorage.removeItem(STORAGE_KEYS.RANDOMNESS);
  sessionStorage.removeItem(STORAGE_KEYS.MAX_EPOCH);
  sessionStorage.removeItem(STORAGE_KEYS.JWT);
  sessionStorage.removeItem(STORAGE_KEYS.PROOF);
  localStorage.removeItem(STORAGE_KEYS.EPHEMERAL_KEY);
  localStorage.removeItem(STORAGE_KEYS.RANDOMNESS);
  localStorage.removeItem(STORAGE_KEYS.MAX_EPOCH);
}

/**
 * Get or create persistent user salt
 */
export function getOrCreateUserSalt(): string {
  let salt = localStorage.getItem(STORAGE_KEYS.SALT);
  if (!salt) {
    // Generate a secure 16-byte numeric salt string
    const randomArray = new Uint8Array(16);
    crypto.getRandomValues(randomArray);
    salt = Array.from(randomArray).map((b) => b.toString(10)).join('');
    localStorage.setItem(STORAGE_KEYS.SALT, salt);
  }
  return salt;
}

/**
 * Prepare Google OAuth login URL with generated zkLogin nonce
 */
export function prepareGoogleLoginUrl(maxEpoch: number = 2000): string {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not configured.');
  }
  const keypair = getOrCreateEphemeralKeypair();
  const randomness = generateRandomness();

  sessionStorage.setItem(STORAGE_KEYS.RANDOMNESS, randomness);
  localStorage.setItem(STORAGE_KEYS.RANDOMNESS, randomness);
  sessionStorage.setItem(STORAGE_KEYS.MAX_EPOCH, maxEpoch.toString());
  localStorage.setItem(STORAGE_KEYS.MAX_EPOCH, maxEpoch.toString());

  const nonce = generateNonce(keypair.getPublicKey(), maxEpoch, randomness);

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    response_type: 'id_token',
    redirect_uri: REDIRECT_URI,
    scope: 'openid email profile',
    nonce: nonce,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Derive user's Sui address from JWT and user salt
 */
export function deriveZkAddress(jwt: string, salt: string): string {
  return jwtToAddress(jwt, salt, false);
}

/**
 * Fetch ZK proof from Mysten public prover service (testnet)
 */
export async function fetchZkProof(params: {
  jwt: string;
  maxEpoch: number;
  jwtRandomness: string;
  userSalt: string;
  keypair: Ed25519Keypair;
}): Promise<any> {
  const { jwt, maxEpoch, jwtRandomness, userSalt, keypair } = params;

  // Mysten devnet/testnet prover service
  const PROVER_URL = 'https://prover-dev.mystenlabs.com/v1';

  const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(keypair.getPublicKey());

  const response = await fetch(PROVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jwt,
      extendedEphemeralPublicKey,
      maxEpoch,
      jwtRandomness,
      salt: userSalt,
      keyClaimName: 'sub',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ZK Prover error (${response.status}): ${errText}`);
  }

  return response.json();
}
