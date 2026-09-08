import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, LockKeyhole, LogIn, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ClubCrestMark } from '../../components/shared/ClubCrestMark';
import { useAuth } from '../../context/AuthContext';
import { useClub } from '../../context/ClubContext';

export default function AdminLoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const { clubName } = useClub();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(searchParams.get('expired') ? 'Sesi berakhir. Silakan masuk kembali.' : '');

  if (!loading && isAuthenticated) {
    return <Navigate to={location.state?.from || '/admin'} replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);
    if (result.ok) {
      toast.success(`Selamat datang, ${result.user.name}`);
      navigate(location.state?.from || '/admin', { replace: true });
    } else {
      setError(result.message);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6"
      data-admin-ui="true"
      style={{
        backgroundColor: '#060B18',
        backgroundImage:
          'radial-gradient(900px circle at 12% 10%, rgba(1,40,145,0.75), transparent 58%), radial-gradient(700px circle at 88% 92%, rgba(252,207,43,0.22), transparent 55%)',
      }}
      data-testid="page-admin-login"
    >
      <div className="als-pitch-lines pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

      <div
        className="relative grid w-full max-w-5xl overflow-hidden lg:grid-cols-[1.05fr_1fr]"
        style={{
          borderRadius: 26,
          boxShadow: '0 40px 90px -40px rgba(0,0,0,0.75)',
          border: '1px solid rgba(254,254,254,0.10)',
        }}
      >
        {/* Panel branding AL SABBAT */}
        <div
          className="relative hidden flex-col justify-between p-10 lg:flex"
          style={{
            backgroundColor: '#012891',
            backgroundImage:
              'radial-gradient(520px circle at 88% 8%, rgba(252,207,43,0.32), transparent 58%), radial-gradient(420px circle at 0% 100%, rgba(255,255,255,0.14), transparent 60%)',
          }}
          data-testid="admin-login-brand-panel"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 top-24 h-64 w-64 rounded-full"
            style={{ border: '1px solid rgba(255,255,255,0.16)' }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 bottom-[-60px] h-72 w-72 rounded-full"
            style={{ backgroundColor: 'rgba(252,207,43,0.10)' }}
          />

          <div className="relative flex items-center gap-3">
            <ClubCrestMark size={44} onDark testId="login-crest" />
            <div className="leading-tight">
              <p className="font-display text-sm font-bold" style={{ color: 'var(--club-light)' }}>
                {clubName}
              </p>
              <p className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--club-primary)' }}>
                Admin Panel
              </p>
            </div>
          </div>

          <div className="relative">
            <h2 className="font-display text-4xl font-bold leading-[1.08] text-white">
              Selamat datang,
              <br />
              <span style={{ color: 'var(--club-primary)' }}>pengelola klub.</span>
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
              Kelola profil klub, pemain, pertandingan, konten, merchandise, pesanan, dan laporan penjualan
              AL SABBAT dari satu panel.
            </p>
          </div>

          <div className="relative flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/45">
            <span className="h-px w-10" style={{ backgroundColor: 'var(--club-primary)' }} />
            One Club · One Spirit
          </div>
        </div>

        {/* Panel form login — logic tidak diubah */}
        <div className="bg-white p-7 sm:p-10">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <ClubCrestMark size={40} testId="login-crest-mobile" />
            <div className="leading-tight">
              <p className="als-section-label">Admin Panel</p>
              <h1 className="font-display text-lg font-semibold tracking-tight">{clubName}</h1>
            </div>
          </div>

          <span
            className="hidden h-11 w-11 items-center justify-center rounded-full lg:inline-flex"
            style={{ backgroundColor: 'rgba(1,40,145,0.08)' }}
          >
            <LockKeyhole className="h-5 w-5" style={{ color: 'var(--club-secondary)' }} />
          </span>

          <h1 className="font-display mt-5 hidden text-2xl font-bold tracking-tight lg:block">Masuk Admin Panel</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted-fg)' }}>
            Gunakan akun admin yang terdaftar. Akses menu mengikuti role &amp; permission Anda.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-5" data-testid="admin-login-form">
            <div>
              <Label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--muted-fg)' }}
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@alsabbat.com"
                required
                className="h-12 bg-white"
                data-testid="admin-login-username-input"
              />
            </div>

            <div>
              <Label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--muted-fg)' }}
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-12 bg-white"
                data-testid="admin-login-password-input"
              />
            </div>

            {error ? (
              <p
                className="rounded-[var(--radius-sm)] px-3 py-2.5 text-sm"
                style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: '#991B1B' }}
                data-testid="admin-login-error"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-full font-bold"
              size="lg"
              style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
              data-testid="admin-login-submit-button"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              Masuk
            </Button>
          </form>

          <div
            className="mt-8 flex items-start gap-2 rounded-[var(--radius-sm)] px-3.5 py-3 text-xs"
            style={{ backgroundColor: '#F6F8FD', color: 'var(--muted-fg)' }}
          >
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--club-secondary)' }} />
            Halaman publik tidak memerlukan login. Autentikasi hanya untuk pengelolaan platform.
          </div>
        </div>
      </div>
    </div>
  );
}
