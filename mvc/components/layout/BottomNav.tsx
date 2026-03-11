// mvc/components/layout/BottomNav.tsx
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useBreakpoints } from '../../hooks/useBreakpoints';

interface BottomNavItem {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

interface BottomNavProps {
  items: BottomNavItem[];
  activeRoute: string;
  unreadMessages?: number;
  onNavigate: (route: string) => void;
}

export function BottomNav({ items, activeRoute, unreadMessages = 0, onNavigate }: BottomNavProps) {
  const { screenWidth } = useBreakpoints();
  const styles = useMemo(() => createStyles(screenWidth), [screenWidth]);

  return (
    <View style={styles.container}>
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
              <Feather
                name={item.icon}
                size={20}
                color={isActive ? '#2563EB' : '#94A3B8'}
              />
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadMessages > 9 ? '9+' : unreadMessages}</Text>
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

const createStyles = (screenWidth: number) => {
  const isExtraSmall = screenWidth < 360;
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
      paddingBottom: 4,
      paddingTop: 6,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
    },
    iconContainer: {
      position: 'relative',
      marginBottom: 2,
    },
    label: {
      fontSize: isExtraSmall ? 9 : 10,
      color: '#94A3B8',
      fontWeight: '500',
    },
    labelActive: {
      color: '#2563EB',
      fontWeight: '600',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -8,
      backgroundColor: '#EF4444',
      borderRadius: 8,
      minWidth: isExtraSmall ? 14 : 16,
      height: isExtraSmall ? 14 : 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    badgeText: {
      fontSize: isExtraSmall ? 7 : 9,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
};
