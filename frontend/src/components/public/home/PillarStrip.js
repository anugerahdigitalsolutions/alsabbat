import React from 'react';
import { Award, HeartHandshake, Shield, Users } from 'lucide-react';
import { defaultSiteText } from '../../../lib/siteContent';

const PILLARS = [
  { id: 'club', Icon: Shield },
  { id: 'team', Icon: Users },
  { id: 'dream', Icon: HeartHandshake },
  { id: 'glory', Icon: Award },
];

/** Brand pillars — admin-editable copy (never presented as statistics). */
export const PillarStrip = ({ t = defaultSiteText }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="home-pillars">
    {PILLARS.map(({ id, Icon }, index) => (
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
            {t(`home.pillar.${id}.title`)}
          </span>
          <span className="mt-1 block text-xs leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
            {t(`home.pillar.${id}.text`)}
          </span>
        </span>
      </article>
    ))}
  </div>
);

export default PillarStrip;
