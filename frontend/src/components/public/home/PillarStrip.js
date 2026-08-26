import React from 'react';
import { Award, HeartHandshake, Shield, Users } from 'lucide-react';

const PILLARS = [
  { id: 'club', Icon: Shield, title: 'One Club', text: 'ALSABBAT is one club with one mission.' },
  { id: 'team', Icon: Users, title: 'One Team', text: 'One team. One squad. One heartbeat.' },
  { id: 'dream', Icon: HeartHandshake, title: 'One Dream', text: 'We dream together. We achieve together.' },
  { id: 'glory', Icon: Award, title: 'One Glory', text: 'For the badge. For the fans. For ALSABBAT.' },
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
