import { StyleSheet } from 'react-native';
import { colors, semantic } from '../../theme';

export const createStyles = (isMobile: boolean, screenWidth: number) => {
  const _isExtraSmall = screenWidth < 360;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: semantic.background,
    },
    content: {
      padding: isMobile ? 12 : 20,
    },
    card: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: isMobile ? 12 : 16,
      elevation: 2,
    },
    header: {
      flexDirection: isMobile ? ('column' as const) : ('row' as const),
      justifyContent: 'space-between',
      alignItems: isMobile ? ('flex-start' as const) : ('center' as const),
      marginBottom: 16,
      gap: isMobile ? 12 : 0,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    tabButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      backgroundColor: semantic.background,
    },
    tabButtonActive: {
      backgroundColor: semantic.primary,
    },
    tabButtonText: {
      fontSize: 14,
      color: semantic.textSecondary,
      fontWeight: '600',
    },
    tabButtonTextActive: {
      color: semantic.surface,
    },
    searchContainer: {
      marginBottom: 16,
    },
    searchInput: {
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: semantic.background,
      marginBottom: 12,
    },
    categoryFilter: {
      marginBottom: 12,
    },
    categoryChip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: semantic.background,
      marginRight: 8,
    },
    categoryChipActive: {
      backgroundColor: semantic.primary,
    },
    categoryChipText: {
      fontSize: 12,
      color: semantic.textSecondary,
      fontWeight: '600',
    },
    categoryChipTextActive: {
      color: semantic.surface,
    },
    serviceCard: {
      backgroundColor: semantic.surface,
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    serviceCardAlt: {
      backgroundColor: semantic.background,
    },
    serviceInfo: {
      flex: 1,
    },
    serviceHeader: {
      flexDirection: isMobile ? ('column' as const) : ('row' as const),
      justifyContent: 'space-between',
      alignItems: isMobile ? ('flex-start' as const) : ('flex-start' as const),
      marginBottom: 8,
      gap: isMobile ? 8 : 0,
    },
    serviceName: {
      fontSize: 16,
      fontWeight: '700',
      color: semantic.textPrimary,
      flex: 1,
    },
    serviceProvider: {
      fontSize: 12,
      color: semantic.textSecondary,
      marginTop: 4,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    statusActive: {
      backgroundColor: colors.success[50],
    },
    statusInactive: {
      backgroundColor: colors.error[50],
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    serviceDescription: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginBottom: 8,
    },
    serviceMeta: {
      flexDirection: isMobile ? ('column' as const) : ('row' as const),
      alignItems: isMobile ? ('flex-start' as const) : ('center' as const),
      gap: isMobile ? 6 : 12,
    },
    serviceCategory: {
      fontSize: 12,
      color: semantic.textSecondary,
      textTransform: 'capitalize',
    },
    servicePrice: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
    },
    perPersonLabel: {
      fontSize: 11,
      color: semantic.textSecondary,
      fontWeight: '400',
    },
    serviceRating: {
      fontSize: 12,
      color: semantic.textSecondary,
    },
    serviceActions: {
      flexDirection: isMobile ? ('column' as const) : ('row' as const),
      gap: 8,
      marginTop: 12,
      justifyContent: 'center' as const,
    },
    actionButton: {
      paddingVertical: isMobile ? 10 : 8,
      paddingHorizontal: isMobile ? 16 : 12,
      borderRadius: 6,
      minWidth: isMobile ? undefined : 80,
    },
    activateButton: {
      backgroundColor: colors.success[600],
    },
    deactivateButton: {
      backgroundColor: colors.error[600],
    },
    actionButtonText: {
      color: semantic.surface,
      fontWeight: '700',
      fontSize: 12,
      textAlign: 'center' as const,
    },
    editButton: {
      paddingVertical: isMobile ? 10 : 8,
      paddingHorizontal: isMobile ? 16 : 12,
      borderRadius: 6,
      backgroundColor: semantic.primary,
      minWidth: isMobile ? undefined : 80,
    },
    editButtonText: {
      color: semantic.surface,
      fontWeight: '700',
      fontSize: 12,
      textAlign: 'center' as const,
    },
    emptyState: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyStateText: {
      color: semantic.textSecondary,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    emptyStateSubtext: {
      color: semantic.textMuted,
      fontSize: 14,
    },
    addForm: {
      marginTop: 16,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginTop: 12,
      marginBottom: 6,
    },
    addInputFull: {
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 6,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: semantic.background,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 8,
      marginBottom: 12,
    },
    categoryOption: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: semantic.background,
      marginRight: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    categoryOptionSelected: {
      backgroundColor: semantic.primary,
      borderColor: semantic.primary,
    },
    categoryOptionText: {
      fontSize: 13,
      color: semantic.textPrimary,
      fontWeight: '600',
    },
    categoryOptionTextSelected: {
      color: semantic.surface,
    },
    pricingTypeContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
      marginBottom: 12,
    },
    pricingTypeOption: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: semantic.background,
      borderWidth: 1,
      borderColor: semantic.border,
      alignItems: 'center',
    },
    pricingTypeOptionSelected: {
      backgroundColor: semantic.primary,
      borderColor: semantic.primary,
    },
    pricingTypeText: {
      fontSize: 14,
      color: semantic.textPrimary,
      fontWeight: '600',
    },
    pricingTypeTextSelected: {
      color: semantic.surface,
    },
    addButtonLarge: {
      backgroundColor: semantic.primary,
      paddingVertical: 15,
      paddingHorizontal: 32,
      borderRadius: 8,
      marginTop: 24,
      alignItems: 'center',
      alignSelf: 'flex-start',
    },
    addButtonDisabled: {
      backgroundColor: semantic.textMuted,
      opacity: 0.7,
    },
    addButtonText: {
      color: semantic.surface,
      fontWeight: '700',
      fontSize: 14,
    },
    mapContainer: {
      height: isMobile ? Math.min(250, screenWidth * 0.65) : 300,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: semantic.border,
      marginTop: 8,
      marginBottom: 8,
    },
    map: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    mapHint: {
      fontSize: 12,
      color: semantic.textSecondary,
      marginBottom: 8,
      fontStyle: 'italic',
    },
    addressText: {
      fontSize: 13,
      color: semantic.textPrimary,
      backgroundColor: semantic.background,
      padding: 10,
      borderRadius: 6,
      marginTop: 8,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    addressPlaceholder: {
      fontSize: 12,
      color: semantic.textMuted,
      fontStyle: 'italic',
      padding: 10,
      backgroundColor: semantic.background,
      borderRadius: 6,
      marginTop: 8,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: semantic.border,
      borderStyle: 'dashed',
    },
  });
};
