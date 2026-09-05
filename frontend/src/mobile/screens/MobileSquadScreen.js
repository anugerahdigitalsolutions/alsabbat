import React, { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { useResourceList } from '../../hooks/useResourceList';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useClub } from '../../context/ClubContext';
import { BarayaTopBar } from '../components/BarayaTopBar';
import { BarayaNotificationButton } from '../components/BarayaNotificationButton';
import { BrzPlayerCard, POSITION_LABEL } from '../components/BrzPlayerCard';
import { BrzEmpty, BrzError, BrzLoading } from '../components/BrzStates';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';
import { Link } from 'react-router-dom';

const POSITION_ORDER = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'];

/**
 * BARAYA AL SABBAT — Squad screen (`/teams`).
 * Real data from `/api/teams`, `/api/players`, `/api/staff`.
 */
export default function MobileSquadScreen() {
  const { shortName } = useClub();
  const [tab, setTab] = useState('players');

  usePageSeo({
    title: 'Skuad',
    description: 'Skuad pemain dan staf AL SABBAT Football Club.',
    path: '/teams',
  });

  const teams = useResourceList('/teams', { limit: 20 });
  const players = useResourceList('/players', { status: 'ACTIVE', limit: 80 });
  const staff = useResourceList('/staff', { status: 'ACTIVE', limit: 40 });

  const grouped = useMemo(() => {
    const map = new Map();
    POSITION_ORDER.forEach((key) => map.set(key, []));
    players.items.forEach((player) => {
      const key = POSITION_ORDER.includes(player.position) ? player.position : 'MIDFIELDER';
      map.get(key).push(player);
    });
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [players.items]);

  return (
    <div data-testid="baraya-squad">
      <BarayaTopBar title="Skuad" actions={<BarayaNotificationButton />} testId="brz-squad-topbar" />

      <div className="brz-page">
        {teams.items.length > 0 ? (
          <div className="brz-hscroll -mx-4 mb-4" data-testid="brz-squad-teams">
            {teams.items.map((team) => (
              <Link key={team.id} to={`/teams/${team.id}`} className="brz-chip">
                {team.name}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="flex gap-2" role="tablist" aria-label="Skuad">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'players'}
            className={`brz-chip flex-1 justify-center${tab === 'players' ? ' brz-chip--active' : ''}`}
            onClick={() => setTab('players')}
            data-testid="brz-squad-tab-players"
          >
            Pemain ({players.items.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'staff'}
            className={`brz-chip flex-1 justify-center${tab === 'staff' ? ' brz-chip--active' : ''}`}
            onClick={() => setTab('staff')}
            data-testid="brz-squad-tab-staff"
          >
            Staf ({staff.items.length})
          </button>
        </div>

        <div className="mt-4">
          {tab === 'players' ? (
            players.loading ? (
              <BrzLoading rows={3} height={72} testId="brz-squad-loading" />
            ) : players.error ? (
              <BrzError message={players.error} onRetry={players.reload} testId="brz-squad-error" />
            ) : grouped.length === 0 ? (
              <BrzEmpty
                icon={Users}
                title="Belum ada pemain"
                description={`Skuad ${shortName || 'AL SABBAT'} akan tampil setelah diisi melalui Admin Panel.`}
                testId="brz-squad-empty"
              />
            ) : (
              grouped.map(([position, list]) => (
                <section key={position} className="mb-5">
                  <p className="brz-label mb-2">{POSITION_LABEL[position] || position}</p>
                  <div className="flex flex-col gap-2">
                    {list.map((player) => (
                      <BrzPlayerCard key={player.id} player={player} variant="row" />
                    ))}
                  </div>
                </section>
              ))
            )
          ) : staff.loading ? (
            <BrzLoading rows={3} height={72} testId="brz-staff-loading" />
          ) : staff.items.length === 0 ? (
            <BrzEmpty
              icon={Users}
              title="Belum ada staf"
              description="Data staf dikelola melalui Admin Panel pada modul Staf."
              testId="brz-staff-empty"
            />
          ) : (
            <div className="flex flex-col gap-2">
              {staff.items.map((person) => (
                <Link
                  key={person.id}
                  to={`/staff/${person.id}`}
                  className="brz-card brz-card--pad flex items-center gap-3"
                  data-testid={`brz-staff-${person.id}`}
                >
                  {person.photo ? (
                    <img
                      src={resolveMediaUrl(person.photo)}
                      alt=""
                      className="brz-avatar"
                      style={{ width: 46, height: 46 }}
                      loading="lazy"
                    />
                  ) : (
                    <span className="brz-avatar" style={{ width: 46, height: 46, color: 'var(--brz-text-dim)' }}>
                      <Users size={19} aria-hidden="true" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="brz-clamp-1 block text-[14px] font-semibold">{person.name}</span>
                    <span className="brz-meta block">{person.role_label || person.role}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
