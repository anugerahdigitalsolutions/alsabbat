import React, { useState } from 'react';
import { AlertCircle, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { apiErrorMessage } from '../../lib/api';
import { barayaRequestOtp } from '../../services/barayaAuth';

/** Fase 3 — form kode OTP 6 digit (dipakai pendaftaran & reset kata sandi). */
export const OtpVerifyForm = ({
  email,
  purpose = 'REGISTER',
  onSubmit,
  submitLabel = 'Verifikasi & Masuk',
  children,
  delivered = true,
  testId = 'otp-form',
}) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [resent, setResent] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await onSubmit(code);
    setBusy(false);
    if (result && result.ok === false) setError(result.message);
  };

  const resend = async () => {
    setError(null);
    setResent(null);
    try {
      const data = await barayaRequestOtp(email, purpose);
      setResent(
        data?.delivered
          ? 'Kode baru telah dikirim ke email Anda.'
          : 'Kode baru dibuat, namun pengiriman email belum dikonfigurasi di server. Hubungi pengurus klub.'
      );
    } catch (e) {
      setError(apiErrorMessage(e, 'Gagal mengirim ulang kode.'));
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit} data-testid={testId}>
      <p
        className="flex items-start gap-2 rounded-[var(--radius-sm)] p-3 text-xs"
        style={{
          backgroundColor: delivered ? 'rgba(22,163,74,0.12)' : 'rgba(252,207,43,0.18)',
          color: delivered ? '#166534' : '#7A5A00',
        }}
        data-testid={`${testId}-info`}
      >
        <MailCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {delivered
          ? `Kode 6 digit telah dikirim ke ${email}. Kode berlaku 10 menit.`
          : `Kode 6 digit sudah dibuat untuk ${email}, tetapi pengiriman email belum dikonfigurasi di server (SMTP2GO). Hubungi pengurus klub untuk mendapatkan kode Anda.`}
      </p>

      {children}

      <div>
        <Label className="mb-1.5 block">Kode Verifikasi</Label>
        <Input
          inputMode="numeric"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          className="text-center font-mono text-lg tracking-[0.5em]"
          data-testid={`${testId}-code`}
        />
      </div>

      <Button
        type="submit"
        disabled={busy || code.length !== 6}
        className="w-full min-h-[44px] font-semibold"
        style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
        data-testid={`${testId}-submit`}
      >
        <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
        {busy ? 'Memproses…' : submitLabel}
      </Button>

      <Button type="button" variant="outline" className="w-full min-h-[44px]" onClick={resend} data-testid={`${testId}-resend`}>
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
        Kirim Ulang Kode
      </Button>

      {resent ? (
        <p className="text-xs" style={{ color: 'var(--muted-fg)' }} data-testid={`${testId}-resent`}>
          {resent}
        </p>
      ) : null}

      {error ? (
        <p
          className="flex items-start gap-2 rounded-[var(--radius-sm)] p-3 text-xs"
          style={{ backgroundColor: 'rgba(220,38,38,0.10)', color: '#991B1B' }}
          data-testid={`${testId}-error`}
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </form>
  );
};

export default OtpVerifyForm;
