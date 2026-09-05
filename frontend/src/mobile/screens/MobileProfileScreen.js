import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  CreditCard,
  FileText,
  Images,
  LogOut,
  Mail,
  Phone,
  ShoppingBag,
  UserPlus,
} from 'lucide-react';
import { barayaApi } from '../../lib/api';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useBaraya } from '../../context/BarayaAuthContext';
import { canRegisterStaff, canApplyPlayer, roleLabel } from '../../lib/memberAccess';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';
import { BarayaTopBar } from '../components/BarayaTopBar';
import { BrzSection } from '../components/BrzSection';
import { BrzEmpty, BrzLoading } from '../components/BrzStates';

const formatDate = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return null;
  }
};

/**
 * BARAYA AL SABBAT — Profile screen.
 *
 * Uses the EXISTING Baraya account system only:
 *   /api/baraya/me (via context) · /api/baraya/notifications · logout
 * No second user system, no new endpoints.
 */
export default function MobileProfileScreen() {
  const navigate = useNavigate();
  const { customer, logout } = useBaraya();
  const [tab, setTab] = useState('profile');
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  usePageSeo({
    title: 'Profil',
    description: 'Profil dan akun AL SABBAT.',
    path: '/akun',
  });

  const loadNotifications = useCallback(() => {
    setLoadingNotifications(true);
    barayaApi
      .get('/baraya/notifications', { params: { limit: 20 } })
      .then(({ data }) => {
        setNotifications(data?.items || []);
        setUnread(Number(data?.unread || 0));
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoadingNotifications(false));
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAllRead = () => {
    barayaApi
      .post('/baraya/notifications/read-all')
      .then(() => {
        setUnread(0);
        setNotifications((items) => items.map((item) => ({ ...item, read: true, is_read: true })));
      })
      .catch(() => {});
  };

  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  const photo = resolveMediaUrl(customer?.photo_url);
  const menu = [
    { to: '/akun/kartu', label: 'Kartu Member', icon: CreditCard },
    { to: '/akun/pesanan', label: 'Pesanan Saya', icon: ShoppingBag },
    { to: '/gallery', label: 'Galeri AL SABBAT', icon: Images },
    ...(canApplyPlayer(customer) ? [{ to: '/akun/pengajuan', label: 'Daftar Pemain', icon: UserPlus }] : []),
    ...(canRegisterStaff(customer) ? [{ to: '/akun/pengajuan', label: 'Daftar Staff', icon: UserPlus }] : []),
    ...(customer?.staff_id
      ? [{ to: '/akun/pengajuan/staff/status', label: 'Status Pengajuan Staff', icon: FileText }]
      : []),
  ];

  return (
    <div data-testid="baraya-profile">
      <BarayaTopBar title="Profil" testId="brz-profile-topbar" />

      <div className="brz-page">
        {/* ------------------------------------------------ identity card */}
        <div className="brz-card brz-card--pad flex items-center gap-3.5" data-testid="brz-profile-card">
          {photo ? (
            <img src={photo} alt="" className="brz-avatar" style={{ width: 62, height: 62 }} />
          ) : (
            <span
              className="brz-avatar text-[20px] font-bold"
              style={{ width: 62, height: 62, color: 'var(--brz-accent)' }}
            >
              {(customer?.full_name || 'B').slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="brz-clamp-1 block text-[16px] font-semibold">{customer?.full_name || 'Member'}</span>
            <span className="brz-clamp-1 brz-meta block">{customer?.email}</span>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="brz-badge brz-badge--accent">{roleLabel(customer)}</span>
              {customer?.member_number ? <span className="brz-badge">#{customer.member_number}</span> : null}
            </span>
          </span>
        </div>

        {/* ---------------------------------------------------------- tabs */}
        <div className="mt-4 flex gap-2" role="tablist" aria-label="Profil">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'profile'}
            className={`brz-chip flex-1 justify-center${tab === 'profile' ? ' brz-chip--active' : ''}`}
            onClick={() => setTab('profile')}
            data-testid="brz-profile-tab-profile"
          >
            Akun
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'notifications'}
            className={`brz-chip flex-1 justify-center${tab === 'notifications' ? ' brz-chip--active' : ''}`}
            onClick={() => setTab('notifications')}
            data-testid="brz-profile-tab-notifications"
          >
            Notifikasi{unread > 0 ? ` (${unread})` : ''}
          </button>
        </div>

        {tab === 'profile' ? (
          <>
            <BrzSection title="Menu" testId="brz-profile-menu">
              <div className="flex flex-col gap-2">
                {menu.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={`${to}-${label}`}
                    to={to}
                    className="brz-card brz-card--pad flex items-center gap-3"
                    data-testid={`brz-profile-menu-${label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <span className="brz-icon-btn" style={{ width: 36, height: 36, color: 'var(--brz-accent)' }}>
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-[14px] font-medium">{label}</span>
                    <ChevronRight size={17} style={{ color: 'var(--brz-text-dim)' }} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </BrzSection>

            <BrzSection title="Informasi Akun" testId="brz-profile-info">
              <div className="flex flex-col gap-2">
                {[
                  { icon: Mail, label: 'Email', value: customer?.email },
                  { icon: Phone, label: 'Telepon', value: customer?.phone },
                  {
                    icon: BadgeCheck,
                    label: 'Verifikasi',
                    value: customer?.email_verified ? 'Email terverifikasi' : 'Belum terverifikasi',
                  },
                  { icon: FileText, label: 'Bergabung', value: formatDate(customer?.joined_at || customer?.created_at) },
                ]
                  .filter((row) => row.value)
                  .map(({ icon: Icon, label, value }) => (
                    <div key={label} className="brz-tile flex items-center gap-3 p-3">
                      <Icon size={15} style={{ color: 'var(--brz-text-dim)' }} aria-hidden="true" />
                      <span className="brz-meta w-[86px] flex-none">{label}</span>
                      <span className="brz-clamp-1 flex-1 text-[13px] font-medium">{value}</span>
                    </div>
                  ))}
              </div>
            </BrzSection>

            <button
              type="button"
              className="brz-btn brz-btn--ghost brz-btn--block mt-5"
              onClick={onLogout}
              data-testid="brz-profile-logout"
              style={{ color: 'var(--brz-live)' }}
            >
              <LogOut size={16} aria-hidden="true" />
              Keluar
            </button>
          </>
        ) : (
          <div className="mt-4">
            {unread > 0 ? (
              <button
                type="button"
                className="brz-viewall mb-3"
                onClick={markAllRead}
                data-testid="brz-profile-mark-all"
              >
                Tandai semua sudah dibaca
              </button>
            ) : null}

            {loadingNotifications ? (
              <BrzLoading rows={3} height={68} testId="brz-notifications-loading" />
            ) : notifications.length === 0 ? (
              <BrzEmpty
                icon={Bell}
                title="Belum ada notifikasi"
                description="Pemberitahuan dari klub akan muncul di sini."
                testId="brz-notifications-empty"
              />
            ) : (
              <ul className="flex flex-col gap-2" data-testid="brz-notifications-list">
                {notifications.map((item) => {
                  const isRead = item.read ?? item.is_read ?? false;
                  return (
                    <li
                      key={item.id}
                      className="brz-card brz-card--pad flex items-start gap-3"
                      style={isRead ? undefined : { borderColor: 'var(--brz-accent)' }}
                    >
                      <span className="brz-icon-btn" style={{ width: 34, height: 34, color: 'var(--brz-accent)' }}>
                        <Bell size={15} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="brz-clamp-2 block text-[13.5px] font-semibold">
                          {item.title || 'Notifikasi'}
                        </span>
                        {item.message || item.body ? (
                          <span className="brz-body brz-clamp-3 mt-1 block text-[12.5px]">
                            {item.message || item.body}
                          </span>
                        ) : null}
                        {formatDate(item.created_at) ? (
                          <span className="brz-meta mt-1 block" style={{ color: 'var(--brz-text-dim)' }}>
                            {formatDate(item.created_at)}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
