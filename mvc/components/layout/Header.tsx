// mvc/components/layout/Header.tsx
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useBreakpoints } from '../../hooks/useBreakpoints';

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
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = useMemo(() => createStyles(isMobile, screenWidth), [isMobile, screenWidth]);

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showMenu && (
          <TouchableOpacity
            onPress={onMenuPress}
            style={styles.menuButton}
            accessibilityLabel="Open menu"
          >
            <Feather name="menu" size={20} color="#0F172A" />
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
          <Feather name="bell" size={19} color="#64748B" />
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

const createStyles = (isMobile: boolean, screenWidth: number) => {
  const isExtraSmall = screenWidth < 360;
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: isMobile ? 16 : 24,
      paddingVertical: isMobile ? 12 : 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, zIndex: 100 } : {}),
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuButton: {
      marginRight: 12,
      padding: 4,
    },
    title: {
      fontSize: isExtraSmall ? 16 : isMobile ? 18 : 20,
      fontWeight: '600',
      color: '#0F172A',
      letterSpacing: 0,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    notifButton: {
      padding: 8,
      position: 'relative',
    },
    notifBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: '#EF4444',
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    notifBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
};
