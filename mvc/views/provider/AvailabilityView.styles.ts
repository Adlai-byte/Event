import { StyleSheet, Platform } from 'react-native';
import { colors, semantic } from '../../theme';

export const createStyles = (isMobile: boolean, screenWidth: number) => {
  const isExtraSmall = screenWidth < 360;
  const dayCellSize = isMobile ? (isExtraSmall ? 32 : 38) : 44;

  return StyleSheet.create({
    main: {
      flex: 1,
    },
    mainContent: {
      padding: isMobile ? 12 : 20,
      paddingBottom: isMobile ? 20 : 20,
    },
    header: {
      marginBottom: isMobile ? 12 : 20,
    },
    headerTitle: {
      fontSize: isMobile ? 24 : 32,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: isMobile ? 14 : 16,
      color: semantic.textSecondary,
    },

    // Two-column layout
    sectionContainer: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 16 : 20,
    } as any,

    // Calendar Section
    calendarSection: {
      flex: isMobile ? undefined : 1,
      width: isMobile ? '100%' : undefined,
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: isMobile ? 12 : 20,
      ...(Platform.OS === 'web'
        ? ({
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          } as any)
        : {
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          }),
    },

    // Schedule Section
    scheduleSection: {
      flex: isMobile ? undefined : 1,
      width: isMobile ? '100%' : undefined,
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: isMobile ? 12 : 20,
      ...(Platform.OS === 'web'
        ? ({
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          } as any)
        : {
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          }),
    },

    sectionTitle: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: isMobile ? 12 : 16,
    },

    // Calendar Header (month navigation)
    calendarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    calendarMonthTitle: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: '600',
      color: semantic.textPrimary,
    },
    navButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: semantic.background,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Calendar Grid
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayOfWeekHeader: {
      width: `${100 / 7}%`,
      alignItems: 'center',
      paddingVertical: 6,
    } as any,
    dayOfWeekText: {
      fontSize: isExtraSmall ? 10 : 12,
      fontWeight: '600',
      color: semantic.textSecondary,
    },
    dayCell: {
      width: `${100 / 7}%`,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 2,
    } as any,
    dayCellInner: {
      width: dayCellSize,
      height: dayCellSize,
      borderRadius: dayCellSize / 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    dayText: {
      fontSize: isExtraSmall ? 12 : 14,
      color: semantic.textPrimary,
      textAlign: 'center',
    },
    dayAvailable: {
      backgroundColor: colors.success[50],
      borderColor: colors.success[500],
    },
    dayBlocked: {
      backgroundColor: colors.error[50],
      borderColor: colors.error[500],
    },
    dayBooked: {
      backgroundColor: colors.primary[50],
      borderColor: colors.primary[500],
    },
    dayPast: {
      opacity: 0.4,
    },
    daySelected: {
      borderWidth: 2,
      borderColor: semantic.primary,
    },
    dayEmpty: {
      // placeholder cells for grid alignment
    },
    dayToday: {
      borderWidth: 2,
      borderColor: semantic.textPrimary,
    },

    // Legend
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: isMobile ? 8 : 12,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
    } as any,
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    } as any,
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendDotAvailable: {
      backgroundColor: colors.success[50],
      borderWidth: 1,
      borderColor: colors.success[500],
    },
    legendDotBlocked: {
      backgroundColor: colors.error[50],
      borderWidth: 1,
      borderColor: colors.error[500],
    },
    legendDotBooked: {
      backgroundColor: colors.primary[50],
      borderWidth: 1,
      borderColor: colors.primary[500],
    },
    legendDotPast: {
      backgroundColor: semantic.border,
    },
    legendText: {
      fontSize: isExtraSmall ? 10 : 12,
      color: semantic.textSecondary,
    },

    // Block modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalContent: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      width: '100%',
      maxWidth: 400,
      ...(Platform.OS === 'web'
        ? ({
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          } as any)
        : {
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 24,
          }),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
    modalBody: {
      padding: 16,
    },
    modalDateText: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginBottom: 12,
    },
    reasonInput: {
      backgroundColor: semantic.background,
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: semantic.textPrimary,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    blockedReasonText: {
      fontSize: 13,
      color: semantic.textSecondary,
      fontStyle: 'italic',
      marginTop: 4,
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
    } as any,
    modalButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      minWidth: 80,
    },
    modalCancelButton: {
      backgroundColor: semantic.background,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    modalCancelButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textSecondary,
    },
    modalBlockButton: {
      backgroundColor: semantic.error,
    },
    modalUnblockButton: {
      backgroundColor: semantic.success,
    },
    modalBlockButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.surface,
    },

    // Schedule section
    serviceSelector: {
      marginBottom: 16,
    },
    serviceSelectorLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 6,
    },
    serviceSelectorDropdown: {
      backgroundColor: semantic.background,
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: semantic.textPrimary,
    },
    serviceOption: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    serviceOptionActive: {
      backgroundColor: colors.primary[50],
    },
    serviceOptionText: {
      fontSize: 14,
      color: semantic.textPrimary,
    },
    serviceOptionTextActive: {
      color: semantic.primary,
      fontWeight: '600',
    },

    // Schedule rows
    scheduleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: isMobile ? 8 : 10,
      borderBottomWidth: 1,
      borderBottomColor: semantic.borderLight,
      gap: isMobile ? 6 : 10,
    } as any,
    scheduleDayName: {
      width: isMobile ? 50 : 80,
      fontSize: isMobile ? 13 : 14,
      fontWeight: '600',
      color: semantic.textPrimary,
    },
    toggleButton: {
      width: isMobile ? 40 : 48,
      height: isMobile ? 22 : 26,
      borderRadius: isMobile ? 11 : 13,
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    toggleButtonOn: {
      backgroundColor: colors.success[500],
      alignItems: 'flex-end',
    },
    toggleButtonOff: {
      backgroundColor: colors.neutral[300],
      alignItems: 'flex-start',
    },
    toggleKnob: {
      width: isMobile ? 18 : 22,
      height: isMobile ? 18 : 22,
      borderRadius: isMobile ? 9 : 11,
      backgroundColor: semantic.surface,
    },
    timeInput: {
      flex: 1,
      backgroundColor: semantic.background,
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 6,
      paddingHorizontal: isMobile ? 6 : 10,
      paddingVertical: isMobile ? 6 : 8,
      fontSize: isMobile ? 12 : 14,
      color: semantic.textPrimary,
      textAlign: 'center',
      maxWidth: isMobile ? 65 : 90,
    },
    timeInputDisabled: {
      opacity: 0.4,
    },
    timeSeparator: {
      fontSize: 12,
      color: semantic.textSecondary,
    },

    // Save button
    saveButton: {
      backgroundColor: semantic.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 16,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.surface,
    },

    // Empty/loading states
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyStateText: {
      fontSize: 14,
      color: semantic.textSecondary,
      textAlign: 'center',
    },

    // Service dropdown list
    serviceDropdownList: {
      backgroundColor: semantic.surface,
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      marginTop: 4,
      maxHeight: 200,
      overflow: 'hidden',
    },
    serviceDropdownItem: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: semantic.borderLight,
    },
    serviceDropdownItemActive: {
      backgroundColor: colors.primary[50],
    },
    serviceDropdownItemText: {
      fontSize: 14,
      color: semantic.textPrimary,
    },
    serviceDropdownItemTextActive: {
      color: semantic.primary,
      fontWeight: '600',
    },

    // Schedule header row
    scheduleHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 2,
      borderBottomColor: semantic.border,
      gap: isMobile ? 6 : 10,
    } as any,
    scheduleHeaderText: {
      fontSize: 12,
      fontWeight: '700',
      color: semantic.textSecondary,
      textTransform: 'uppercase',
    },
    scheduleHeaderDayCol: {
      width: isMobile ? 50 : 80,
    },
    scheduleHeaderToggleCol: {
      width: isMobile ? 40 : 48,
    },
    scheduleHeaderTimeCol: {
      flex: 1,
      maxWidth: isMobile ? 65 : 90,
    },

    // Success/error messages
    messageContainer: {
      padding: 10,
      borderRadius: 8,
      marginTop: 8,
    },
    successMessage: {
      backgroundColor: colors.success[50],
      borderWidth: 1,
      borderColor: colors.success[500],
    },
    errorMessage: {
      backgroundColor: colors.error[50],
      borderWidth: 1,
      borderColor: colors.error[500],
    },
    messageText: {
      fontSize: 13,
      textAlign: 'center',
    },
    successMessageText: {
      color: colors.success[700],
    },
    errorMessageText: {
      color: colors.error[700],
    },
  });
};
