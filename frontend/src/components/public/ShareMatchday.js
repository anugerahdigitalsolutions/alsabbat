import React, { useState } from 'react';
import { Check, Copy, Link2, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';

const buildText = ({ match, clubName, competitionName }) => {
  const opponent = match?.opponent?.name || 'Lawan';
  const hasScore = match?.home_score !== null && match?.home_score !== undefined;
  const headline = hasScore
    ? `${clubName} ${match.home_score} — ${match.away_score ?? 0} ${opponent}`
    : `${clubName} vs ${opponent}`;
  const parts = [headline];
  if (competitionName) parts.push(competitionName);
  if (match?.date) parts.push(`${match.date}${match.time ? ` · ${match.time} WIB` : ''}`);
  if (match?.venue) parts.push(match.venue);
  return parts.join(' · ');
};

/**
 * Matchday sharing: Web Share API when available, plus WhatsApp and Copy Link.
 * No claim of automatic posting to any platform that has not authorised it.
 */
export const ShareMatchday = ({ match, clubName = 'ALSABBAT', competitionName, compact = false }) => {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const text = buildText({ match, clubName, competitionName });

  const nativeShare = async () => {
    if (!navigator.share) {
      toast.info('Perangkat ini belum mendukung share bawaan. Gunakan WhatsApp atau Copy Link.');
      return;
    }
    try {
      await navigator.share({ title: text, text, url });
    } catch (e) {
      if (e?.name !== 'AbortError') toast.error('Gagal membuka menu share.');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      toast.success('Link matchday tersalin.');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error('Gagal menyalin link.');
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;

  return (
    <div className={compact ? '' : 'als-card p-5 sm:p-6'} data-testid="share-matchday">
      {compact ? null : (
        <>
          <p className="als-section-label">Bagikan Matchday</p>
          <span className="als-gold-rule mt-2" aria-hidden="true" />
          <p className="mt-3 text-sm" style={{ color: 'var(--muted-fg)' }}>
            Sebarkan informasi pertandingan ini ke suporter ALSABBAT.
          </p>
        </>
      )}

      <div className={`flex flex-wrap gap-2 ${compact ? '' : 'mt-4'}`}>
        <Button
          type="button"
          onClick={nativeShare}
          className="min-h-[44px] font-semibold"
          style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
          aria-label="Bagikan matchday"
          data-testid="share-matchday-native"
        >
          <Share2 className="mr-2 h-4 w-4" aria-hidden="true" /> Bagikan
        </Button>

        <Button
          asChild
          variant="outline"
          className="min-h-[44px] font-semibold"
          data-testid="share-matchday-whatsapp"
        >
          <a href={whatsappHref} target="_blank" rel="noreferrer" aria-label="Bagikan lewat WhatsApp">
            <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" /> WhatsApp
          </a>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={copyLink}
          className="min-h-[44px] font-semibold"
          aria-label="Salin link matchday"
          data-testid="share-matchday-copy"
        >
          {copied ? (
            <Check className="mr-2 h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Copy Link
        </Button>
      </div>

      {compact ? null : (
        <p className="mt-4 flex items-start gap-1.5 text-xs" style={{ color: 'var(--muted-fg)' }}>
          <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {text}
        </p>
      )}
    </div>
  );
};

export default ShareMatchday;
