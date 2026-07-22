import { useCallback, useEffect, useMemo } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { GOOGLE_CONTACTS_SCOPES, GOOGLE_DISCOVERY, getValidAccessToken } from '../services/googleAuth';
import { saveGoogleTokens } from '../services/googleAuthStorage';
import { syncContactToGoogle } from '../services/googleContactsService';
import type { Contact } from '../types/contact';

// Required once per app so the browser-based OAuth popup can hand control back to the app.
WebBrowser.maybeCompleteAuthSession();

/**
 * Google sign-in + People API sync for the Review screen. Not runnable/testable in this
 * environment (no Google Cloud project, no device, no browser) — see server/ocr-worker-style
 * setup notes in the README before relying on this in production.
 */
export function useGoogleContactsSync() {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ?? '';
  const isConfigured = Boolean(clientId);
  const redirectUri = useMemo(() => AuthSession.makeRedirectUri(), []);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: GOOGLE_CONTACTS_SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    isConfigured ? GOOGLE_DISCOVERY : null
  );

  useEffect(() => {
    if (response?.type === 'success' && request?.codeVerifier) {
      AuthSession.exchangeCodeAsync(
        {
          clientId,
          code: response.params.code,
          redirectUri,
          extraParams: { code_verifier: request.codeVerifier },
        },
        GOOGLE_DISCOVERY
      ).then((tokenResponse) =>
        saveGoogleTokens({
          accessToken: tokenResponse.accessToken,
          refreshToken: tokenResponse.refreshToken,
          expiresIn: tokenResponse.expiresIn,
          issuedAt: tokenResponse.issuedAt,
        })
      );
    }
    // response identity changes on every auth attempt; clientId/redirectUri are stable per session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const signIn = useCallback(async () => {
    if (!isConfigured) {
      throw new Error(
        'Keine Google-OAuth-Client-ID konfiguriert (EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID). Siehe README.'
      );
    }
    await promptAsync();
  }, [isConfigured, promptAsync]);

  const syncContact = useCallback(
    async (contact: Contact): Promise<{ resourceName: string }> => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        await signIn();
        throw new Error('Bitte den Google-Anmeldevorgang abschließen und danach erneut auf Speichern tippen.');
      }
      return syncContactToGoogle(accessToken, contact);
    },
    [signIn]
  );

  return { isConfigured, signIn, syncContact };
}
