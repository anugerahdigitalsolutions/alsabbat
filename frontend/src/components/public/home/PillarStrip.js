import React from 'react';
import { Award, HeartHandshake, Shield, Users } from 'lucide-react';

const PILLARS = [
  { id: 'club', Icon: Shield, title: 'Satu Klub', text: 'ALSABBAT adalah satu klub dengan satu misi.' },
  { id: 'team', Icon: Users, title: 'Satu Tim', text: 'Satu tim. Satu skuad. Satu detak jantung.' },
  { id: 'dream', Icon: HeartHandshake, title: 'Satu Mimpi', text: 'Bermimpi bersama. Meraih bersama.' },
  { id: 'glory', Icon: Award, title: 'Satu Kejayaan', text: 'Untuk lambang. Untuk Baraya. Untuk ALSABBAT.' },
];

/** Brand pillars — identity copy (never presented as statistics). */
export const PillarStrip = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="home-pillars">
    {PILLARS.map(({ id, Icon, title, text }, index) => (
      <article
        key={id}
        className="als-card als-lift flex items-start gap-4 p-5"
        style={{ animation: `als-reveal-in 620ms var(--ease-out) ${index * 90}ms both` }}
        data-testid={`home-pillar-${id}`}
      >
        <span className="als-sq-icon shrink-0">
          <Icon className="h-5 w-5" style={{ color: 'var(--club-secondary)' }} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="font-display block text-sm font-extrabold" style={{ color: 'var(--club-secondary)' }}>
            {title}
          </span>
          <span className="mt-1 block text-xs leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
            {text}
          </span>
        </span>
      </article>
    ))}
  </div>
);

export default PillarStrip;
