import { StyleSheet, Platform } from 'react-native';
import { colors, semantic } from '../../theme';
import { getShadowStyle } from '../../utils/shadowStyles';

export const createStyles = (isMobile: boolean, _screenWidth: number, _screenHeight: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Platform.OS === 'web' ? '#F0F2F5' : semantic.background,
      ...(Platform.OS === 'web'
        ? { justifyContent: 'center', alignItems: 'center', paddingTop: 30, paddingBottom: 20 }
        : { paddingTop: 20 }),
    },
    filterContainer: {
      backgroundColor: semantic.surface,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
      paddingVertical: Platform.OS === 'web' ? 16 : 12,
      ...(Platform.OS === 'web' ? { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' } : {}),
    },
    filterScrollContent: {
      paddingHorizontal: Platform.OS === 'web' ? 32 : 16,
      gap: Platform.OS === 'web' ? 12 : 8,
    },
    filterButton: {
      paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
      paddingVertical: Platform.OS === 'web' ? 10 : 8,
      borderRadius: Platform.OS === 'web' ? 12 : 20,
      backgroundColor: semantic.background,
      marginRight: Platform.OS === 'web' ? 12 : 8,
      borderWidth: 2,
      borderColor: semantic.border,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
    },
    filterButtonActive: {
      backgroundColor: colors.primary[500],
      borderColor: colors.primary[500],
    },
    filterButtonText: {
      fontSize: Platform.OS === 'web' ? 15 : 14,
      fontWeight: '600',
      color: semantic.textSecondary,
    },
    filterButtonActiveText: {
      color: colors.neutral[0],
    },
    listContent: {
      padding: isMobile ? 16 : 24,
      paddingBottom: 80,
      ...(Platform.OS === 'web' && !isMobile
        ? { maxWidth: 900, width: '100%', alignSelf: 'center' as const }
        : {}),
    },
    eventCard: {
      backgroundColor: semantic.surface,
      borderRadius: 14,
      padding: isMobile ? 16 : 20,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: semantic.border,
      ...getShadowStyle(0.06, 4, 2),
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: isMobile ? 17 : 18,
      fontWeight: '700',
      color: semantic.textPrimary,
      flex: 1,
      marginRight: 12,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
      gap: 8,
    },
    cardLabel: {
      fontSize: 13,
      color: semantic.textSecondary,
    },
    cardValue: {
      fontSize: 14,
      fontWeight: '500',
      color: semantic.textPrimary,
    },
    budgetBar: {
      height: 6,
      backgroundColor: colors.neutral[200],
      borderRadius: 3,
      marginTop: 10,
      overflow: 'hidden',
    },
    budgetBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 12,
      gap: 8,
    },
    deleteButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.error[50],
    },
    fabButton: {
      position: 'absolute',
      bottom: isMobile ? 80 : 24,
      right: 24,
      backgroundColor: colors.primary[500],
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      ...getShadowStyle(0.2, 8, 4),
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
    },
    fabButtonText: {
      color: colors.neutral[0],
      fontSize: 15,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 24,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
  });
