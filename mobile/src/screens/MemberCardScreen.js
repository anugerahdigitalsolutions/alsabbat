import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';

import { colors, radii, shadow } from '../theme';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import { Badge, Card, Divider } from '../components/Card';
import { Avatar } from '../components/Crest';
import { EmptyState, ErrorState, Loading } from '../components/States';
import { useResource } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';
import { WEB_URL, resolveMediaUrl } from '../api/client';
import { formatDateMedium } from '../lib/format';

const LOGO = require('../../assets/logo.png');

const ROLE_LABELS = { MEMBER: 'Member', PEMAIN: 'Pemain', STAFF: 'Staf' };

/**
 * Isi QR = URL verifikasi RESMI existing `‹web›/member/verifikasi/{member_code}`
 * yang dilayani `GET /api/member/verify/{member_code}`.
 * QR TIDAK pernah memuat password, OTP, access token, JWT, atau data pribadi
 * berlebihan — hanya kode member yang memang identifier publik terverifikasi.
 */
const qrValue = (memberCode) =>
  memberCode ? (WEB_URL ? `${WEB_URL}/member/verifikasi/${encodeURIComponent(memberCode)}` : memberCode) : null;

/** Digital member card — `/api/baraya/member-card` (existing endpoint). */
export default function MemberCardScreen({ navigation }) {
  const { isAuthenticated } = useAuth();
  const { clubName, clubLogo, siteContent } = useClub();
  // Latar kartu memakai SUMBER YANG SAMA dengan website: site content
  // `member.card.background_url` (dikelola admin), tanpa asset baru.
  const cardBackground = resolveMediaUrl(siteContent?.['member.card.background_url'] || null);
  const card = useResource(() => endpoints.getMemberCard(), [], {
    enabled: isAuthenticated,
    fallbackMessage: 'Kartu member belum tersedia.',
  });

  const data = card.data;
  const roles = data?.roles?.length ? data.roles : data?.role ? [data.role] : [];

  return (
    <Screen
      testID="member-card-screen"
      header={<TopBar title="Kartu Member" onBack={() => navigation.goBack()} />}
      onRefresh={isAuthenticated ? card.refresh : undefined}
      refreshing={card.refreshing}
      bottomInset={40}
    >
      {!isAuthenticated ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Masuk untuk melihat kartu"
          description="Kartu member digital tersedia setelah Anda masuk dengan akun AL SABBAT."
        />
      ) : card.loading ? (
        <Loading rows={1} height={210} />
      ) : card.error || !data ? (
        <ErrorState message={card.error || 'Kartu member belum tersedia.'} onRetry={card.reload} />
      ) : (
        <>
          <View style={[styles.card, shadow.card]}>
            {cardBackground ? (
              <>
                <Image
                  source={{ uri: cardBackground }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  testID="member-card-background"
                />
                {/* Overlay identik website: navy 90% → navy 62% (46%) → hitam 68% */}
                <LinearGradient
                  colors={['rgba(1,40,145,0.90)', 'rgba(1,40,145,0.62)', 'rgba(0,0,0,0.68)']}
                  locations={[0, 0.46, 1]}
                  start={{ x: 0, y: 0.12 }}
                  end={{ x: 1, y: 0.88 }}
                  style={StyleSheet.absoluteFill}
                />
              </>
            ) : (
              <>
                <LinearGradient
                  colors={[colors.navy, colors.navyDeep, '#000814']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {/* Pola garis lapangan + kilau emas seperti kartu member website */}
                <View style={styles.pitchLines} pointerEvents="none">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <View key={`line-${index}`} style={styles.pitchLine} />
                  ))}
                </View>
                <LinearGradient
                  colors={['rgba(252,207,43,0.28)', 'transparent']}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0.25, y: 0.7 }}
                  style={StyleSheet.absoluteFill}
                />
              </>
            )}
            <View style={styles.cardInner}>
            <View style={styles.cardTop}>
              <Image
                source={clubLogo ? { uri: clubLogo } : LOGO}
                style={styles.cardLogo}
                contentFit="contain"
              />
              <View style={styles.flex}>
                <Txt variant="label" tone="accent">
                  KARTU MEMBER RESMI
                </Txt>
                <Txt variant="smallStrong" numberOfLines={1}>
                  {clubName}
                </Txt>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Avatar name={data.full_name} photo={resolveMediaUrl(data.photo_url)} size={58} />
              <View style={styles.flex}>
                <Txt variant="h3" numberOfLines={1}>
                  {data.full_name}
                </Txt>
                <Txt variant="meta" tone="muted">
                  {roles.map((role) => ROLE_LABELS[role] || role).join(' · ') || 'Member'}
                </Txt>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View>
                <Txt variant="label" tone="dim">
                  NOMOR MEMBER
                </Txt>
                <Txt variant="h3" tone="accent">
                  {data.member_number ? `#${data.member_number}` : '-'}
                </Txt>
              </View>
              <Badge label={data.status || 'ACTIVE'} tone={data.status === 'ACTIVE' ? 'win' : 'default'} />
            </View>
            </View>
          </View>

          {qrValue(data.member_code) ? (
            <View style={styles.qrCard} testID="member-card-qr">
              <View style={styles.qrFrame}>
                <QRCode
                  value={qrValue(data.member_code)}
                  size={168}
                  color={colors.navyDeep}
                  backgroundColor="#FFFFFF"
                  quietZone={8}
                />
              </View>
              <Txt variant="label" tone="accent" style={styles.qrLabel}>
                QR VERIFIKASI MEMBER
              </Txt>
              <Txt variant="small" tone="muted" style={styles.qrHint}>
                Tunjukkan QR ini kepada pengurus klub saat masuk pertandingan. Pengurus memindai lewat menu
                Verifikasi Member; hasilnya dibaca langsung dari data klub.
              </Txt>
              <Txt variant="meta" tone="dim" style={styles.qrCode} numberOfLines={1}>
                {data.member_code}
              </Txt>
            </View>
          ) : null}

          <Card style={styles.detail}>
            {[
              { label: 'Kode member', value: data.member_code },
              { label: 'Nama', value: data.full_name },
              {
                label: 'Peran',
                value: roles.map((role) => ROLE_LABELS[role] || role).join(', ') || 'Member',
              },
              { label: 'Bergabung', value: formatDateMedium(data.joined_at) },
              { label: 'Status', value: data.status },
            ]
              .filter((row) => row.value)
              .map((row, index, rows) => (
                <View key={row.label}>
                  <View style={styles.infoRow}>
                    <Txt variant="meta" tone="muted">
                      {row.label}
                    </Txt>
                    <Txt variant="smallStrong" style={styles.infoValue} numberOfLines={2}>
                      {String(row.value)}
                    </Txt>
                  </View>
                  {index < rows.length - 1 ? <Divider style={styles.divider} /> : null}
                </View>
              ))}
          </Card>

          <Txt variant="small" tone="dim" style={styles.note}>
            Kartu ini adalah identitas digital keanggotaan Anda. Tunjukkan nomor member kepada pengurus klub
            saat diperlukan.
          </Txt>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(252,207,43,0.28)',
    // Latar solid di bawah gradient: outline shadow Android mengikuti sudut
    // membulat seperti iOS (tanpa ini Android menggambar kotak).
    backgroundColor: colors.navyDeep,
    overflow: 'hidden',
    padding: 18,
    marginTop: 10,
  },
  cardInner: { gap: 18 },
  pitchLines: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  pitchLine: { width: 1, height: '100%', backgroundColor: 'rgba(254,254,254,0.07)' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardLogo: { width: 46, height: 46 },
  cardBody: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  detail: { marginTop: 18 },
  qrCard: {
    marginTop: 18,
    alignItems: 'center',
    padding: 18,
    borderRadius: radii.card,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: 'rgba(252,207,43,0.28)',
  },
  qrFrame: { padding: 10, borderRadius: radii.md, backgroundColor: '#FFFFFF' },
  qrLabel: { marginTop: 12, letterSpacing: 1.2 },
  qrHint: { marginTop: 6, textAlign: 'center' },
  qrCode: { marginTop: 8, letterSpacing: 1.4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  infoValue: { flex: 1, textAlign: 'right' },
  divider: { marginVertical: 10 },
  note: { marginTop: 14 },
});
