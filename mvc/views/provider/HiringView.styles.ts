import { StyleSheet, Platform } from 'react-native';
import { colors, semantic } from '../../theme';

export const createStyles = (isMobile: boolean, screenWidth: number) => {
  const isExtraSmall = screenWidth < 360;

  return StyleSheet.create({
    mainContent: {
      flex: 1,
    },
    content: {
      padding: isMobile ? 12 : 20,
      paddingBottom: isMobile ? 20 : 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: isMobile ? 16 : 24,
      width: '100%',
    },
    headerTitleContainer: {
      flex: 1,
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
    postButton: {
      backgroundColor: semantic.primary,
      paddingVertical: isMobile ? 10 : 12,
      paddingHorizontal: isMobile ? 16 : 24,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginLeft: 'auto',
    },
    postButtonText: {
      color: semantic.surface,
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    tabContainer: {
      flexDirection: 'row',
      marginBottom: isMobile ? 12 : 20,
      backgroundColor: 'transparent',
      alignItems: 'center',
      gap: 16,
    },
    tabButton: {
      paddingVertical: isMobile ? 10 : 12,
      paddingHorizontal: isMobile ? 16 : 20,
      borderRadius: 8,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    tabButtonActive: {
      backgroundColor: semantic.primary,
      borderWidth: 1,
      borderColor: semantic.textPrimary,
      elevation: 0,
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
    tabButtonText: {
      fontSize: isMobile ? 14 : 15,
      color: semantic.textMuted,
      fontWeight: '500',
    },
    tabButtonTextActive: {
      color: semantic.surface,
      fontWeight: '700',
      fontSize: isMobile ? 14 : 15,
    },
    filterContainer: {
      marginBottom: 20,
    },
    filterChip: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: semantic.surface,
      marginRight: 8,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    filterChipActive: {
      backgroundColor: semantic.primary,
      borderColor: semantic.primary,
    },
    filterChipText: {
      fontSize: 14,
      color: semantic.textSecondary,
      fontWeight: '600',
    },
    filterChipTextActive: {
      color: semantic.surface,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: semantic.textSecondary,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyStateIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyStateText: {
      fontSize: 18,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: semantic.textSecondary,
    },
    tableScrollContainer: {
      marginTop: 16,
      ...(isMobile && {
        maxHeight: '100%',
      }),
    },
    tableScrollContent: {},
    tableContainer: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      overflow: 'hidden',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      width: '100%',
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: semantic.background,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 2,
      borderBottomColor: semantic.border,
    },
    tableHeaderCell: {
      fontSize: 12,
      fontWeight: '700',
      color: semantic.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[100],
      alignItems: 'center',
    },
    tableCell: {
      paddingHorizontal: 8,
    },
    tableCellTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
    tableCellText: {
      fontSize: 14,
      color: semantic.textSecondary,
      lineHeight: 20,
    },
    progressBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Platform.OS === 'web' ? 8 : 6,
      paddingVertical: Platform.OS === 'web' ? 4 : 2,
    },
    progressStep: {
      alignItems: 'center',
      minWidth: Platform.OS === 'web' ? 60 : 50,
    },
    progressStepCircle: {
      width: Platform.OS === 'web' ? 32 : 28,
      height: Platform.OS === 'web' ? 32 : 28,
      borderRadius: Platform.OS === 'web' ? 16 : 14,
      backgroundColor: semantic.border,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.neutral[300],
    },
    progressStepCircleCompleted: {
      backgroundColor: '#2563EB',
      borderColor: '#2563EB',
    },
    progressStepCircleCurrent: {
      backgroundColor: '#2563EB',
      borderColor: '#2563EB',
      ...(Platform.OS === 'web'
        ? ({
            boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.2)',
          } as any)
        : {
            shadowColor: '#2563EB',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4,
          }),
    },
    progressStepCircleRejected: {
      backgroundColor: semantic.error,
      borderColor: semantic.error,
    },
    progressStepIcon: {
      fontSize: Platform.OS === 'web' ? 14 : 12,
    },
    progressStepLabel: {
      fontSize: Platform.OS === 'web' ? 9 : 8,
      color: semantic.textMuted,
      marginTop: Platform.OS === 'web' ? 4 : 2,
      fontWeight: '500',
      textAlign: 'center',
    },
    progressStepLabelActive: {
      color: semantic.textPrimary,
      fontWeight: '600',
    },
    progressBarLine: {
      flex: 1,
      height: 2,
      backgroundColor: semantic.border,
      marginHorizontal: Platform.OS === 'web' ? 4 : 2,
      marginTop: Platform.OS === 'web' ? -16 : -14,
    },
    progressBarLineCompleted: {
      backgroundColor: '#2563EB',
    },
    statusBadge: {
      alignSelf: 'flex-start',
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    tableCellActions: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    tableActionButton: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: colors.neutral[100],
    },
    tableActionButtonDisabled: {
      backgroundColor: semantic.border,
      opacity: 0.5,
    },
    tableActionButtonTextDisabled: {
      color: semantic.textMuted,
    },
    editButton: {
      backgroundColor: '#DBEAFE',
    },
    deleteButton: {
      backgroundColor: semantic.errorLight,
    },
    toggleButton: {
      backgroundColor: '#DBEAFE',
    },
    downloadButton: {
      backgroundColor: '#DBEAFE',
    },
    scheduleButton: {
      backgroundColor: colors.success[50],
    },
    hireButton: {
      backgroundColor: semantic.success,
    },
    rejectButton: {
      backgroundColor: semantic.errorLight,
    },
    tableActionButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: semantic.textPrimary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Platform.OS === 'web' ? 20 : 0,
      ...(Platform.OS === 'web'
        ? ({
            backdropFilter: 'blur(4px)',
          } as any)
        : {}),
    },
    modalContent: {
      backgroundColor: semantic.surface,
      borderRadius: Platform.OS === 'web' ? 20 : 16,
      width: Platform.OS === 'web' ? '90%' : '100%',
      maxWidth: 600,
      maxHeight: Platform.OS === 'web' ? '90%' : '100%',
      overflow: 'hidden',
      ...(Platform.OS === 'web'
        ? ({
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)',
          } as any)
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 24,
            elevation: 10,
          }),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 24,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
      backgroundColor: semantic.surface,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: semantic.textPrimary,
      letterSpacing: -0.3,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.neutral[100],
      justifyContent: 'center',
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? ({
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          } as any)
        : {}),
    },
    closeButtonText: {
      fontSize: 20,
      color: semantic.textSecondary,
      fontWeight: '600',
    },
    jobInfoContainer: {
      padding: 20,
      backgroundColor: semantic.background,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    modalBody: {
      padding: 24,
      maxHeight: Platform.OS === 'web' ? 400 : undefined,
    },
    jobInfoTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: semantic.textPrimary,
      marginBottom: 8,
    },
    jobInfoDescription: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginBottom: 8,
    },
    jobInfoDeadline: {
      fontSize: 12,
      color: semantic.textSecondary,
      fontWeight: '500',
    },
    formGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: semantic.textPrimary,
      backgroundColor: semantic.surface,
    },
    textArea: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    helperText: {
      fontSize: 12,
      color: semantic.textMuted,
      marginTop: 4,
    },
    jobTypeContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    jobTypeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderWidth: 2,
      borderColor: '#E0E0E0',
      borderRadius: 10,
      backgroundColor: semantic.surface,
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }
        : {}),
    },
    jobTypeOptionSelected: {
      borderColor: '#2563EB',
      backgroundColor: semantic.background,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)',
          }
        : {
            shadowColor: '#2563EB',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }),
    },
    jobTypeRadio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#E0E0E0',
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: semantic.surface,
    },
    jobTypeRadioSelected: {
      borderColor: '#2563EB',
      backgroundColor: '#2563EB',
    },
    jobTypeRadioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: semantic.surface,
    },
    jobTypeLabel: {
      fontSize: 16,
      color: semantic.textPrimary,
      fontWeight: '500',
    },
    jobTypeLabelSelected: {
      color: '#2563EB',
      fontWeight: '600',
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
    },
    modalButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
    },
    cancelButton: {
      backgroundColor: colors.neutral[100],
    },
    cancelButtonText: {
      color: semantic.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    submitButton: {
      backgroundColor: semantic.primary,
    },
    submitButtonText: {
      color: semantic.surface,
      fontSize: 14,
      fontWeight: '600',
    },
    submitButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      backgroundColor: '#95A5A6',
      opacity: 0.6,
    },
    errorContainer: {
      backgroundColor: semantic.errorLight,
      borderLeftWidth: 4,
      borderLeftColor: semantic.error,
      borderRadius: 8,
      padding: 12,
      marginHorizontal: 20,
      marginTop: 12,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    errorIcon: {
      fontSize: 20,
      marginRight: 8,
    },
    errorText: {
      flex: 1,
      color: '#991B1B',
      fontSize: 14,
      lineHeight: 20,
    },
    errorCloseButton: {
      padding: 4,
      marginLeft: 8,
    },
    errorCloseText: {
      color: '#991B1B',
      fontSize: 18,
      fontWeight: 'bold',
    },
    rejectButtonModal: {
      backgroundColor: semantic.error,
    },
    hireButtonModal: {
      backgroundColor: semantic.success,
    },
    successToast: {
      position: 'absolute',
      top: Platform.OS === 'web' ? 40 : 60,
      left: 20,
      right: 20,
      zIndex: 1000,
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? {
            pointerEvents: 'none',
          }
        : {}),
    },
    successToastContent: {
      backgroundColor: semantic.success,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
          }),
    },
    successToastIcon: {
      fontSize: 24,
      color: semantic.surface,
      fontWeight: 'bold',
      marginRight: 12,
    },
    successToastText: {
      fontSize: 16,
      fontWeight: '600',
      color: semantic.surface,
    },
    errorToast: {
      position: 'absolute',
      top: Platform.OS === 'web' ? 40 : 60,
      left: 20,
      right: 20,
      zIndex: 1000,
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? {
            pointerEvents: 'none',
          }
        : {}),
    },
    errorToastContent: {
      backgroundColor: semantic.error,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
          }),
    },
    errorToastIcon: {
      fontSize: 24,
      color: semantic.surface,
      fontWeight: 'bold',
      marginRight: 12,
    },
    errorToastText: {
      fontSize: 16,
      fontWeight: '600',
      color: semantic.surface,
      flex: 1,
      textAlign: 'center',
    },
    pickerButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: 8,
      backgroundColor: semantic.surface,
      minHeight: 48,
    },
    pickerButtonText: {
      fontSize: 16,
      color: semantic.textPrimary,
      fontWeight: '500',
    },
    pickerButtonPlaceholder: {
      fontSize: 16,
      color: '#95A5A6',
    },
    pickerButtonIcon: {
      fontSize: 20,
    },
    modernJobInfoContainer: {
      padding: 20,
      backgroundColor: semantic.background,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
      marginBottom: 4,
      ...(Platform.OS === 'web'
        ? ({
            backgroundImage: `linear-gradient(135deg, ${semantic.background} 0%, ${colors.neutral[100]} 100%)`,
            borderLeftWidth: 4,
            borderLeftColor: '#2563EB',
            paddingLeft: 24,
          } as any)
        : {}),
    },
    modernJobInfoHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    modernJobInfoIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: '#EFF6FF',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      ...(Platform.OS === 'web'
        ? ({
            backgroundImage: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
            transform: 'scale(1)',
            transition: 'all 0.3s ease',
          } as any)
        : {}),
    },
    modernJobInfoIconContainerWeb: {
      ...(Platform.OS === 'web'
        ? ({
            ':hover': {
              transform: 'scale(1.05)',
              boxShadow: '0 6px 16px rgba(37, 99, 235, 0.3)',
            },
          } as any)
        : {}),
    },
    modernJobInfoTitleWeb: {
      ...(Platform.OS === 'web'
        ? ({
            backgroundImage: `linear-gradient(135deg, ${semantic.textPrimary} 0%, ${colors.neutral[700]} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          } as any)
        : {}),
    },
    modernJobInfoDescriptionWeb: {
      ...(Platform.OS === 'web'
        ? ({
            color: colors.neutral[600],
            fontWeight: '500',
          } as any)
        : {}),
    },
    modernJobInfoIcon: {
      fontSize: 24,
    },
    modernJobInfoContent: {
      flex: 1,
    },
    modernJobInfoTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: 4,
    },
    modernJobInfoDescription: {
      fontSize: 14,
      color: semantic.textSecondary,
      lineHeight: 20,
    },
    modernCurrentInterviewContainer: {
      marginTop: 12,
      padding: 12,
      backgroundColor: semantic.surface,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: '#2563EB',
    },
    modernCurrentInterviewContainerWeb: {
      ...(Platform.OS === 'web'
        ? ({
            backgroundImage: `linear-gradient(135deg, ${semantic.surface} 0%, ${semantic.background} 100%)`,
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.1)',
            borderLeftWidth: 4,
            padding: 16,
          } as any)
        : {}),
    },
    modernCurrentInterviewLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: semantic.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    modernCurrentInterviewText: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
    },
    modernFormGroup: {
      marginBottom: 20,
    },
    modernLabel: {
      marginBottom: 8,
    },
    modernLabelText: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
    },
    modernLabelRequired: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.error,
    },
    modernWebInputWrapper: {
      width: '100%',
    },
    modernWebInputContainer: {
      width: '100%',
      position: 'relative',
    },
    modernWebInputIconWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
      ...(Platform.OS === 'web'
        ? ({
            display: 'flex',
            gap: '12px',
          } as any)
        : {}),
    },
    modernPickerButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderWidth: 2,
      borderColor: semantic.border,
      borderRadius: 12,
      backgroundColor: semantic.surface,
      minHeight: 56,
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }
        : {}),
    },
    modernPickerButtonLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    modernPickerIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: semantic.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    modernPickerIcon: {
      fontSize: 20,
    },
    modernPickerButtonText: {
      fontSize: 16,
      color: semantic.textPrimary,
      fontWeight: '600',
    },
    modernPickerButtonPlaceholder: {
      fontSize: 16,
      color: semantic.textMuted,
      fontWeight: '500',
    },
    modernPickerArrow: {
      fontSize: 24,
      color: semantic.textMuted,
      fontWeight: '300',
    },
    deadlineInputWrapper: {
      width: '100%',
    },
    deadlinePickerButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderWidth: 2,
      borderColor: semantic.border,
      borderRadius: 12,
      backgroundColor: semantic.surface,
      minHeight: 52,
    },
    deadlinePickerButtonDisabled: {
      opacity: 0.6,
    },
    deadlinePickerButtonLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    deadlinePickerIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    deadlinePickerText: {
      fontSize: 16,
      color: semantic.textPrimary,
      fontWeight: '600',
    },
    deadlinePickerPlaceholder: {
      fontSize: 16,
      color: semantic.textMuted,
      fontWeight: '500',
    },
    deadlinePickerArrow: {
      fontSize: 24,
      color: semantic.textMuted,
      fontWeight: '300',
    },
    modernInput: {
      width: '100%',
      padding: 16,
      borderWidth: 2,
      borderColor: semantic.border,
      borderRadius: 12,
      fontSize: 16,
      color: semantic.textPrimary,
      backgroundColor: semantic.surface,
      ...(Platform.OS === 'web'
        ? ({
            outlineWidth: 0,
            outlineStyle: 'none',
            outlineColor: 'transparent',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          } as any)
        : {}),
    },
    modernTextArea: {
      minHeight: 120,
      paddingTop: 16,
      paddingBottom: 16,
      textAlignVertical: 'top',
    },
    modernHelperText: {
      fontSize: 12,
      color: semantic.textSecondary,
      marginTop: 6,
      fontStyle: 'italic',
    },
    modernModalFooter: {
      flexDirection: 'row',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
      gap: 12,
    },
    modernCancelButton: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: colors.neutral[100],
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: semantic.border,
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }
        : {}),
    },
    modernCancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: semantic.textSecondary,
    },
    modernSubmitButton: {
      flex: 2,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: '#2563EB',
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          }
        : {
            shadowColor: '#2563EB',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5,
          }),
    },
    modernSubmitButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: semantic.surface,
      letterSpacing: 0.3,
    },
    pickerModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    pickerModalContent: {
      backgroundColor: semantic.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
    },
    pickerModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    pickerModalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: semantic.textPrimary,
    },
    pickerModalCloseButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#f0f2f5',
      justifyContent: 'center',
      alignItems: 'center',
    },
    pickerModalCloseText: {
      fontSize: 18,
      color: semantic.textSecondary,
      fontWeight: 'bold',
    },
    pickerModalBody: {
      maxHeight: 400,
    },
    pickerModalItem: {
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    pickerModalItemSelected: {
      backgroundColor: '#E3F2FD',
    },
    pickerModalItemText: {
      fontSize: 16,
      color: semantic.textPrimary,
      fontWeight: '500',
    },
    pickerModalItemTextSelected: {
      color: '#1976D2',
      fontWeight: '600',
    },
    webInputWrapper: {
      width: '100%',
    },
    successTooltip: {
      position: 'absolute',
      top: Platform.OS === 'web' ? 20 : 60,
      left: 20,
      right: 20,
      zIndex: 10000,
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? {
            pointerEvents: 'none',
          }
        : {}),
    },
    successTooltipContent: {
      backgroundColor: semantic.success,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 300,
      maxWidth: 600,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
          }),
    },
    successTooltipIcon: {
      fontSize: 20,
      color: semantic.surface,
      fontWeight: 'bold',
      marginRight: 12,
    },
    successTooltipText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: semantic.surface,
      textAlign: 'center',
    },
    successTooltipClose: {
      padding: 4,
      marginLeft: 12,
    },
    successTooltipCloseText: {
      color: semantic.surface,
      fontSize: 18,
      fontWeight: 'bold',
    },
    errorTooltip: {
      position: 'absolute',
      top: Platform.OS === 'web' ? 20 : 60,
      left: 20,
      right: 20,
      zIndex: 10000,
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? {
            pointerEvents: 'none',
          }
        : {}),
    },
    errorTooltipContent: {
      backgroundColor: semantic.error,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 300,
      maxWidth: 600,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
          }),
    },
    errorTooltipIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    errorTooltipText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: semantic.surface,
      textAlign: 'center',
    },
    errorTooltipClose: {
      padding: 4,
      marginLeft: 12,
    },
    errorTooltipCloseText: {
      color: semantic.surface,
      fontSize: 18,
      fontWeight: 'bold',
    },
    // Mobile card styles
    mobileCardContainer: {
      gap: 12,
    },
    mobileCard: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: semantic.border,
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
    mobileCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    mobileCardTitle: {
      fontSize: isExtraSmall ? 14 : 16,
      fontWeight: '700',
      color: semantic.textPrimary,
      flex: 1,
    },
    mobileCardSubtitle: {
      fontSize: isExtraSmall ? 11 : 13,
      color: semantic.textSecondary,
      marginTop: 2,
    },
    mobileCardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[100],
    },
    mobileCardLabel: {
      fontSize: 13,
      color: semantic.textSecondary,
      fontWeight: '500',
    },
    mobileCardValue: {
      fontSize: 13,
      color: semantic.textPrimary,
      fontWeight: '600',
      maxWidth: '60%',
      textAlign: 'right',
    },
    mobileCardActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
  });
};
