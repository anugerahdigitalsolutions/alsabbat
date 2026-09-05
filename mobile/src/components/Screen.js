import React from 'react';
import { RefreshControl, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, gradients, gutter } from '../theme';

/**
 * Screen shell — club gradient background, safe-area aware, native scrolling
 * with pull-to-refresh. Horizontal padding is fixed so nothing can overflow
 * sideways on 320–430px phones.
 */
export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
  contentStyle,
  style,
  edges = ['top'],
  testID,
  header,
  bottomInset = 96,
}) {
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surfaceSolid}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentStyle]}>{children}</View>
  );

  return (
    <View style={[styles.flex, style]} testID={testID}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={gradients.screen} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.flex} edges={edges}>
        {header}
        {body}
      </SafeAreaView>
    </View>
  );
}

export const screenStyles = StyleSheet.create({
  gutter: { paddingHorizontal: gutter },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingTop: 8 },
});

export default Screen;
