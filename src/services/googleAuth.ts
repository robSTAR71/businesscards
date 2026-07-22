import { TokenResponse } from 'expo-auth-session';
import { loadGoogleTokens, saveGoogleTokens } from './googleAuthStorage';

/**
 * Google's fixed OAuth endpoints. Hardcoded rather than fetched from the well-known discovery
 * document — they're stable, and skipping that lookup saves a network round trip on every sign-in.
 */
export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export const GOOGLE_CONTACTS_SCOPES = ['https://www.googleapis.com/auth/contacts'];

export class MissingGoogleConfigError extends Error {
  constructor() {
    super(
      'Keine Google-OAuth-Client-ID konfiguriert. Setze EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID in .env ' +
        '(siehe README, Abschnitt "Google Contacts Sync").'
    );
    this.name = 'MissingGoogleConfigError';
  }
}

export function getGoogleClientId(): string {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new MissingGoogleConfigError();
  }
  return clientId;
}

/**
 * Returns a currently-valid access token, refreshing it in the background if it's expired.
 * Returns null if the user has never signed in — the caller is responsible for triggering sign-in.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const stored = await loadGoogleTokens();
  if (!stored) {
    return null;
  }

  const tokenResponse = new TokenResponse({
    accessToken: stored.accessToken,
    tokenType: 'bearer',
    refreshToken: stored.refreshToken,
    expiresIn: stored.expiresIn,
    issuedAt: stored.issuedAt,
  });

  if (TokenResponse.isTokenFresh(tokenResponse)) {
    return tokenResponse.accessToken;
  }
  if (!stored.refreshToken) {
    return null;
  }

  const refreshed = await tokenResponse.refreshAsync({ clientId: getGoogleClientId() }, GOOGLE_DISCOVERY);
  await saveGoogleTokens({
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? stored.refreshToken,
    expiresIn: refreshed.expiresIn,
    issuedAt: refreshed.issuedAt,
  });
  return refreshed.accessToken;
}
