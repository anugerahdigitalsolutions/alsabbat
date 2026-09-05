/**
 * Native Google Sign-In on top of the EXISTING backend exchange endpoint
 * `POST /api/baraya/google/login` (authorization-code flow, client secret
 * stays on the server).
 *
 * The backend only accepts `https://` redirect URIs, so the app reuses the
 * official website callback path `/auth/google` and captures it natively via
 * the Android App Link declared in `app.config.js`.
 *
 * The button is hidden whenever `/api/baraya/auth/config` reports Google as
 * not configured — exactly like the website.
 */
import { useCallback, useState } from 'react';
import * as AuthSession from 'expo-auth-session';

import { GOOGLE_ANDROID_CLIENT_ID, GOOGLE_REDIRECT_URI } from '../api/client';

const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export function useGoogleAuth({ config, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const clientId = GOOGLE_ANDROID_CLIENT_ID || config?.google_client_id || '';
  const redirectUri = GOOGLE_REDIRECT_URI;
  const enabled = Boolean(config?.google_enabled && clientId && redirectUri);

  const promptAsync = useCallback(async () => {
    if (!enabled) return;
    setError(null);
    setBusy(true);
    try {
      const request = new AuthSession.AuthRequest({
        clientId,
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        scopes: ['openid', 'profile', 'email'],
        usePKCE: false,
        extraParams: { prompt: 'select_account' },
      });
      const result = await request.promptAsync(DISCOVERY);
      if (result.type !== 'success' || !result.params?.code) {
        if (result.type === 'error') setError('Login Google gagal. Coba lagi.');
        return;
      }
      await onSuccess({ code: result.params.code, redirectUri });
    } catch (e) {
      setError(e?.message || 'Login Google gagal.');
    } finally {
      setBusy(false);
    }
  }, [enabled, clientId, redirectUri, onSuccess]);

  return { enabled, busy, error, promptAsync, redirectUri };
}

export default useGoogleAuth;
