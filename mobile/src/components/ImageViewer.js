import React, { useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme';
import Txt from './Txt';

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
        <Image source={{ uri }} style={{ width, height: height * 0.86 }} contentFit="contain" transition={180} />
      </Animated.View>
    </View>
  );
}

function ViewerModal({ items, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);
  const { width, height } = Dimensions.get('window');

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
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export function ImageViewer({ items = [], index = -1, onClose }) {
  if (index < 0 || !items.length) return null;
  return <ViewerModal key={`viewer-${index}`} items={items} startIndex={index} onClose={onClose} />;
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
});

export default ImageViewer;
