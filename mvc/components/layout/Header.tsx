// mvc/components/layout/Header.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, semantic, typography, spacing, shadow } from '../../theme';

interface HeaderProps {
  title: string;
  notificationCount?: number;
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
  showMenu?: boolean;
}

export function Header({
  title,
  notificationCount = 0,
  onMenuPress,
  onNotificationPress,
  showMenu = false,
}: HeaderProps) {
  return (
    <View style={[styles.container, shadow('sm')]}>
      <View style={styles.left}>
        {showMenu && (
          <TouchableOpacity
            onPress={onMenuPress}
            style={styles.menuButton}
            accessibilityLabel="Open menu"
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.right}>
        <TouchableOpacity
          onPress={onNotificationPress}
          style={styles.notifButton}
          accessibilityLabel={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
        >
          <Text style={styles.notifIcon}>🔔</Text>
          {notificationCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[0],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, zIndex: 100 } : {}),
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  menuIcon: {
    fontSize: 22,
    color: colors.neutral[800],
  },
  title: {
    ...typography.h2,
    color: colors.neutral[800],
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifButton: {
    padding: spacing.sm,
    position: 'relative',
  },
  notifIcon: {
    fontSize: 20,
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.error[500],
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral[0],
  },
});
