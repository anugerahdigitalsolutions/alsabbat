import React, { useEffect, useState } from 'react';
import { barayaAuthConfig } from '../../services/barayaAuth';

/**
 * Fase 3 — tombol Login Google (authorization code flow).
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 */
export const GoogleLoginButton = ({ label = 'Masuk dengan Google', testId = 'google-login-button' }) => {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    barayaAuthConfig()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  if (!config?.google_enabled || !config?.google_client_id) return null;

  const start = () => {
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('alsabbat.google.state', state);
    const redirectUri = `${window.location.origin}/auth/google`;
    const params = new URLSearchParams({
      client_id: config.google_client_id,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      include_granted_scopes: 'true',
      prompt: 'select_account',
      state,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  return (
    <button
      type="button"
      onClick={start}
      className="als-focus flex min-h-[44px] w-full items-center justify-center gap-3 rounded-[var(--radius-sm)] border bg-white text-sm font-semibold transition-colors duration-200 hover:bg-[rgba(0,0,0,0.03)]"
      style={{ borderColor: 'var(--border-soft)', color: '#000000' }}
      data-testid={testId}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H1.96v2.34A9 9 0 0 0 9 18Z" />
        <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H1.96a9 9 0 0 0 0 8.12l2.01-2.34Z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 1.96 4.94l2.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z" />
      </svg>
      {label}
    </button>
  );
};

export default GoogleLoginButton;
