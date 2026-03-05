import { StyleSheet, Platform } from 'react-native';
import { colors, semantic } from '../../theme';
import { getShadowStyle } from '../../utils/shadowStyles';

export const createStyles = (isMobile: boolean, screenWidth: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Platform.OS === 'web' ? '#F0F2F5' : semantic.background,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isMobile ? 16 : 24,
      paddingVertical: 12,
      gap: 6,
    },
    backText: {
      fontSize: 15,
      color: colors.primary[500],
      fontWeight: '500',
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: semantic.surface,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
      paddingHorizontal: isMobile ? 8 : 16,
    },
    tab: {
      paddingHorizontal: isMobile ? 12 : 20,
      paddingVertical: 14,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: colors.primary[500],
    },
    tabText: {
      fontSize: isMobile ? 13 : 15,
      fontWeight: '600',
      color: semantic.textSecondary,
    },
    tabTextActive: {
      color: colors.primary[500],
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: isMobile ? 16 : 24,
      paddingBottom: 40,
      ...(Platform.OS === 'web' && !isMobile
        ? { maxWidth: 900, width: '100%', alignSelf: 'center' as const }
        : {}),
    },
    card: {
      backgroundColor: semantic.surface,
      borderRadius: 14,
      padding: isMobile ? 16 : 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: semantic.border,
      ...getShadowStyle(0.06, 4, 2),
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: 12,
    },
    eventName: {
      fontSize: isMobile ? 22 : 26,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: 8,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 10,
    },
    infoText: {
      fontSize: 15,
      color: semantic.textPrimary,
    },
    infoLabel: {
      fontSize: 13,
      color: semantic.textSecondary,
    },
    description: {
      fontSize: 14,
      color: semantic.textSecondary,
      lineHeight: 22,
      marginTop: 8,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginBottom: 12,
    },
    statusBadgeText: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    statsRow: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: 12,
      marginTop: 8,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.primary[50],
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.primary[500],
    },
    statLabel: {
      fontSize: 12,
      color: semantic.textSecondary,
      marginTop: 4,
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary[500],
      borderRadius: 10,
      paddingVertical: 12,
      gap: 8,
      marginTop: 16,
    },
    editButtonText: {
      color: colors.neutral[0],
      fontSize: 15,
      fontWeight: '600',
    },
    // Vendors tab
    vendorCard: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: semantic.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    vendorInfo: {
      flex: 1,
    },
    vendorName: {
      fontSize: 16,
      fontWeight: '600',
      color: semantic.textPrimary,
    },
    vendorCategory: {
      fontSize: 13,
      color: semantic.textSecondary,
      marginTop: 2,
    },
    vendorCost: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary[500],
      marginTop: 4,
    },
    unlinkButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.error[50],
    },
    linkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.primary[500],
      borderStyle: 'dashed',
      borderRadius: 12,
      paddingVertical: 16,
      gap: 8,
      marginBottom: 12,
    },
    linkButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary[500],
    },
    // Timeline tab
    timelineEntry: {
      flexDirection: 'row',
      marginBottom: 16,
      gap: 12,
    },
    timelineTime: {
      width: isMobile ? 70 : 90,
      alignItems: 'flex-end',
    },
    timelineTimeText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary[500],
    },
    timelineEndText: {
      fontSize: 12,
      color: semantic.textSecondary,
    },
    timelineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary[500],
      marginTop: 4,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      backgroundColor: colors.primary[200],
      alignSelf: 'center',
      marginTop: 4,
    },
    timelineContent: {
      flex: 1,
      backgroundColor: semantic.surface,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    timelineTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: semantic.textPrimary,
    },
    timelineDesc: {
      fontSize: 13,
      color: semantic.textSecondary,
      marginTop: 4,
    },
    timelineActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 8,
      gap: 8,
    },
    // Checklist tab
    progressBar: {
      height: 8,
      backgroundColor: colors.neutral[200],
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 16,
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.success[500],
      borderRadius: 4,
    },
    progressText: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 8,
    },
    checklistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
      gap: 12,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.neutral[300],
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.success[500],
      borderColor: colors.success[500],
    },
    checklistTitle: {
      flex: 1,
      fontSize: 15,
      color: semantic.textPrimary,
    },
    checklistTitleCompleted: {
      textDecorationLine: 'line-through',
      color: semantic.textSecondary,
    },
    dueDateBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: colors.neutral[100],
    },
    dueDateOverdue: {
      backgroundColor: colors.error[50],
    },
    dueDateText: {
      fontSize: 11,
      fontWeight: '500',
      color: semantic.textSecondary,
    },
    dueDateOverdueText: {
      color: colors.error[600],
    },
    categoryTag: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: colors.primary[50],
    },
    categoryTagText: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.primary[500],
    },
    addItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 8,
    },
    addItemInput: {
      flex: 1,
      backgroundColor: semantic.background,
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      color: semantic.textPrimary,
    },
    addItemButton: {
      backgroundColor: colors.primary[500],
      borderRadius: 8,
      padding: 10,
    },
    // Budget tab
    budgetSummaryCard: {
      backgroundColor: semantic.surface,
      borderRadius: 14,
      padding: isMobile ? 16 : 24,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: semantic.border,
      ...getShadowStyle(0.06, 4, 2),
    },
    budgetRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    budgetLabel: {
      fontSize: 15,
      color: semantic.textSecondary,
    },
    budgetValue: {
      fontSize: 16,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
    budgetRemaining: {
      fontSize: 16,
      fontWeight: '700',
    },
    budgetProgressBar: {
      height: 12,
      backgroundColor: colors.neutral[200],
      borderRadius: 6,
      overflow: 'hidden',
      marginVertical: 12,
    },
    budgetProgressFill: {
      height: '100%',
      borderRadius: 6,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '500',
      color: semantic.textPrimary,
      textTransform: 'capitalize',
      flex: 1,
    },
    categoryAmount: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
    },
    categoryBar: {
      height: 4,
      backgroundColor: colors.neutral[200],
      borderRadius: 2,
      flex: 1,
      marginHorizontal: 12,
      overflow: 'hidden',
    },
    categoryBarFill: {
      height: '100%',
      backgroundColor: colors.primary[500],
      borderRadius: 2,
    },
    // Shared action buttons
    iconButton: {
      padding: 6,
      borderRadius: 6,
    },
    // Link modal
    linkModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    linkModalContainer: {
      backgroundColor: semantic.surface,
      borderRadius: 16,
      width: isMobile ? '100%' : Math.min(500, screenWidth - 48),
      maxHeight: '70%',
      ...getShadowStyle(0.15, 8, 4),
    },
    linkModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    linkModalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
    linkModalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    linkModalItemName: {
      fontSize: 15,
      fontWeight: '500',
      color: semantic.textPrimary,
    },
    linkModalItemDate: {
      fontSize: 13,
      color: semantic.textSecondary,
    },
    linkModalEmpty: {
      padding: 32,
      alignItems: 'center',
    },
    linkModalEmptyText: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginTop: 8,
    },
    // Timeline form
    formRow: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 0 : 12,
      marginBottom: 8,
    },
    formField: {
      flex: 1,
    },
    formLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 4,
      marginTop: 8,
    },
    formInput: {
      backgroundColor: semantic.background,
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      color: semantic.textPrimary,
    },
    formButton: {
      backgroundColor: colors.primary[500],
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 12,
    },
    formButtonText: {
      color: colors.neutral[0],
      fontSize: 15,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
  });
