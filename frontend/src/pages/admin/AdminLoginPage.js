import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, LogIn, ShieldCheck } from 'lucide-react';
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
      className="relative flex min-h-screen items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--club-tertiary)' }}
      data-testid="page-admin-login"
    >
      <div className="als-stadium-glow absolute inset-0" />
      <div className="als-pitch-lines absolute inset-0" />

      <div
        className="relative w-full max-w-md rounded-[var(--radius-xl)] p-7 sm:p-8"
        style={{ backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="mb-7 flex items-center gap-3">
          <ClubCrestMark size={46} testId="login-crest" />
          <div>
            <p className="als-section-label">Admin Panel</p>
            <h1 className="font-display text-xl font-semibold tracking-tight">{clubName}</h1>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4" data-testid="admin-login-form">
          <div>
            <Label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
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
              className="bg-white"
              data-testid="admin-login-username-input"
            />
          </div>

          <div>
            <Label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
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
              className="bg-white"
              data-testid="admin-login-password-input"
            />
          </div>

          {error ? (
            <p
              className="rounded-[var(--radius-sm)] px-3 py-2 text-sm"
              style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: '#991B1B' }}
              data-testid="admin-login-error"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full font-semibold"
            size="lg"
            style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A' }}
            data-testid="admin-login-submit-button"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            Masuk
          </Button>
        </form>

        <div
          className="mt-6 flex items-start gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-xs"
          style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted-fg)' }}
        >
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--club-secondary)' }} />
          Halaman publik tidak memerlukan login. Autentikasi hanya untuk pengelolaan platform.
        </div>
      </div>
    </div>
  );
}
