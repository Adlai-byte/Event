// mvc/components/ui/Skeleton.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius } from '../../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius: radius = borderRadius.md,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius: radius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Pre-composed skeleton for a card with title + 2 lines of text */
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <Skeleton width="60%" height={20} />
      <View style={styles.cardSpacer} />
      <Skeleton width="100%" height={14} />
      <View style={styles.cardSpacerSm} />
      <Skeleton width="80%" height={14} />
    </View>
  );
}

/** Pre-composed skeleton for a list item with avatar + text */
export function SkeletonListItem({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.listItem, style]}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={styles.listItemText}>
        <Skeleton width="50%" height={16} />
        <View style={styles.cardSpacerSm} />
        <Skeleton width="70%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.neutral[200],
  },
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: 16,
    marginBottom: 12,
  },
  cardSpacer: {
    height: 12,
  },
  cardSpacerSm: {
    height: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listItemText: {
    flex: 1,
    marginLeft: 12,
  },
});
