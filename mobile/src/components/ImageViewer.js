import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii } from '../theme';
import Txt from './Txt';
import { RemoteImage } from './RemoteImage';
import { savePhotoToDevice, sharePhotoFile } from '../lib/photoActions';

/**
 * Full-screen native image viewer: horizontal paging, double-tap zoom and
 * drag-to-pan while zoomed. Built with the RN Animated API so it needs no
 * extra native module.
 */
function ZoomableImage({ uri, width, height }) {
  const [scale] = useState(() => new Animated.Value(1));
  const [translate] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [zoomState] = useState(() => ({ zoomed: false, lastTap: 0 }));

  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        zoomState.zoomed && (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4),
      onPanResponderMove: (_evt, gesture) => {
        if (!zoomState.zoomed) return;
        translate.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_evt, gesture) => {
        const resetZoom = () => {
          zoomState.zoomed = false;
          Animated.parallel([
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8 }),
            Animated.spring(translate, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 8 }),
          ]).start();
        };
        if (!zoomState.zoomed) {
          const now = Date.now();
          if (now - zoomState.lastTap < 280) {
            zoomState.zoomed = true;
            Animated.spring(scale, { toValue: 2.2, useNativeDriver: true, friction: 7 }).start();
          }
          zoomState.lastTap = now;
          return;
        }
        if (Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6) {
          resetZoom();
          return;
        }
        translate.extractOffset();
      },
    })
  );

  return (
    <View style={[styles.page, { width, height }]} {...panResponder.panHandlers}>
      <Animated.View
        style={{ transform: [{ scale }, { translateX: translate.x }, { translateY: translate.y }] }}
      >
        <RemoteImage uri={uri} style={{ width, height: height * 0.86 }} contentFit="contain" transition={180} />
      </Animated.View>
    </View>
  );
}

function ViewerModal({ items, startIndex, onClose, albumTitle, actions }) {
  const [current, setCurrent] = useState(startIndex);
  const [busy, setBusy] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const { width, height } = Dimensions.get('window');

  const run = async (kind) => {
    const item = items[current];
    if (!item || busy) return;
    setBusy(kind);
    setFeedback(null);
    const meta = { albumTitle, index: current };
    const result = kind === 'save' ? await savePhotoToDevice(item, meta) : await sharePhotoFile(item, meta);
    setBusy(null);
    setFeedback({ ok: result.ok, message: result.message });
    if (!result.ok) Alert.alert(kind === 'save' ? 'Gagal menyimpan foto' : 'Gagal membagikan foto', result.message);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Txt variant="smallStrong" tone="muted">
              {current + 1} / {items.length}
            </Txt>
            <Pressable onPress={onClose} hitSlop={14} style={styles.closeButton} testID="image-viewer-close">
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          <FlatList
            data={items}
            keyExtractor={(item, itemIndex) => String(item.id || itemIndex)}
            horizontal
            pagingEnabled
            initialScrollIndex={startIndex}
            getItemLayout={(_data, itemIndex) => ({
              length: width,
              offset: width * itemIndex,
              index: itemIndex,
            })}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) =>
              setCurrent(Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width)))
            }
            renderItem={({ item }) => (
              <ZoomableImage uri={item.url || item.thumbnail_url} width={width} height={height * 0.82} />
            )}
          />
          {items[current]?.caption || items[current]?.file_name ? (
            <View style={styles.caption}>
              <Txt variant="small" tone="muted" numberOfLines={2}>
                {items[current]?.caption || items[current]?.file_name}
              </Txt>
            </View>
          ) : null}
          {actions ? (
            <View style={styles.actions} testID="image-viewer-actions">
              <Pressable
                onPress={() => run('save')}
                disabled={!!busy}
                style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
                testID="image-viewer-save"
              >
                {busy === 'save' ? (
                  <ActivityIndicator color={colors.onAccent} size="small" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={16} color={colors.onAccent} />
                    <Txt variant="smallStrong" tone="onAccent">
                      Simpan Foto
                    </Txt>
                  </>
                )}
              </Pressable>
              <Pressable
                onPress={() => run('share')}
                disabled={!!busy}
                style={({ pressed }) => [styles.action, styles.actionGhost, pressed ? styles.actionPressed : null]}
                testID="image-viewer-share"
              >
                {busy === 'share' ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <>
                    <Ionicons name="share-social-outline" size={16} color={colors.text} />
                    <Txt variant="smallStrong">Bagikan</Txt>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}
          {feedback ? (
            <View style={styles.feedback}>
              <Txt variant="meta" tone={feedback.ok ? 'accent' : 'lose'} testID="image-viewer-feedback">
                {feedback.message}
              </Txt>
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export function ImageViewer({ items = [], index = -1, onClose, albumTitle, actions = false }) {
  if (index < 0 || !items.length) return null;
  return (
    <ViewerModal
      key={`viewer-${index}`}
      items={items}
      startIndex={index}
      onClose={onClose}
      albumTitle={albumTitle}
      actions={actions}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(2,5,15,0.97)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  page: { alignItems: 'center', justifyContent: 'center' },
  caption: { paddingHorizontal: 20, paddingBottom: 14, alignItems: 'center' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minWidth: 140,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  actionGhost: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  actionPressed: { opacity: 0.85 },
  feedback: { alignItems: 'center', paddingBottom: 12, paddingHorizontal: 20 },
});

export default ImageViewer;
