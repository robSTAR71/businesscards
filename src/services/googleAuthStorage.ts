import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'google_oauth_tokens';

export interface StoredGoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  issuedAt: number;
}

/** OAuth tokens are credentials, not app data — they live in the encrypted keychain/keystore, never in the SQLite DB. */
export async function saveGoogleTokens(tokens: StoredGoogleTokens): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(tokens));
}

export async function loadGoogleTokens(): Promise<StoredGoogleTokens | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as StoredGoogleTokens) : null;
}

export async function clearGoogleTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
