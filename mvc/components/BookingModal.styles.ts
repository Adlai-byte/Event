import { StyleSheet, Platform } from 'react-native';
import { colors, semantic } from '../theme';

export const createStyles = (isMobile: boolean, screenWidth: number) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: semantic.background,
    },
    backgroundContainer: { display: 'none' },
    decorativeCircle1: { display: 'none' },
    decorativeCircle2: { display: 'none' },
    modalContent: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: isMobile ? 16 : 20,
      paddingVertical: isMobile ? 12 : 16,
      paddingTop: Platform.OS === 'ios' ? (isMobile ? 44 : 50) : isMobile ? 12 : 20,
      backgroundColor: semantic.surface,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    headerContent: {
      flex: 1,
      marginRight: 10,
    },
    modalTitle: {
      fontSize: isMobile ? 18 : 20,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: 2,
      letterSpacing: -0.3,
    },
    modalSubtitle: {
      fontSize: isMobile ? 11 : 12,
      fontWeight: '500',
      color: semantic.textSecondary,
      marginTop: 0,
    },
    closeButton: {
      width: isMobile ? 32 : 36,
      height: isMobile ? 32 : 36,
      borderRadius: isMobile ? 16 : 18,
      backgroundColor: colors.neutral[100],
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      ...(Platform.OS === 'web'
        ? {
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }
        : {}),
    },
    closeButtonText: {
      fontSize: isMobile ? 18 : 20,
      color: semantic.surface,
      fontWeight: '600',
    },
    scrollView: {
      flex: 1,
    },
    calendarContainer: {
      flex: 1,
      minHeight: Platform.OS === 'web' ? 400 : 250,
      paddingHorizontal: isMobile ? 12 : 16,
      paddingTop: isMobile ? 12 : 16,
    },
    section: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 15,
    },
    loadingContainer: {
      padding: isMobile ? 30 : 40,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 150,
    },
    calendarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    monthNavButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    monthNavText: {
      fontSize: 24,
      color: semantic.primary,
      fontWeight: 'bold',
    },
    monthName: {
      fontSize: 18,
      fontWeight: '600',
      color: semantic.textPrimary,
    },
    calendar: {
      marginBottom: 15,
    },
    dayNamesRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    dayNameCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
    },
    dayNameText: {
      fontSize: 12,
      fontWeight: '600',
      color: semantic.textSecondary,
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: (screenWidth - 60) / 7,
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      margin: 2,
      borderRadius: 8,
    },
    dayCellOtherMonth: {
      opacity: 0.3,
    },
    dayCellAvailable: {
      backgroundColor: colors.neutral[100],
    },
    dayCellNoSlots: {
      backgroundColor: semantic.error,
      opacity: 0.8,
    },
    dayCellSelected: {
      backgroundColor: semantic.primary,
    },
    dayText: {
      fontSize: 14,
      color: semantic.textPrimary,
    },
    dayTextOtherMonth: {
      color: semantic.textMuted,
    },
    dayTextAvailable: {
      color: semantic.primary,
      fontWeight: '600',
    },
    dayTextNoSlots: {
      color: semantic.surface,
      fontWeight: '600',
    },
    dayTextSelected: {
      color: semantic.surface,
      fontWeight: 'bold',
    },
    selectedDateContainer: {
      marginTop: 10,
      padding: 12,
      backgroundColor: colors.primary[50],
      borderRadius: 8,
    },
    selectedDateText: {
      fontSize: 14,
      color: semantic.primary,
      fontWeight: '600',
    },
    timeSlotsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    timeSlot: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      backgroundColor: colors.neutral[100],
      marginBottom: 10,
      marginRight: 10,
      minWidth: 120,
    },
    timeSlotSelected: {
      backgroundColor: semantic.primary,
    },
    timeSlotBooked: {
      backgroundColor: semantic.error,
      borderWidth: 1,
      borderColor: colors.error[700],
      opacity: 1,
    },
    timeSlotText: {
      fontSize: 14,
      color: semantic.textPrimary,
      fontWeight: '500',
      textAlign: 'center',
    },
    timeSlotTextSelected: {
      color: semantic.surface,
      fontWeight: '600',
    },
    timeSlotTextBooked: {
      color: semantic.surface,
      fontWeight: '600',
    },
    noSlotsContainer: {
      padding: 30,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: semantic.background,
      borderRadius: 12,
      marginVertical: 10,
    },
    noSlotsIcon: {
      fontSize: 48,
      marginBottom: 12,
    },
    noSlotsText: {
      fontSize: 16,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    noSlotsSubtext: {
      fontSize: 14,
      color: semantic.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    bookingSummaryCard: {
      marginTop: 12,
      marginHorizontal: isMobile ? 12 : 16,
      padding: isMobile ? 14 : 16,
      backgroundColor: semantic.surface,
      borderRadius: 12,
      marginBottom: 12,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
          }),
      borderWidth: 1,
      borderColor: semantic.border,
    },
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    summaryTitle: {
      fontSize: isMobile ? 15 : 16,
      fontWeight: '800',
      color: semantic.textPrimary,
      letterSpacing: -0.2,
    },
    summaryBadge: {
      backgroundColor: semantic.primary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 16,
    },
    summaryBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: semantic.surface,
      letterSpacing: 0.2,
    },
    summaryDetails: {
      marginBottom: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: semantic.textSecondary,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
    priceCard: {
      backgroundColor: semantic.background,
      padding: isMobile ? 12 : 14,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: semantic.primary,
      marginTop: 6,
    },
    priceLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: semantic.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    priceValue: {
      fontSize: isMobile ? 22 : 24,
      fontWeight: '800',
      color: semantic.primary,
      letterSpacing: -0.3,
    },
    summaryHint: {
      fontSize: 11,
      color: semantic.textSecondary,
      marginTop: 8,
      lineHeight: 16,
    },
    attendeesContainer: {
      marginHorizontal: isMobile ? 12 : 16,
      marginTop: 12,
      marginBottom: 8,
      padding: isMobile ? 12 : 14,
      backgroundColor: semantic.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: semantic.border,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 2,
          }),
    },
    attendeesLabel: {
      fontSize: isMobile ? 13 : 14,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: 8,
      letterSpacing: -0.1,
    },
    attendeesInputContainer: {
      borderWidth: 2,
      borderColor: colors.neutral[300],
      borderRadius: 8,
      backgroundColor: colors.neutral[50],
      ...(Platform.OS === 'web'
        ? {
            transition: 'border-color 0.2s ease',
          }
        : {}),
    },
    attendeesInput: {
      paddingHorizontal: isMobile ? 12 : 14,
      paddingVertical: isMobile ? 12 : 14,
      fontSize: isMobile ? 15 : 16,
      color: semantic.textPrimary,
      minHeight: isMobile ? 44 : 48,
      fontWeight: '600',
    },
    attendeesHint: {
      fontSize: 11,
      color: semantic.textSecondary,
      marginTop: 6,
      lineHeight: 16,
    },
    timeSlotDisabled: {
      opacity: 0.5,
      backgroundColor: colors.neutral[100],
    },
    timeSlotTextDisabled: {
      color: colors.neutral[400],
    },
    modalFooter: {
      paddingHorizontal: isMobile ? 16 : 20,
      paddingVertical: isMobile ? 14 : 16,
      paddingBottom: Platform.OS === 'ios' ? (isMobile ? 28 : 32) : isMobile ? 14 : 20,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
      backgroundColor: semantic.surface,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -1 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 6,
          }),
    },
    confirmButton: {
      backgroundColor: semantic.textPrimary,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      ...(Platform.OS === 'web'
        ? { cursor: 'pointer', transition: 'background-color 0.15s ease' }
        : {}),
    },
    confirmButtonDisabled: {
      backgroundColor: colors.neutral[300],
      opacity: 0.6,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: 'none',
            cursor: 'default' as any,
          }
        : {
            shadowOpacity: 0,
            elevation: 0,
          }),
    },
    confirmButtonIcon: {
      fontSize: isMobile ? 16 : 18,
      color: semantic.surface,
      fontWeight: '700',
    },
    confirmButtonText: {
      color: semantic.surface,
      fontSize: isMobile ? 15 : 16,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    confirmButtonTextDisabled: {
      color: colors.neutral[400],
    },
    footerInfo: {
      marginTop: 8,
      alignItems: 'center',
    },
    footerInfoText: {
      fontSize: 12,
      color: semantic.textSecondary,
      fontWeight: '500',
    },
    perDayInfoCard: {
      marginHorizontal: isMobile ? 12 : 16,
      marginTop: 12,
      padding: isMobile ? 14 : 16,
      backgroundColor: colors.primary[50],
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary[200],
    },
    perDayInfoText: {
      fontSize: isMobile ? 13 : 14,
      color: colors.primary[800],
      fontWeight: '600',
      lineHeight: isMobile ? 18 : 20,
      textAlign: 'center',
    },
    // Modern Confirmation Modal Styles
    confirmModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Platform.OS === 'web' ? 20 : 16,
      ...(Platform.OS === 'web'
        ? {
            backdropFilter: 'blur(8px)',
          }
        : {}),
    },
    confirmModalContent: {
      backgroundColor: semantic.surface,
      borderRadius: Platform.OS === 'web' ? 28 : 24,
      width: Platform.OS === 'web' ? 520 : '100%',
      maxWidth: Platform.OS === 'web' ? 520 : '100%',
      maxHeight: Platform.OS === 'web' ? '90%' : '88%',
      overflow: 'hidden',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
            elevation: 8,
          }),
    },
    confirmModalHeader: {
      alignItems: 'center',
      padding: Platform.OS === 'web' ? 36 : 28,
      paddingBottom: Platform.OS === 'web' ? 28 : 22,
      backgroundColor: semantic.surface,
      borderBottomWidth: 1,
      borderBottomColor: semantic.background,
    },
    confirmIconContainer: {
      width: Platform.OS === 'web' ? 72 : 64,
      height: Platform.OS === 'web' ? 72 : 64,
      borderRadius: Platform.OS === 'web' ? 36 : 32,
      backgroundColor: semantic.success,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Platform.OS === 'web' ? 20 : 16,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 3,
          }),
    },
    confirmIcon: {
      fontSize: Platform.OS === 'web' ? 36 : 32,
      color: semantic.surface,
      fontWeight: 'bold',
    },
    confirmModalTitle: {
      fontSize: Platform.OS === 'web' ? 30 : 26,
      fontWeight: '800',
      color: semantic.textPrimary,
      marginBottom: Platform.OS === 'web' ? 10 : 8,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    confirmModalSubtitle: {
      fontSize: Platform.OS === 'web' ? 16 : 15,
      color: semantic.textSecondary,
      textAlign: 'center',
      fontWeight: '500',
    },
    confirmDetailsContainer: {
      padding: Platform.OS === 'web' ? 28 : 24,
      maxHeight: Platform.OS === 'web' ? 420 : 360,
    },
    confirmDetailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: Platform.OS === 'web' ? 24 : 20,
      paddingBottom: Platform.OS === 'web' ? 24 : 20,
      borderBottomWidth: 1,
      borderBottomColor: semantic.background,
    },
    confirmDetailIcon: {
      width: Platform.OS === 'web' ? 48 : 44,
      height: Platform.OS === 'web' ? 48 : 44,
      borderRadius: Platform.OS === 'web' ? 24 : 22,
      backgroundColor: colors.primary[50],
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Platform.OS === 'web' ? 18 : 16,
    },
    confirmDetailEmoji: {
      fontSize: Platform.OS === 'web' ? 22 : 20,
    },
    confirmDetailContent: {
      flex: 1,
    },
    confirmDetailLabel: {
      fontSize: Platform.OS === 'web' ? 13 : 12,
      color: semantic.textSecondary,
      fontWeight: '600',
      marginBottom: Platform.OS === 'web' ? 6 : 4,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    confirmDetailValue: {
      fontSize: Platform.OS === 'web' ? 17 : 16,
      color: semantic.textPrimary,
      fontWeight: '700',
      lineHeight: Platform.OS === 'web' ? 26 : 24,
    },
    confirmCostCard: {
      backgroundColor: colors.success[50],
      borderRadius: Platform.OS === 'web' ? 20 : 16,
      padding: Platform.OS === 'web' ? 24 : 20,
      marginTop: Platform.OS === 'web' ? 12 : 8,
      marginBottom: Platform.OS === 'web' ? 24 : 20,
      borderWidth: 2,
      borderColor: semantic.success,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
          }),
    },
    confirmCostLabel: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: colors.success[600],
      fontWeight: '700',
      marginBottom: Platform.OS === 'web' ? 10 : 8,
      letterSpacing: 0.5,
    },
    confirmCostValue: {
      fontSize: Platform.OS === 'web' ? 36 : 32,
      color: colors.success[700],
      fontWeight: '900',
      letterSpacing: -1,
    },
    confirmWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.warning[50],
      borderRadius: Platform.OS === 'web' ? 14 : 12,
      padding: Platform.OS === 'web' ? 18 : 14,
      marginTop: Platform.OS === 'web' ? 10 : 6,
      borderWidth: 1,
      borderColor: colors.warning[300],
    },
    confirmWarningIcon: {
      fontSize: Platform.OS === 'web' ? 22 : 20,
      marginRight: Platform.OS === 'web' ? 14 : 12,
    },
    confirmWarningText: {
      fontSize: Platform.OS === 'web' ? 15 : 14,
      color: colors.warning[800],
      fontWeight: '700',
      flex: 1,
      letterSpacing: 0.2,
    },
    confirmModalActions: {
      flexDirection: 'row',
      padding: Platform.OS === 'web' ? 28 : 24,
      paddingTop: Platform.OS === 'web' ? 24 : 20,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
      gap: Platform.OS === 'web' ? 14 : 12,
      backgroundColor: colors.neutral[50],
    },
    confirmCancelButton: {
      flex: 1,
      paddingVertical: Platform.OS === 'web' ? 18 : 16,
      borderRadius: Platform.OS === 'web' ? 14 : 12,
      backgroundColor: semantic.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: semantic.border,
      ...(Platform.OS === 'web'
        ? {
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }
        : {}),
    },
    confirmCancelButtonText: {
      fontSize: Platform.OS === 'web' ? 17 : 16,
      fontWeight: '700',
      color: colors.neutral[700],
      letterSpacing: 0.3,
    },
    confirmConfirmButton: {
      flex: 1,
      paddingVertical: Platform.OS === 'web' ? 18 : 16,
      borderRadius: Platform.OS === 'web' ? 14 : 12,
      backgroundColor: semantic.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 6px 20px rgba(79, 70, 229, 0.4), 0 2px 6px rgba(79, 70, 229, 0.3)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 2,
          }),
    },
    confirmConfirmButtonText: {
      fontSize: Platform.OS === 'web' ? 17 : 16,
      fontWeight: '800',
      color: semantic.surface,
      letterSpacing: 0.5,
    },
    // Profile Complete Modal Styles
    profileModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Platform.OS === 'web' ? 20 : 16,
      ...(Platform.OS === 'web'
        ? {
            backdropFilter: 'blur(8px)',
          }
        : {}),
    },
    profileModalContent: {
      backgroundColor: semantic.surface,
      borderRadius: Platform.OS === 'web' ? 24 : 20,
      width: Platform.OS === 'web' ? '90%' : '90%',
      maxWidth: 500,
      padding: Platform.OS === 'web' ? 32 : 24,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 16,
            elevation: 6,
          }),
    },
    profileModalIconContainer: {
      width: Platform.OS === 'web' ? 80 : 72,
      height: Platform.OS === 'web' ? 80 : 72,
      borderRadius: Platform.OS === 'web' ? 40 : 36,
      backgroundColor: colors.warning[50],
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: Platform.OS === 'web' ? 20 : 16,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 4px 16px rgba(254, 243, 199, 0.4)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 2,
          }),
    },
    profileModalIcon: {
      fontSize: Platform.OS === 'web' ? 48 : 40,
    },
    profileModalTitle: {
      fontSize: Platform.OS === 'web' ? 28 : 24,
      fontWeight: '800',
      color: semantic.textPrimary,
      textAlign: 'center',
      marginBottom: Platform.OS === 'web' ? 12 : 10,
      letterSpacing: -0.5,
    },
    profileModalMessage: {
      fontSize: Platform.OS === 'web' ? 16 : 15,
      color: semantic.textSecondary,
      textAlign: 'center',
      lineHeight: Platform.OS === 'web' ? 24 : 22,
      marginBottom: Platform.OS === 'web' ? 24 : 20,
    },
    profileModalFieldsContainer: {
      marginBottom: Platform.OS === 'web' ? 24 : 20,
      gap: Platform.OS === 'web' ? 12 : 10,
    },
    profileModalFieldItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.error[50],
      padding: Platform.OS === 'web' ? 16 : 14,
      borderRadius: Platform.OS === 'web' ? 12 : 10,
      borderLeftWidth: 4,
      borderLeftColor: semantic.error,
      gap: Platform.OS === 'web' ? 12 : 10,
    },
    profileModalFieldIcon: {
      fontSize: Platform.OS === 'web' ? 20 : 18,
      marginTop: Platform.OS === 'web' ? 2 : 1,
    },
    profileModalFieldText: {
      flex: 1,
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: colors.error[800],
      fontWeight: '600',
      lineHeight: Platform.OS === 'web' ? 20 : 18,
    },
    profileModalNoteContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.primary[50],
      padding: Platform.OS === 'web' ? 16 : 14,
      borderRadius: Platform.OS === 'web' ? 12 : 10,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary[500],
      gap: Platform.OS === 'web' ? 12 : 10,
      marginBottom: Platform.OS === 'web' ? 24 : 20,
    },
    profileModalNoteIcon: {
      fontSize: Platform.OS === 'web' ? 20 : 18,
      marginTop: Platform.OS === 'web' ? 2 : 1,
    },
    profileModalNoteText: {
      flex: 1,
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: colors.primary[800],
      fontWeight: '500',
      lineHeight: Platform.OS === 'web' ? 20 : 18,
    },
    profileModalActions: {
      flexDirection: 'row',
      gap: Platform.OS === 'web' ? 12 : 10,
      marginTop: Platform.OS === 'web' ? 8 : 4,
    },
    profileModalCancelButton: {
      flex: 1,
      paddingVertical: Platform.OS === 'web' ? 16 : 14,
      borderRadius: Platform.OS === 'web' ? 14 : 12,
      backgroundColor: colors.neutral[100],
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: semantic.border,
      ...(Platform.OS === 'web'
        ? {
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }
        : {}),
    },
    profileModalCancelText: {
      fontSize: Platform.OS === 'web' ? 16 : 15,
      fontWeight: '700',
      color: colors.neutral[600],
      letterSpacing: 0.3,
    },
    profileModalConfirmButton: {
      flex: 1,
      paddingVertical: Platform.OS === 'web' ? 16 : 14,
      borderRadius: Platform.OS === 'web' ? 14 : 12,
      backgroundColor: semantic.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 6px 20px rgba(79, 70, 229, 0.4), 0 2px 6px rgba(79, 70, 229, 0.3)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 2,
          }),
    },
    profileModalConfirmText: {
      fontSize: Platform.OS === 'web' ? 16 : 15,
      fontWeight: '800',
      color: semantic.surface,
      letterSpacing: 0.5,
    },
    bookingModeSwitcher: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginTop: 10,
      marginBottom: 10,
      gap: 10,
      backgroundColor: semantic.background,
      padding: 4,
      borderRadius: 12,
    },
    bookingModeButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    bookingModeButtonActive: {
      backgroundColor: semantic.primary,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 1,
          }),
    },
    bookingModeText: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      fontWeight: '600',
      color: semantic.textSecondary,
    },
    bookingModeTextActive: {
      color: semantic.surface,
      fontWeight: '700',
    },
    // Package styles for confirmation modal
    confirmPackageCard: {
      backgroundColor: colors.success[50],
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.success[200],
    },
    confirmPackageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    confirmPackageIcon: {
      fontSize: 16,
      marginRight: 8,
    },
    confirmPackageLabel: {
      fontSize: 12,
      color: colors.success[700],
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    confirmPackageName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.success[800],
      marginBottom: 8,
    },
    confirmPackageDetails: {
      marginBottom: 8,
    },
    confirmPackageDetailText: {
      fontSize: 13,
      color: colors.success[800],
    },
    confirmPackageRemovedText: {
      fontSize: 12,
      color: colors.error[600],
      marginTop: 4,
    },
    confirmPackagePrice: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.success[700],
      textAlign: 'right',
    },
  });
