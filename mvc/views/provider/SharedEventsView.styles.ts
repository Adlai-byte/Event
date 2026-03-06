import { StyleSheet, Platform } from 'react-native';

export const createStyles = (isMobile: boolean, _screenWidth: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
      paddingTop: isMobile ? 16 : 24,
      paddingBottom: 20,
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      padding: 16,
      marginHorizontal: isMobile ? 16 : 24,
      marginBottom: 12,
      ...(Platform.OS === 'web' ? { boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)' } : {}),
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
      color: '#0F172A',
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
      color: '#64748B',
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 80,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#64748B',
      marginTop: 16,
    },
    emptyHint: {
      fontSize: 14,
      color: '#94A3B8',
      marginTop: 6,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    loadingContainer: {
      padding: 24,
    },
  });
