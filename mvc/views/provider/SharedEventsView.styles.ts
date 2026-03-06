import { StyleSheet, Platform } from 'react-native';
import { semantic } from '../../theme';
import { getShadowStyle } from '../../utils/shadowStyles';

export const createStyles = (isMobile: boolean, _screenWidth: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Platform.OS === 'web' ? '#F0F2F5' : semantic.background,
      ...(Platform.OS === 'web'
        ? { justifyContent: 'center', alignItems: 'center', paddingTop: 30, paddingBottom: 20 }
        : { paddingTop: 20 }),
    },
    contentWrapper: {
      width: '100%',
      maxWidth: Platform.OS === 'web' ? 900 : undefined,
      flex: 1,
    },
    header: {
      paddingHorizontal: isMobile ? 16 : 24,
      paddingBottom: 16,
    },
    title: {
      fontSize: isMobile ? 22 : 26,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginTop: 4,
    },
    card: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: 16,
      marginHorizontal: isMobile ? 16 : 24,
      marginBottom: 12,
      ...getShadowStyle(0.08, 3, 1),
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    eventName: {
      fontSize: 16,
      fontWeight: '600',
      color: semantic.textPrimary,
      flex: 1,
    },
    roleBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    roleBadgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    infoText: {
      fontSize: 14,
      color: semantic.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 16,
      color: semantic.textSecondary,
      marginTop: 12,
    },
    emptyHint: {
      fontSize: 14,
      color: semantic.textMuted,
      marginTop: 4,
    },
    loadingContainer: {
      padding: 24,
    },
  });
