import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Image as ImageIcon, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { useMatchCardDesign, MATCH_CARD_DEFAULT_TRANSPARENCY, clampTransparency } from '../../../lib/matchCardDesign';
import { useResourceList } from '../../../hooks/useResourceList';
import { resolveMediaUrl } from '../gallery/mediaUtils';

const BRAND = {
  gold: '#FCCF2B',
  blue: '#012891',
  dark: '#000000',
  light: '#FEFEFE',
};

const RATIOS = [
  { id: 'feed', label: '4:5 Feed', width: 1080, height: 1350 },
  { id: 'story', label: '9:16 Story', width: 1080, height: 1920 },
];

const STATUS_LABEL = {
  SCHEDULED: 'HARI PERTANDINGAN',
  UPCOMING: 'HARI PERTANDINGAN',
  LIVE: 'LIVE',
  FINISHED: 'SELESAI',
  POSTPONED: 'DITUNDA',
  CANCELLED: 'DIBATALKAN',
};

const formatCardDate = (value) => {
  try {
    return new Date(value)
      .toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      .toUpperCase();
  } catch (e) {
    return value;
  }
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
  // Container tetap + gaya kartu ALSABBAT
  ctx.save();
  roundRect(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.22);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(252,207,43,0.45)';
  ctx.lineWidth = size * 0.02;
  ctx.stroke();
  ctx.restore();

  if (img) {
    // LOGO = contain (tidak pernah dipotong), dengan safe padding di dalam container.
    const inner = size * 0.78;
    const scale = Math.min(inner / img.width, inner / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.save();
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
  } else {
    ctx.save();
    ctx.fillStyle = BRAND.gold;
    ctx.font = `800 ${size * 0.32}px Poppins, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials(label), cx, cy);
    ctx.restore();
  }
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
 * Satu sel sponsor: pill terang (bukan hitam) + logo `contain` sehingga logo
 * tidak pernah terpotong dan transparansi logo tetap terjaga.
 */
const drawSponsorCell = (ctx, item, x, y, w, h) => {
  ctx.save();
  roundRect(ctx, x, y, w, h, h * 0.24);
  ctx.fillStyle = 'rgba(254,254,254,0.94)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(1,40,145,0.16)';
  ctx.lineWidth = Math.max(1, h * 0.03);
  ctx.stroke();
  ctx.restore();

  if (item.img) {
    const maxW = w * 0.84;
    const maxH = h * 0.7;
    const scale = Math.min(maxW / item.img.width, maxH / item.img.height);
    const dw = item.img.width * scale;
    const dh = item.img.height * scale;
    ctx.drawImage(item.img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    return;
  }

  ctx.save();
  ctx.fillStyle = BRAND.blue;
  ctx.font = `700 ${h * 0.3}px Poppins, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(truncate(ctx, (item.name || '').toUpperCase(), w * 0.86), x + w / 2, y + h / 2);
  ctx.restore();
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
  transparencyOverride = null,
  fixedRatio = null,
  bare = false,
  sponsors = null,
}) => {
  const canvasRef = useRef(null);
  const design = useMatchCardDesign();
  const sponsorList = useResourceList('/sponsors', { status: 'ACTIVE', limit: 40 }, { enabled: sponsors === null });
  const activeSponsors = sponsors === null ? sponsorList.items : sponsors;
  const sponsorSignature = JSON.stringify(
    (activeSponsors || []).map((s) => [s.id || s.name, s.logo || '']),
  );
  const [ratio, setRatio] = useState(fixedRatio ? RATIOS.find((r) => r.id === fixedRatio) || RATIOS[0] : RATIOS[0]);
  const [rendering, setRendering] = useState(true);
  const transparency = clampTransparency(
    transparencyOverride === null || transparencyOverride === undefined
      ? design.loading
        ? MATCH_CARD_DEFAULT_TRANSPARENCY
        : design.transparency
      : transparencyOverride,
  );

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

    const [clubImg, opponentImg, coverImg] = await Promise.all([
      loadImage(clubLogo),
      loadImage(match?.opponent?.logo),
      loadImage(match?.match_cover),
    ]);

    // Sponsor aktif: semua tampil, logo dimuat contain (tidak pernah dipotong)
    const sponsorSource = (activeSponsors || []).filter((s) => s && (s.logo || s.name));
    const sponsorItems = await Promise.all(
      sponsorSource.map(async (s) => ({ name: s.name, img: await loadImage(resolveMediaUrl(s.logo)) })),
    );

    // 1. Foto pertandingan sebagai background (cover, boleh terpotong natural)
    const t = transparency / 100; // 1 = foto paling terlihat, 0 = warna kartu paling kuat
    ctx.fillStyle = BRAND.dark;
    ctx.fillRect(0, 0, W, H);
    if (coverImg) {
      const scale = Math.max(W / coverImg.width, H / coverImg.height);
      const dw = coverImg.width * scale;
      const dh = coverImg.height * scale;
      ctx.drawImage(coverImg, (W - dw) / 2, (H - dh) * 0.35, dw, dh);
    }

    // 2. Identitas warna ALSABBAT (navy + gold) — kekuatan mengikuti slider Admin
    const a = (full, min) => (coverImg ? full - (full - min) * t : full);
    const navy = ctx.createLinearGradient(0, 0, W * 0.35, H);
    navy.addColorStop(0, `rgba(1,40,145,${a(0.9, 0.2).toFixed(3)})`);
    navy.addColorStop(0.55, `rgba(1,40,145,${a(0.68, 0.1).toFixed(3)})`);
    navy.addColorStop(1, `rgba(1,40,145,${a(0.5, 0.04).toFixed(3)})`);
    ctx.fillStyle = navy;
    ctx.fillRect(0, 0, W, H);

    const goldGlow = ctx.createRadialGradient(W * 0.12, H * 0.08, 0, W * 0.12, H * 0.08, W * 0.85);
    goldGlow.addColorStop(0, `rgba(252,207,43,${a(0.3, 0.1).toFixed(3)})`);
    goldGlow.addColorStop(1, 'rgba(252,207,43,0)');
    ctx.fillStyle = goldGlow;
    ctx.fillRect(0, 0, W, H);

    const blueGlow = ctx.createRadialGradient(W * 0.9, H * 0.95, 0, W * 0.9, H * 0.95, W * 0.9);
    blueGlow.addColorStop(0, `rgba(1,40,145,${a(0.6, 0.14).toFixed(3)})`);
    blueGlow.addColorStop(1, 'rgba(1,40,145,0)');
    ctx.fillStyle = blueGlow;
    ctx.fillRect(0, 0, W, H);

    // 3. Scrim gelap hanya di area teks (atas & bawah) agar informasi selalu terbaca
    const topScrim = ctx.createLinearGradient(0, 0, 0, H * 0.3);
    topScrim.addColorStop(0, `rgba(0,0,0,${a(0.66, 0.4).toFixed(3)})`);
    topScrim.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topScrim;
    ctx.fillRect(0, 0, W, H * 0.3);
    const bottomScrim = ctx.createLinearGradient(0, H, 0, H * 0.4);
    bottomScrim.addColorStop(0, `rgba(0,0,0,${a(0.88, 0.62).toFixed(3)})`);
    bottomScrim.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bottomScrim;
    ctx.fillRect(0, H * 0.4, W, H * 0.6);

    const pad = W * 0.08;
    const isStory = ratio.id === 'story';

    // Header
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = BRAND.gold;
    ctx.font = `700 ${W * 0.024}px Poppins, sans-serif`;
    const statusText = STATUS_LABEL[match.status] || 'HARI PERTANDINGAN';
    ctx.fillText(statusText.split('').join(' '), pad, pad + W * 0.03);

    ctx.fillStyle = 'rgba(254,254,254,0.72)';
    ctx.font = `500 ${W * 0.022}px Poppins, sans-serif`;
    const meta = [competitionName, seasonName].filter(Boolean).join(' · ');
    if (meta) ctx.fillText(truncate(ctx, meta, W - pad * 2), pad, pad + W * 0.085);

    // Gold rule
    ctx.fillStyle = BRAND.gold;
    ctx.fillRect(pad, pad + W * 0.115, W * 0.16, W * 0.008);

    // Kotak informasi pertandingan (dihitung dulu agar matchup bisa menempel di atasnya)
    const hasScore = match.home_score !== null && match.home_score !== undefined;
    const isHome = match.venue_type !== 'AWAY';
    const clubGoals = hasScore ? (isHome ? match.home_score : match.away_score ?? 0) : null;
    const opponentGoals = hasScore ? (isHome ? match.away_score ?? 0 : match.home_score) : null;
    const scoreText = hasScore ? `${clubGoals} - ${opponentGoals}` : 'VS';

    const venueLabel = isHome ? 'HOME' : match.venue_type === 'NEUTRAL' ? 'NEUTRAL' : 'AWAY';
    const details = [
      match.date ? `${formatCardDate(match.date)}${match.time ? ` · ${match.time.slice(0, 5)} WIB` : ''}` : null,
      [match.venue, venueLabel].filter(Boolean).join(' · '),
    ].filter(Boolean);

    // Panel info: compact (2 baris) agar foto pertandingan tetap focal point
    const lineH = W * 0.042;
    const blockH = W * 0.035 + lineH * details.length;

    // Band sponsor: semua sponsor aktif tampil, ukuran menyesuaikan jumlah
    const sponsorGap = W * 0.02;
    const sponsorRowGap = W * 0.015;
    const sponsorLabelH = W * 0.042;
    const sponsorPerRow = sponsorItems.length
      ? sponsorItems.length <= 4
        ? sponsorItems.length
        : Math.ceil(sponsorItems.length / Math.ceil(sponsorItems.length / 4))
      : 0;
    const sponsorRows = [];
    for (let i = 0; i < sponsorItems.length; i += sponsorPerRow || 1) {
      sponsorRows.push(sponsorItems.slice(i, i + (sponsorPerRow || 1)));
    }
    const sponsorCellW = sponsorPerRow
      ? (W - pad * 2 - sponsorGap * (sponsorPerRow - 1)) / sponsorPerRow
      : 0;
    const sponsorCellH = sponsorPerRow
      ? Math.min(W * 0.075, Math.max(W * 0.042, sponsorCellW * 0.42))
      : 0;
    const sponsorBandH = sponsorRows.length
      ? sponsorLabelH + sponsorRows.length * sponsorCellH + (sponsorRows.length - 1) * sponsorRowGap
      : 0;

    // Susunan dari bawah: footer → sponsor → informasi pertandingan
    const footerY = isStory ? H - pad * 1.2 : H - pad * 0.55;
    const stackBottom = footerY - W * 0.05;
    const sponsorY = sponsorBandH ? stackBottom - sponsorBandH : null;
    const blockBottom = sponsorY !== null ? sponsorY - W * 0.03 : stackBottom;
    const blockY = blockBottom - blockH;

    // Matchup compact: logo saling berdekatan di tengah, posisi menempel ke kotak informasi
    const scoreFont = W * (hasScore ? 0.085 : 0.062);
    ctx.font = `800 ${scoreFont}px Poppins, sans-serif`;
    const scoreWidth = ctx.measureText(scoreText).width;
    const crestSize = W * (isStory ? 0.13 : 0.12);
    const gutter = W * 0.03;
    const crestOffset = scoreWidth / 2 + gutter + crestSize / 2;
    const clubCx = W / 2 - crestOffset;
    const opponentCx = W / 2 + crestOffset;
    const crestY = blockY - W * 0.1 - crestSize / 2;

    drawCrest(ctx, clubImg, clubCx, crestY, crestSize, clubName);
    drawCrest(ctx, opponentImg, opponentCx, crestY, crestSize, match?.opponent?.name || 'OPP');

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = hasScore ? BRAND.gold : BRAND.light;
    ctx.font = `800 ${scoreFont}px Poppins, sans-serif`;
    ctx.fillText(scoreText, W / 2, crestY + scoreFont * 0.35);

    // Nama tim tepat di bawah masing-masing logo
    ctx.font = `600 ${W * 0.024}px Poppins, sans-serif`;
    ctx.fillStyle = BRAND.light;
    ctx.textAlign = 'center';
    const nameY = crestY + crestSize / 2 + W * 0.05;
    const nameMax = W * 0.26;
    ctx.fillText(truncate(ctx, clubName.toUpperCase(), nameMax), clubCx, nameY);
    ctx.fillText(truncate(ctx, (match?.opponent?.name || 'LAWAN').toUpperCase(), nameMax), opponentCx, nameY);

    // Kotak informasi (lebih kecil & lebih transparan)
    ctx.save();
    roundRect(ctx, pad, blockY, W - pad * 2, blockH, W * 0.026);
    ctx.fillStyle = 'rgba(1,40,145,0.30)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(252,207,43,0.26)';
    ctx.lineWidth = W * 0.003;
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    details.forEach((line, index) => {
      ctx.fillStyle = index === 0 ? BRAND.light : 'rgba(254,254,254,0.8)';
      ctx.font = `${index === 0 ? 600 : 500} ${W * (index === 0 ? 0.024 : 0.022)}px Poppins, sans-serif`;
      ctx.fillText(
        truncate(ctx, line, W - pad * 2.4),
        pad + W * 0.04,
        blockY + W * 0.0175 + lineH * (index + 0.72),
      );
    });

    // Band sponsor — tepat di atas footer, di bawah informasi pertandingan
    if (sponsorY !== null) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(252,207,43,0.9)';
      ctx.font = `700 ${W * 0.019}px Poppins, sans-serif`;
      ctx.fillText('DIDUKUNG OLEH'.split('').join(' '), W / 2, sponsorY + sponsorLabelH * 0.7);

      sponsorRows.forEach((row, rowIndex) => {
        const rowW = row.length * sponsorCellW + (row.length - 1) * sponsorGap;
        let x = (W - rowW) / 2;
        const y = sponsorY + sponsorLabelH + rowIndex * (sponsorCellH + sponsorRowGap);
        row.forEach((item) => {
          drawSponsorCell(ctx, item, x, y, sponsorCellW, sponsorCellH);
          x += sponsorCellW + sponsorGap;
        });
      });
    }

    // Footer signature
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(252,207,43,0.85)';
    ctx.font = `700 ${W * 0.02}px Poppins, sans-serif`;
    ctx.fillText(`${clubName.toUpperCase()} FOOTBALL CLUB`.split('').join(' '), W / 2, footerY);

    setRendering(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, clubLogo, clubName, competitionName, seasonName, ratio, transparency, sponsorSignature]);

  useEffect(() => {
    if (!fixedRatio) return;
    const next = RATIOS.find((r) => r.id === fixedRatio);
    if (next) setRatio(next);
  }, [fixedRatio]);

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

  if (bare) {
    return (
      <div
        className="relative overflow-hidden rounded-[var(--radius-md)]"
        style={{ backgroundColor: '#000000' }}
        data-testid={`match-score-card-bare-${ratio.id}`}
      >
        <canvas
          ref={canvasRef}
          className="block h-auto w-full"
          role="img"
          aria-label={`Pratinjau kartu ${ratio.label}`}
          data-testid={`score-card-canvas-${ratio.id}`}
        />
        {rendering ? (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#FCCF2B' }} />
          </span>
        ) : null}
      </div>
    );
  }

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
          <Download className="mr-2 h-4 w-4" aria-hidden="true" /> Unduh PNG
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
        Unggah kartu ke Pustaka Media bila ingin dipublikasikan lewat Social Publishing.
      </p>
    </div>
  );
};

export default MatchScoreCardGenerator;
