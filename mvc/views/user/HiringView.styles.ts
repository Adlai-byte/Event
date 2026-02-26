import { StyleSheet, Platform } from 'react-native';
import { colors, semantic } from '../../theme';

export const createStyles = (isMobile: boolean, _screenWidth: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: semantic.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: semantic.background,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: semantic.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: semantic.surface,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    addButton: {
      backgroundColor: semantic.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    addButtonText: {
      color: semantic.surface,
      fontSize: 16,
      fontWeight: '600',
    },
    modernTabContainer: {
      flexDirection: 'row',
      backgroundColor: semantic.surface,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
      paddingHorizontal: Platform.OS === 'web' ? 40 : 20,
      maxWidth: Platform.OS === 'web' ? 1400 : '100%',
      alignSelf: 'center',
      width: '100%',
    },
    modernTab: {
      paddingVertical: Platform.OS === 'web' ? 18 : 16,
      paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
      marginRight: Platform.OS === 'web' ? 8 : 0,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
      ...(Platform.OS === 'web'
        ? {
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            ':hover': {
              backgroundColor: semantic.background,
            },
          }
        : {}),
    },
    modernActiveTab: {
      borderBottomColor: semantic.primary,
      backgroundColor: Platform.OS === 'web' ? semantic.background : 'transparent',
    },
    modernTabText: {
      fontSize: Platform.OS === 'web' ? 15 : 16,
      color: semantic.textSecondary,
      fontWeight: '500',
      letterSpacing: Platform.OS === 'web' ? 0.3 : 0,
    },
    modernActiveTabText: {
      color: semantic.primary,
      fontWeight: '600',
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: semantic.surface,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: semantic.primary,
    },
    tabText: {
      fontSize: 16,
      color: semantic.textSecondary,
      fontWeight: '500',
    },
    activeTabText: {
      color: semantic.primary,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      padding: Platform.OS === 'web' ? 0 : 20,
      paddingTop: Platform.OS === 'web' ? 0 : 10,
      paddingBottom: Platform.OS === 'web' ? 0 : 10,
      backgroundColor: semantic.background,
    },
    requestCard: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }),
    },
    requestHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    requestTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: semantic.textPrimary,
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      color: semantic.surface,
      fontSize: 12,
      fontWeight: 'bold',
    },
    requestDescription: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginBottom: 12,
      lineHeight: 20,
    },
    requestDetails: {
      marginBottom: 12,
    },
    requestDetail: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginBottom: 4,
    },
    requirementsContainer: {
      marginBottom: 12,
    },
    requirementsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 4,
    },
    requirementItem: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginBottom: 2,
    },
    proposeButton: {
      backgroundColor: semantic.primary,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    proposeButtonText: {
      color: semantic.surface,
      fontSize: 16,
      fontWeight: '600',
    },
    publishButton: {
      backgroundColor: '#4CAF50',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    publishButtonText: {
      color: semantic.surface,
      fontSize: 16,
      fontWeight: '600',
    },
    proposalCard: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }),
    },
    jobPostingsGrid: {
      ...(Platform.OS === 'web'
        ? ({
            display: 'grid' as any,
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: isMobile ? '12px' : '24px',
            padding: isMobile ? 12 : 24,
          } as any)
        : {
            padding: 20,
          }),
      maxWidth: Platform.OS === 'web' ? 1400 : '100%',
      alignSelf: 'center',
      width: '100%',
    },
    modernJobCard: {
      backgroundColor: semantic.surface,
      borderRadius: Platform.OS === 'web' ? 20 : 16,
      padding: Platform.OS === 'web' ? 24 : 20,
      marginBottom: Platform.OS === 'web' ? 0 : 20,
      borderWidth: 1,
      borderColor: semantic.border,
      ...(Platform.OS === 'web'
        ? ({
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
            transition: 'all 0.3s ease',
            cursor: 'default' as any,
            ':hover': {
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
              transform: 'translateY(-2px)',
              borderColor: colors.primary[200],
            },
          } as any)
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }),
    },
    modernJobCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Platform.OS === 'web' ? 16 : 14,
    },
    modernJobCardHeaderLeft: {
      flex: 1,
      marginRight: 12,
    },
    modernJobTitle: {
      fontSize: Platform.OS === 'web' ? 22 : 20,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: Platform.OS === 'web' ? 8 : 6,
      letterSpacing: Platform.OS === 'web' ? -0.3 : 0,
      lineHeight: Platform.OS === 'web' ? 28 : 26,
    },
    modernJobProviderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    modernJobProviderIcon: {
      fontSize: Platform.OS === 'web' ? 16 : 14,
      marginRight: 6,
    },
    modernJobProvider: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: semantic.textSecondary,
      fontWeight: '500',
    },
    modernStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ECFDF5',
      paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
      paddingVertical: Platform.OS === 'web' ? 6 : 5,
      borderRadius: Platform.OS === 'web' ? 20 : 16,
      borderWidth: 1,
      borderColor: colors.success[50],
    },
    modernStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: semantic.success,
      marginRight: 6,
    },
    modernStatusText: {
      fontSize: Platform.OS === 'web' ? 12 : 11,
      color: colors.success[600],
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    modernJobDescription: {
      fontSize: Platform.OS === 'web' ? 15 : 14,
      color: colors.neutral[600],
      lineHeight: Platform.OS === 'web' ? 24 : 22,
      marginBottom: Platform.OS === 'web' ? 20 : 16,
      minHeight: Platform.OS === 'web' ? 72 : 66,
    },
    modernJobCardFooter: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingTop: Platform.OS === 'web' ? 18 : 16,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
      marginBottom: Platform.OS === 'web' ? 20 : 16,
      gap: Platform.OS === 'web' ? 16 : 12,
    },
    modernJobInfoItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      flex: 1,
      minWidth: Platform.OS === 'web' ? '30%' : '100%',
    },
    modernJobInfoItemLocation: {
      minWidth: Platform.OS === 'web' ? '30%' : '100%',
    },
    modernJobInfoIcon: {
      fontSize: Platform.OS === 'web' ? 18 : 16,
      marginRight: Platform.OS === 'web' ? 10 : 8,
    },
    modernJobInfoTextContainer: {
      flex: 1,
    },
    modernJobInfoLabel: {
      fontSize: Platform.OS === 'web' ? 11 : 10,
      color: semantic.textMuted,
      fontWeight: '500',
      marginBottom: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    modernJobInfoValue: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: semantic.textPrimary,
      fontWeight: '600',
    },
    modernApplyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: semantic.primary,
      paddingVertical: Platform.OS === 'web' ? 14 : 12,
      borderRadius: Platform.OS === 'web' ? 12 : 10,
      ...(Platform.OS === 'web'
        ? {
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
            ':hover': {
              backgroundColor: '#4F46E5',
              boxShadow: '0 6px 12px -1px rgba(99, 102, 241, 0.4)',
              transform: 'translateY(-1px)',
            },
            ':active': {
              transform: 'translateY(0)',
            },
          }
        : {
            shadowColor: semantic.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }),
    },
    modernApplyButtonText: {
      color: semantic.surface,
      fontSize: Platform.OS === 'web' ? 15 : 14,
      fontWeight: '600',
      marginRight: Platform.OS === 'web' ? 8 : 6,
      letterSpacing: 0.3,
    },
    modernApplyButtonIcon: {
      color: semantic.surface,
      fontSize: Platform.OS === 'web' ? 18 : 16,
      fontWeight: '600',
    },
    modernJobCardApplied: {
      opacity: 0.85,
      borderColor: colors.neutral[300],
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }
        : {}),
    },
    appliedBadge: {
      paddingHorizontal: Platform.OS === 'web' ? 10 : 8,
      paddingVertical: Platform.OS === 'web' ? 4 : 3,
      borderRadius: Platform.OS === 'web' ? 12 : 10,
      borderWidth: 1,
    },
    appliedBadgeText: {
      fontSize: Platform.OS === 'web' ? 11 : 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    modernApplyButtonDisabled: {
      backgroundColor: semantic.textMuted,
      ...(Platform.OS === 'web'
        ? {
            cursor: 'not-allowed' as any,
            boxShadow: 'none',
            ':hover': {
              backgroundColor: semantic.textMuted,
              boxShadow: 'none',
              transform: 'none',
            },
          }
        : {
            shadowOpacity: 0,
            elevation: 0,
          }),
    },
    modernApplyButtonTextDisabled: {
      color: colors.neutral[100],
    },
    jobPostingCard: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }),
    },
    jobPostingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    jobPostingHeaderLeft: {
      flex: 1,
      marginRight: 12,
    },
    jobPostingTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: semantic.textPrimary,
      marginBottom: 4,
    },
    jobPostingProvider: {
      fontSize: 14,
      color: semantic.textSecondary,
    },
    jobPostingDescription: {
      fontSize: 14,
      color: semantic.textPrimary,
      lineHeight: 20,
      marginBottom: 12,
    },
    jobPostingFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
    },
    jobPostingDeadline: {
      fontSize: 12,
      color: semantic.textSecondary,
      fontWeight: '500',
    },
    jobPostingDate: {
      fontSize: 12,
      color: '#95A5A6',
    },
    applyButton: {
      backgroundColor: semantic.primary,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 12,
    },
    applyButtonText: {
      color: semantic.surface,
      fontSize: 16,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      width: '100%',
      maxWidth: 500,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: semantic.textPrimary,
    },
    closeButton: {
      padding: 4,
    },
    closeButtonText: {
      fontSize: 24,
      color: semantic.textSecondary,
    },
    jobInfoContainer: {
      padding: 20,
      backgroundColor: semantic.background,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
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
    modalBody: {
      padding: 20,
      maxHeight: 400,
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
    helperText: {
      fontSize: 12,
      color: '#95A5A6',
      marginBottom: 8,
      fontStyle: 'italic',
    },
    filePickerButton: {
      backgroundColor: semantic.background,
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
    },
    filePickerButtonText: {
      fontSize: 14,
      color: semantic.textSecondary,
    },
    removeFileButton: {
      marginTop: 8,
      padding: 8,
      alignItems: 'center',
    },
    removeFileButtonText: {
      fontSize: 12,
      color: '#E74C3C',
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
      backgroundColor: semantic.background,
    },
    cancelButtonText: {
      color: semantic.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    submitButton: {
      backgroundColor: semantic.primary,
    },
    submitButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      backgroundColor: '#95A5A6',
    },
    submitButtonText: {
      color: semantic.surface,
      fontSize: 14,
      fontWeight: '600',
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
    proposalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    proposalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: semantic.textPrimary,
      flex: 1,
    },
    proposalDescription: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginBottom: 12,
      lineHeight: 20,
    },
    proposalDetails: {
      marginBottom: 12,
    },
    proposalDetail: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginBottom: 4,
    },
    deliverablesContainer: {
      marginBottom: 12,
    },
    deliverablesTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 4,
    },
    deliverableItem: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginBottom: 2,
    },
    feedbackContainer: {
      backgroundColor: semantic.background,
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
    },
    feedbackTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 4,
    },
    feedbackText: {
      fontSize: 14,
      color: semantic.textSecondary,
      fontStyle: 'italic',
    },
    modernEmptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Platform.OS === 'web' ? 120 : 80,
      paddingHorizontal: 20,
    },
    modernEmptyIconContainer: {
      width: Platform.OS === 'web' ? 120 : 100,
      height: Platform.OS === 'web' ? 120 : 100,
      borderRadius: Platform.OS === 'web' ? 60 : 50,
      backgroundColor: semantic.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Platform.OS === 'web' ? 24 : 20,
    },
    modernEmptyIcon: {
      fontSize: Platform.OS === 'web' ? 60 : 50,
    },
    modernEmptyTitle: {
      fontSize: Platform.OS === 'web' ? 24 : 20,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: Platform.OS === 'web' ? 12 : 8,
      textAlign: 'center',
    },
    modernEmptySubtext: {
      fontSize: Platform.OS === 'web' ? 16 : 14,
      color: semantic.textSecondary,
      textAlign: 'center',
      maxWidth: Platform.OS === 'web' ? 400 : 300,
      lineHeight: Platform.OS === 'web' ? 24 : 20,
    },
    modernLoadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Platform.OS === 'web' ? 120 : 80,
      backgroundColor: semantic.background,
    },
    modernLoadingText: {
      marginTop: Platform.OS === 'web' ? 20 : 16,
      fontSize: Platform.OS === 'web' ? 16 : 15,
      color: semantic.primary,
      fontWeight: '500',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: semantic.textSecondary,
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: '#A4B0BE',
      textAlign: 'center',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: semantic.background,
    },
    modalCloseButton: {
      fontSize: 16,
      color: semantic.primary,
      fontWeight: '600',
    },
    modalSaveButton: {
      fontSize: 16,
      color: semantic.primary,
      fontWeight: '600',
    },
    formContainer: {
      flex: 1,
      padding: 20,
    },
    formLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 8,
      marginTop: 16,
    },
    formInput: {
      backgroundColor: semantic.surface,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    textAreaInput: {
      height: 80,
      textAlignVertical: 'top',
    },
    budgetContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    budgetInput: {
      flex: 1,
      marginRight: 8,
    },
    dateContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    dateInput: {
      flex: 1,
      marginRight: 8,
    },
    modernSearchContainer: {
      backgroundColor: semantic.surface,
      paddingVertical: Platform.OS === 'web' ? 24 : 20,
      paddingHorizontal: Platform.OS === 'web' ? 40 : 20,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
      maxWidth: Platform.OS === 'web' ? 1400 : '100%',
      alignSelf: 'center',
      width: '100%',
    },
    modernSearchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: semantic.background,
      borderRadius: Platform.OS === 'web' ? 16 : 12,
      paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
      paddingVertical: Platform.OS === 'web' ? 4 : 4,
      borderWidth: 2,
      borderColor: semantic.border,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            transition: 'all 0.2s ease',
            ':focus-within': {
              borderColor: semantic.primary,
              boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
            },
          }
        : {}),
    },
    searchIcon: {
      fontSize: Platform.OS === 'web' ? 20 : 18,
      marginRight: Platform.OS === 'web' ? 12 : 10,
      color: semantic.textSecondary,
    },
    modernSearchInput: {
      flex: 1,
      fontSize: Platform.OS === 'web' ? 16 : 15,
      color: semantic.textPrimary,
      paddingVertical: Platform.OS === 'web' ? 14 : 12,
      fontWeight: '500',
      backgroundColor: 'transparent',
    },
    clearSearchButton: {
      padding: Platform.OS === 'web' ? 6 : 4,
      marginLeft: Platform.OS === 'web' ? 8 : 6,
      borderRadius: 20,
      backgroundColor: semantic.border,
      width: Platform.OS === 'web' ? 28 : 24,
      height: Platform.OS === 'web' ? 28 : 24,
      justifyContent: 'center',
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            ':hover': {
              backgroundColor: colors.neutral[300],
            },
          }
        : {}),
    },
    clearSearchText: {
      fontSize: Platform.OS === 'web' ? 14 : 12,
      color: semantic.textSecondary,
      fontWeight: '600',
    },
    filterContainer: {
      backgroundColor: semantic.surface,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    searchInput: {
      backgroundColor: semantic.background,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    filterScroll: {
      flexDirection: 'row',
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: semantic.background,
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
      fontWeight: '500',
    },
    filterChipTextActive: {
      color: semantic.surface,
      fontWeight: '600',
    },
    eventSelector: {
      maxHeight: 150,
      marginBottom: 16,
    },
    eventOption: {
      padding: 12,
      backgroundColor: semantic.background,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    eventOptionSelected: {
      backgroundColor: '#E8E5FF',
      borderColor: semantic.primary,
    },
    eventOptionText: {
      fontSize: 16,
      fontWeight: '600',
      color: semantic.textPrimary,
    },
    eventOptionDate: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginTop: 4,
    },
    locationTypeContainer: {
      flexDirection: 'row',
      marginBottom: 16,
      gap: 8,
    },
    locationTypeButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: semantic.background,
      borderWidth: 1,
      borderColor: semantic.border,
      alignItems: 'center',
    },
    locationTypeButtonActive: {
      backgroundColor: semantic.primary,
      borderColor: semantic.primary,
    },
    locationTypeText: {
      fontSize: 14,
      fontWeight: '500',
      color: semantic.textSecondary,
    },
    locationTypeTextActive: {
      color: semantic.surface,
      fontWeight: '600',
    },
    viewProposalsButton: {
      backgroundColor: '#2196F3',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    viewProposalsButtonText: {
      color: semantic.surface,
      fontSize: 16,
      fontWeight: '600',
    },
    proposalActions: {
      flexDirection: 'row',
      marginTop: 12,
      gap: 8,
    },
    acceptButton: {
      flex: 1,
      backgroundColor: '#4CAF50',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    acceptButtonText: {
      color: semantic.surface,
      fontSize: 16,
      fontWeight: '600',
    },
    rejectButton: {
      flex: 1,
      backgroundColor: '#F44336',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    rejectButtonText: {
      color: semantic.surface,
      fontSize: 16,
      fontWeight: '600',
    },
    applicationsGrid: {
      ...(Platform.OS === 'web'
        ? ({
            display: 'grid' as any,
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: isMobile ? '12px' : '24px',
            padding: isMobile ? 12 : 24,
          } as any)
        : {
            padding: 20,
          }),
      maxWidth: Platform.OS === 'web' ? 1400 : '100%',
      alignSelf: 'center',
      width: '100%',
    },
    modernApplicationCard: {
      backgroundColor: semantic.surface,
      borderRadius: Platform.OS === 'web' ? 20 : 16,
      padding: Platform.OS === 'web' ? 24 : 20,
      marginBottom: Platform.OS === 'web' ? 0 : 20,
      borderWidth: 1,
      borderColor: semantic.border,
      ...(Platform.OS === 'web'
        ? ({
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
            transition: 'all 0.3s ease',
            cursor: 'default' as any,
            ':hover': {
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
              transform: 'translateY(-2px)',
              borderColor: colors.primary[200],
            },
          } as any)
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }),
    },
    modernApplicationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Platform.OS === 'web' ? 18 : 16,
    },
    modernApplicationHeaderLeft: {
      flex: 1,
      marginRight: 12,
    },
    modernApplicationJobTitle: {
      fontSize: Platform.OS === 'web' ? 22 : 20,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: Platform.OS === 'web' ? 8 : 6,
      letterSpacing: Platform.OS === 'web' ? -0.3 : 0,
      lineHeight: Platform.OS === 'web' ? 28 : 26,
    },
    modernApplicationProviderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    modernApplicationProviderIcon: {
      fontSize: Platform.OS === 'web' ? 16 : 14,
      marginRight: 6,
    },
    modernApplicationProvider: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: semantic.textSecondary,
      fontWeight: '500',
    },
    modernApplicationStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
      paddingVertical: Platform.OS === 'web' ? 6 : 5,
      borderRadius: Platform.OS === 'web' ? 20 : 16,
      borderWidth: 1,
    },
    modernApplicationStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    modernApplicationStatusText: {
      fontSize: Platform.OS === 'web' ? 12 : 11,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    modernApplicationInfoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Platform.OS === 'web' ? 16 : 12,
      marginBottom: Platform.OS === 'web' ? 18 : 16,
      paddingBottom: Platform.OS === 'web' ? 18 : 16,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    modernApplicationInfoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? {
            width: 'calc(50% - 8px)' as any,
            flexShrink: 0,
          }
        : {
            flex: 1,
          }),
      minWidth: Platform.OS === 'web' ? 180 : '100%',
    },
    modernApplicationInfoIcon: {
      fontSize: Platform.OS === 'web' ? 18 : 16,
      marginRight: Platform.OS === 'web' ? 10 : 8,
    },
    modernApplicationInfoTextContainer: {
      flex: 1,
    },
    modernApplicationInfoLabel: {
      fontSize: Platform.OS === 'web' ? 11 : 10,
      color: semantic.textMuted,
      fontWeight: '500',
      marginBottom: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    modernApplicationInfoValue: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: semantic.textPrimary,
      fontWeight: '600',
    },
    modernRejectionNoteContainer: {
      backgroundColor: '#FEF2F2',
      borderLeftWidth: 4,
      borderLeftColor: semantic.error,
      borderRadius: Platform.OS === 'web' ? 12 : 10,
      padding: Platform.OS === 'web' ? 16 : 14,
      marginBottom: Platform.OS === 'web' ? 18 : 16,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 1px 3px rgba(239, 68, 68, 0.1)',
          }
        : {}),
    },
    modernRejectionNoteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Platform.OS === 'web' ? 8 : 6,
    },
    modernRejectionNoteIcon: {
      fontSize: Platform.OS === 'web' ? 18 : 16,
      marginRight: Platform.OS === 'web' ? 8 : 6,
    },
    modernRejectionNoteLabel: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      fontWeight: '600',
      color: colors.error[600],
    },
    modernRejectionNoteText: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: '#991B1B',
      lineHeight: Platform.OS === 'web' ? 22 : 20,
    },
    modernApplicationDescription: {
      marginTop: Platform.OS === 'web' ? 4 : 0,
    },
    modernApplicationDescriptionText: {
      fontSize: Platform.OS === 'web' ? 15 : 14,
      color: colors.neutral[600],
      lineHeight: Platform.OS === 'web' ? 24 : 22,
    },
    applicationCard: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }
        : {
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }),
    },
    applicationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    applicationHeaderLeft: {
      flex: 1,
    },
    applicationJobTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: 4,
    },
    applicationProvider: {
      fontSize: 14,
      color: semantic.textSecondary,
    },
    applicationDetails: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    applicationDetailLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textSecondary,
      marginRight: 8,
    },
    applicationDetailValue: {
      fontSize: 14,
      color: semantic.textPrimary,
    },
    rejectionNoteContainer: {
      backgroundColor: semantic.errorLight,
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
      marginBottom: 8,
    },
    rejectionNoteLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.error,
      marginBottom: 4,
    },
    rejectionNoteText: {
      fontSize: 14,
      color: '#991B1B',
      lineHeight: 20,
    },
    applicationDescription: {
      marginTop: 8,
    },
    applicationDescriptionText: {
      fontSize: 14,
      color: semantic.textSecondary,
      lineHeight: 20,
    },
  });
