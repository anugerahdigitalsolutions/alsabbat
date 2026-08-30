import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useBaraya } from '../../context/BarayaAuthContext';

/**
 * Fase 3 — callback Login Google.
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 */
export default function GoogleAuthCallbackPage() {
  usePageSeo({ title: 'Login Google', path: '/auth/google', robots: 'noindex,nofollow' });
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { googleLogin } = useBaraya();
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get('code');
    const state = params.get('state');
    const expected = sessionStorage.getItem('alsabbat.google.state');
    sessionStorage.removeItem('alsabbat.google.state');

    if (params.get('error')) {
      setError('Login Google dibatalkan.');
      return;
    }
    if (!code) {
      setError('Kode login Google tidak ditemukan.');
      return;
    }
    if (!state || state !== expected) {
      setError('Sesi login Google tidak valid. Silakan ulangi dari halaman login.');
      return;
    }

    googleLogin({ code, redirectUri: `${window.location.origin}/auth/google` }).then((result) => {
      if (result.ok) navigate('/akun', { replace: true });
      else setError(result.message);
    });
  }, [params, googleLogin, navigate]);

  return (
    <div data-testid="page-google-callback">
      <PublicPageHeader
        label="Baraya AL SABBAT"
        title="Menyelesaikan Login Google"
        description="Mohon tunggu, kami sedang memverifikasi akun Google Anda."
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Login Google' }]}
      />
      <div className="als-container py-14">
        {error ? (
          <div className="als-card mx-auto max-w-lg space-y-4 p-6 text-center" data-testid="google-callback-error">
            <p className="flex items-start gap-2 text-sm" style={{ color: '#991B1B' }}>
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
            <Link
              to="/login"
              className="als-focus font-display inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-sm)] px-5 text-sm font-bold"
              style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
              data-testid="google-callback-back"
            >
              Kembali ke Login
            </Link>
          </div>
        ) : (
          <p className="flex items-center justify-center gap-3 text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="google-callback-loading">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Memverifikasi akun Google…
          </p>
        )}
      </div>
    </div>
  );
}
