import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, gutter } from '../theme';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import { Card } from '../components/Card';
import { LEGAL_DOCS, LEGAL_UPDATED_AT, TERMS } from '../lib/legal';

/** Syarat & Ketentuan / Kebijakan Privasi — dibaca di dalam aplikasi (offline). */
export default function LegalScreen({ route, navigation }) {
  const doc = LEGAL_DOCS[route?.params?.doc] || TERMS;

  return (
    <Screen testID={`legal-screen-${doc.key}`} contentStyle={styles.content}>
      <TopBar title={doc.title} onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <Txt variant="h1">{doc.heading}</Txt>
        <Txt variant="meta" tone="muted" style={styles.updated}>
          Terakhir diperbarui: {LEGAL_UPDATED_AT}
        </Txt>
        <Txt variant="small" tone="muted" style={styles.intro}>
          {doc.intro}
        </Txt>

        {doc.sections.map((section) => (
          <Card key={section.title} style={styles.card}>
            <Txt variant="title">{section.title}</Txt>
            {section.body.map((paragraph) => (
              <Txt key={paragraph} variant="small" tone="muted" style={styles.paragraph}>
                {paragraph}
              </Txt>
            ))}
            {(section.bullets || []).map((bullet) => (
              <View key={bullet} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Txt variant="small" tone="muted" style={styles.flex}>
                  {bullet}
                </Txt>
              </View>
            ))}
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 48 },
  body: { paddingHorizontal: gutter, paddingTop: 6 },
  updated: { marginTop: 8 },
  intro: { marginTop: 10, marginBottom: 6 },
  card: { marginTop: 12 },
  paragraph: { marginTop: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 7,
  },
});
