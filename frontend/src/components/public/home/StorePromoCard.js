import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * Store promo tile. Rendered only when the merchandise catalogue actually has
 * products — never a fake purchase CTA.
 */
export const StorePromoCard = ({ image, productCount = 0 }) => {
  if (!productCount) return null;
  return (
    <article className="als-tile als-lift min-h-[280px]" data-testid="home-store-promo">
      {image ? (
        <img src={image} alt="Merchandise resmi klub" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <span className="als-stadium-glow absolute inset-0" aria-hidden="true" />
      )}
      <span
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(1,40,145,0.35) 0%, rgba(0,0,0,0.86) 100%)' }}
        aria-hidden="true"
      />
      <div className="relative flex h-full flex-col justify-end p-5">
        <p className="als-eyebrow">Toko Resmi</p>
        <p className="font-display mt-2 text-lg font-extrabold leading-tight" style={{ color: 'var(--club-light)' }}>
          Pakai Warna Klub, Dukung Skuad
        </p>
        <p className="mt-1.5 text-xs" style={{ color: 'rgba(254,254,254,0.78)' }}>
          {productCount} produk resmi tersedia
        </p>
        <Link to="/merchandise" className="als-btn-gold als-focus mt-4 w-full justify-center" data-testid="home-store-promo-cta">
          Lihat Merchandise
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
};

export default StorePromoCard;
