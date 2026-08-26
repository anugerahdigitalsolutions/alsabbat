import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Image as ImageIcon, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';

const BRAND = {
  gold: '#FCCF2B',
  blue: '#012891',
  dark: '#000000',
  light: '#FEFEFE',
};

const RATIOS = [
  { id: 'square', label: '1:1 Feed', width: 1080, height: 1080 },
  { id: 'story', label: '9:16 Story', width: 1080, height: 1920 },
];

const STATUS_LABEL = {
  SCHEDULED: 'MATCHDAY',
  UPCOMING: 'MATCHDAY',
  LIVE: 'LIVE',
  FINISHED: 'FULL TIME',
  POSTPONED: 'DITUNDA',
  CANCELLED: 'DIBATALKAN',
};

const loadImage = (src) =>
  new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || '?';

const drawCrest = (ctx, img, cx, cy, size, label) => {
  ctx.save();
  roundRect(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.22);
  ctx.fillStyle = 'rgba(254,254,254,0.06)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(252,207,43,0.45)';
  ctx.lineWidth = size * 0.02;
  ctx.stroke();
  ctx.clip();
  if (img) {
    const scale = Math.min(size / img.width, size / img.height) * 0.78;
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.fillStyle = BRAND.gold;
    ctx.font = `800 ${size * 0.32}px Poppins, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials(label), cx, cy);
  }
  ctx.restore();
};

const truncate = (ctx, text, maxWidth) => {
  let value = text || '';
  if (ctx.measureText(value).width <= maxWidth) return value;
  while (value.length > 3 && ctx.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
};

/**
 * MatchScoreCardGenerator — renders a share-ready match card from REAL match
 * data on a canvas (no heavy dependency, no hard-coded content).
 */
export const MatchScoreCardGenerator = ({
  match,
  clubName = 'ALSABBAT',
  clubLogo,
  competitionName,
  seasonName,
}) => {
  const canvasRef = useRef(null);
  const [ratio, setRatio] = useState(RATIOS[0]);
  const [rendering, setRendering] = useState(true);

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !match) return;
    setRendering(true);
    const { width: W, height: H } = ratio;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    if (document.fonts?.ready) {
      try {
        await document.fonts.load('800 100px Poppins');
        await document.fonts.ready;
      } catch (e) {
        /* fallback font is acceptable */
      }
    }

    const [clubImg, opponentImg] = await Promise.all([
      loadImage(clubLogo),
      loadImage(match?.opponent?.logo),
    ]);

    // Background
    ctx.fillStyle = BRAND.dark;
    ctx.fillRect(0, 0, W, H);
    const goldGlow = ctx.createRadialGradient(W * 0.12, H * 0.1, 0, W * 0.12, H * 0.1, W * 0.85);
    goldGlow.addColorStop(0, 'rgba(252,207,43,0.20)');
    goldGlow.addColorStop(1, 'rgba(252,207,43,0)');
    ctx.fillStyle = goldGlow;
    ctx.fillRect(0, 0, W, H);
    const blueGlow = ctx.createRadialGradient(W * 0.9, H * 0.95, 0, W * 0.9, H * 0.95, W * 0.9);
    blueGlow.addColorStop(0, 'rgba(1,40,145,0.55)');
    blueGlow.addColorStop(1, 'rgba(1,40,145,0)');
    ctx.fillStyle = blueGlow;
    ctx.fillRect(0, 0, W, H);

    // Pitch lines (subtle vertical stripes)
    ctx.save();
    ctx.strokeStyle = 'rgba(254,254,254,0.045)';
    ctx.lineWidth = 2;
    for (let x = W * 0.08; x < W; x += W * 0.085) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    ctx.restore();

    const pad = W * 0.08;
    const isStory = ratio.id === 'story';
    const centerY = isStory ? H * 0.44 : H * 0.5;

    // Header
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = BRAND.gold;
    ctx.font = `700 ${W * 0.032}px Poppins, sans-serif`;
    const statusText = STATUS_LABEL[match.status] || 'MATCHDAY';
    ctx.fillText(statusText.split('').join(' '), pad, pad + W * 0.03);

    ctx.fillStyle = 'rgba(254,254,254,0.72)';
    ctx.font = `500 ${W * 0.028}px Poppins, sans-serif`;
    const meta = [competitionName, seasonName].filter(Boolean).join(' · ');
    if (meta) ctx.fillText(truncate(ctx, meta, W - pad * 2), pad, pad + W * 0.085);

    // Gold rule
    ctx.fillStyle = BRAND.gold;
    ctx.fillRect(pad, pad + W * 0.115, W * 0.16, W * 0.008);

    // Crests + score
    const hasScore = match.home_score !== null && match.home_score !== undefined;
    const isHome = match.venue_type !== 'AWAY';
    const clubGoals = hasScore ? (isHome ? match.home_score : match.away_score ?? 0) : null;
    const opponentGoals = hasScore ? (isHome ? match.away_score ?? 0 : match.home_score) : null;
    const scoreText = hasScore ? `${clubGoals} - ${opponentGoals}` : 'VS';

    // Crest size adapts to the measured score width so nothing ever overlaps.
    const scoreFont = W * (hasScore ? 0.11 : 0.085);
    ctx.font = `800 ${scoreFont}px Poppins, sans-serif`;
    const scoreWidth = ctx.measureText(scoreText).width;
    const gutter = W * 0.05;
    const maxCrest = (W - pad * 2 - scoreWidth - gutter * 2) / 2;
    const crestSize = Math.max(W * 0.13, Math.min(isStory ? W * 0.22 : W * 0.2, maxCrest));
    const crestY = centerY - (isStory ? W * 0.18 : W * 0.02);
    drawCrest(ctx, clubImg, pad + crestSize / 2, crestY, crestSize, clubName);
    drawCrest(ctx, opponentImg, W - pad - crestSize / 2, crestY, crestSize, match?.opponent?.name || 'OPP');

    ctx.textAlign = 'center';
    ctx.fillStyle = hasScore ? BRAND.gold : BRAND.light;
    ctx.font = `800 ${scoreFont}px Poppins, sans-serif`;
    ctx.fillText(scoreText, W / 2, crestY + scoreFont * 0.35);

    // Team names
    ctx.font = `700 ${W * 0.034}px Poppins, sans-serif`;
    ctx.fillStyle = BRAND.light;
    ctx.textAlign = 'center';
    const nameY = crestY + crestSize / 2 + W * 0.07;
    ctx.fillText(truncate(ctx, clubName.toUpperCase(), W * 0.3), pad + crestSize / 2, nameY);
    ctx.fillText(
      truncate(ctx, (match?.opponent?.name || 'LAWAN').toUpperCase(), W * 0.3),
      W - pad - crestSize / 2,
      nameY,
    );

    // Detail block
    const details = [
      match.date ? `${match.date}${match.time ? ` · ${match.time} WIB` : ''}` : null,
      match.venue || null,
      isHome ? 'HOME' : match.venue_type === 'NEUTRAL' ? 'NEUTRAL' : 'AWAY',
    ].filter(Boolean);

    const blockH = W * (0.06 + 0.062 * details.length);
    const blockY = isStory ? H * 0.66 : H - pad - blockH;
    ctx.save();
    roundRect(ctx, pad, blockY, W - pad * 2, blockH, W * 0.03);
    ctx.fillStyle = 'rgba(254,254,254,0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(252,207,43,0.28)';
    ctx.lineWidth = W * 0.004;
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.font = `500 ${W * 0.032}px Poppins, sans-serif`;
    details.forEach((line, index) => {
      ctx.fillStyle = index === 0 ? BRAND.light : 'rgba(254,254,254,0.75)';
      ctx.fillText(truncate(ctx, line, W - pad * 2.6), pad + W * 0.05, blockY + W * 0.075 + index * W * 0.062);
    });

    // Footer signature
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(252,207,43,0.85)';
    ctx.font = `700 ${W * 0.026}px Poppins, sans-serif`;
    ctx.fillText(
      `${clubName.toUpperCase()} FOOTBALL CLUB`.split('').join(' '),
      W / 2,
      isStory ? H - pad * 0.9 : H - pad * 0.35,
    );

    setRendering(false);
  }, [match, clubLogo, clubName, competitionName, seasonName, ratio]);

  useEffect(() => {
    render();
  }, [render]);

  const fileName = () => {
    const opponent = (match?.opponent?.name || 'lawan').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `alsabbat-vs-${opponent}-${ratio.id}.png`;
  };

  const toBlob = () =>
    new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        resolve(null);
        return;
      }
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });

  const download = async () => {
    const blob = await toBlob();
    if (!blob) {
      toast.error('Gagal membuat kartu pertandingan.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName();
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Kartu pertandingan diunduh.');
  };

  const shareImage = async () => {
    const blob = await toBlob();
    if (!blob) return;
    const file = new File([blob], fileName(), { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Matchday ALSABBAT' });
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return;
      }
    }
    toast.info('Share gambar tidak didukung perangkat ini — kartu diunduh agar bisa diunggah manual.');
    download();
  };

  if (!match) return null;

  return (
    <div className="als-card p-5 sm:p-6" data-testid="match-score-card">
      <p className="als-section-label">Kartu Pertandingan</p>
      <span className="als-gold-rule mt-2" aria-hidden="true" />
      <p className="mt-3 text-sm" style={{ color: 'var(--muted-fg)' }}>
        Dibuat otomatis dari data pertandingan ini. Unduh untuk konten Instagram, Story, atau Shorts.
      </p>

      <div className="mt-4 flex gap-2" role="group" aria-label="Rasio kartu">
        {RATIOS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={ratio.id === item.id ? 'default' : 'outline'}
            onClick={() => setRatio(item)}
            className="min-h-[40px] font-semibold"
            style={ratio.id === item.id ? { backgroundColor: 'var(--club-secondary)', color: '#FEFEFE' } : undefined}
            aria-pressed={ratio.id === item.id}
            data-testid={`score-card-ratio-${item.id}`}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div
        className="relative mt-4 overflow-hidden rounded-[var(--radius-md)]"
        style={{ backgroundColor: '#000000' }}
      >
        <canvas
          ref={canvasRef}
          className="block h-auto w-full"
          role="img"
          aria-label={`Kartu pertandingan ${clubName} melawan ${match?.opponent?.name || 'lawan'}`}
          data-testid="score-card-canvas"
        />
        {rendering ? (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#FCCF2B' }} />
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={download}
          className="min-h-[44px] font-semibold"
          style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
          data-testid="score-card-download"
        >
          <Download className="mr-2 h-4 w-4" aria-hidden="true" /> Download PNG
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={shareImage}
          className="min-h-[44px] font-semibold"
          data-testid="score-card-share"
        >
          <Share2 className="mr-2 h-4 w-4" aria-hidden="true" /> Bagikan Kartu
        </Button>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs" style={{ color: 'var(--muted-fg)' }}>
        <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Unggah kartu ke Media Library bila ingin dipublikasikan lewat Social Publishing.
      </p>
    </div>
  );
};

export default MatchScoreCardGenerator;
