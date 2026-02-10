// mvc/components/layout/BottomNav.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, semantic, typography, spacing, shadow } from '../../theme';

interface BottomNavItem {
  key: string;
  label: string;
  icon: string;
}

interface BottomNavProps {
  items: BottomNavItem[];
  activeRoute: string;
  unreadMessages?: number;
  onNavigate: (route: string) => void;
}

export function BottomNav({ items, activeRoute, unreadMessages = 0, onNavigate }: BottomNavProps) {
  return (
    <View style={[styles.container, shadow('md')]}>
      {items.map((item) => {
        const isActive = activeRoute === item.key;
        const showBadge = item.key === 'messages' && unreadMessages > 0;

        return (
          <TouchableOpacity
            key={item.key}
            style={styles.tab}
            onPress={() => onNavigate(item.key)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isActive }}
          >
            <View style={styles.iconContainer}>
              <Text style={[styles.icon, isActive && styles.iconActive]}>{item.icon}</Text>
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[0],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingBottom: spacing.xs,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 2,
  },
  icon: {
    fontSize: 20,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  labelActive: {
    color: semantic.primary,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.error[500],
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.neutral[0],
  },
});
