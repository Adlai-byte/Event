import { StyleSheet, Platform } from 'react-native';

export const createStyles = (isMobile: boolean, screenWidth: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: '#2563EB',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    addButton: {
      backgroundColor: '#0F172A',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    modernTabContainer: {
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
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
            cursor: 'pointer',
          }
        : {}),
    },
    modernActiveTab: {
      borderBottomColor: '#2563EB',
      backgroundColor: Platform.OS === 'web' ? '#F8FAFC' : 'transparent',
    },
    modernTabText: {
      fontSize: Platform.OS === 'web' ? 15 : 16,
      color: '#64748B',
      fontWeight: '500',
      letterSpacing: Platform.OS === 'web' ? 0.3 : 0,
    },
    modernActiveTabText: {
      color: '#2563EB',
      fontWeight: '600',
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    tab: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: '#2563EB',
    },
    tabText: {
      fontSize: 16,
      color: '#64748B',
      fontWeight: '500',
    },
    activeTabText: {
      color: '#2563EB',
      fontWeight: '600',
    },
    content: {
      flex: 1,
      padding: Platform.OS === 'web' ? 0 : 20,
      paddingTop: Platform.OS === 'web' ? 0 : 10,
      paddingBottom: Platform.OS === 'web' ? 0 : 10,
      backgroundColor: '#F8FAFC',
    },
    requestCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
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
      color: '#0F172A',
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },
    requestDescription: {
      fontSize: 14,
      color: '#64748B',
      marginBottom: 12,
      lineHeight: 20,
    },
    requestDetails: {
      marginBottom: 12,
    },
    requestDetail: {
      fontSize: 14,
      color: '#64748B',
      marginBottom: 4,
    },
    requirementsContainer: {
      marginBottom: 12,
    },
    requirementsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: 4,
    },
    requirementItem: {
      fontSize: 14,
      color: '#64748B',
      marginBottom: 2,
    },
    proposeButton: {
      backgroundColor: '#0F172A',
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    proposeButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    publishButton: {
      backgroundColor: '#0F172A',
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    publishButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    proposalCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }),
    },
    jobPostingsGrid: {
      ...(Platform.OS === 'web'
        ? ({
            display: 'grid' as any,
            gridTemplateColumns: isMobile
              ? '1fr'
              : screenWidth < 900
                ? '1fr'
                : 'repeat(auto-fill, minmax(400px, 1fr))',
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
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: Platform.OS === 'web' ? 24 : 20,
      marginBottom: Platform.OS === 'web' ? 0 : 20,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? ({
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
            cursor: 'default' as any,
          } as any)
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
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
      color: '#0F172A',
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
      color: '#64748B',
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
      borderColor: '#DCFCE7',
    },
    modernStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#10B981',
      marginRight: 6,
    },
    modernStatusText: {
      fontSize: Platform.OS === 'web' ? 12 : 11,
      color: '#059669',
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    modernJobDescription: {
      fontSize: Platform.OS === 'web' ? 15 : 14,
      color: '#475569',
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
      borderTopColor: '#E2E8F0',
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
      color: '#94A3B8',
      fontWeight: '500',
      marginBottom: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    modernJobInfoValue: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: '#0F172A',
      fontWeight: '600',
    },
    modernApplyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0F172A',
      paddingVertical: Platform.OS === 'web' ? 14 : 12,
      borderRadius: Platform.OS === 'web' ? 10 : 10,
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }),
    },
    modernApplyButtonText: {
      color: '#FFFFFF',
      fontSize: Platform.OS === 'web' ? 15 : 14,
      fontWeight: '600',
      marginRight: Platform.OS === 'web' ? 8 : 6,
      letterSpacing: 0.3,
    },
    modernApplyButtonIcon: {
      color: '#FFFFFF',
      fontSize: Platform.OS === 'web' ? 18 : 16,
      fontWeight: '600',
    },
    modernJobCardApplied: {
      opacity: 0.85,
      borderColor: '#CBD5E1',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
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
      backgroundColor: '#94A3B8',
      ...(Platform.OS === 'web'
        ? {
            cursor: 'not-allowed' as any,
            boxShadow: 'none',
          }
        : {
            shadowOpacity: 0,
            elevation: 0,
          }),
    },
    modernApplyButtonTextDisabled: {
      color: '#F1F5F9',
    },
    jobPostingCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
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
      color: '#0F172A',
      marginBottom: 4,
    },
    jobPostingProvider: {
      fontSize: 14,
      color: '#64748B',
    },
    jobPostingDescription: {
      fontSize: 14,
      color: '#0F172A',
      lineHeight: 20,
      marginBottom: 12,
    },
    jobPostingFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
    },
    jobPostingDeadline: {
      fontSize: 12,
      color: '#64748B',
      fontWeight: '500',
    },
    jobPostingDate: {
      fontSize: 12,
      color: '#94A3B8',
    },
    applyButton: {
      backgroundColor: '#0F172A',
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 12,
    },
    applyButtonText: {
      color: '#FFFFFF',
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
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
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
      borderBottomColor: '#E2E8F0',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#0F172A',
    },
    closeButton: {
      padding: 4,
    },
    closeButtonText: {
      fontSize: 24,
      color: '#64748B',
    },
    jobInfoContainer: {
      padding: 20,
      backgroundColor: '#F8FAFC',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    jobInfoTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#0F172A',
      marginBottom: 8,
    },
    jobInfoDescription: {
      fontSize: 14,
      color: '#64748B',
      marginBottom: 8,
    },
    jobInfoDeadline: {
      fontSize: 12,
      color: '#64748B',
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
      color: '#0F172A',
      marginBottom: 8,
    },
    helperText: {
      fontSize: 12,
      color: '#94A3B8',
      marginBottom: 8,
      fontStyle: 'italic',
    },
    filePickerButton: {
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
    },
    filePickerButtonText: {
      fontSize: 14,
      color: '#64748B',
    },
    removeFileButton: {
      marginTop: 8,
      padding: 8,
      alignItems: 'center',
    },
    removeFileButtonText: {
      fontSize: 12,
      color: '#EF4444',
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
    },
    modalButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 10,
    },
    cancelButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    cancelButtonText: {
      color: '#334155',
      fontSize: 14,
      fontWeight: '600',
    },
    submitButton: {
      backgroundColor: '#0F172A',
    },
    submitButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      backgroundColor: '#94A3B8',
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    errorContainer: {
      backgroundColor: '#FEE2E2',
      borderLeftWidth: 4,
      borderLeftColor: '#EF4444',
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
      color: '#0F172A',
      flex: 1,
    },
    proposalDescription: {
      fontSize: 14,
      color: '#64748B',
      marginBottom: 12,
      lineHeight: 20,
    },
    proposalDetails: {
      marginBottom: 12,
    },
    proposalDetail: {
      fontSize: 14,
      color: '#64748B',
      marginBottom: 4,
    },
    deliverablesContainer: {
      marginBottom: 12,
    },
    deliverablesTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: 4,
    },
    deliverableItem: {
      fontSize: 14,
      color: '#64748B',
      marginBottom: 2,
    },
    feedbackContainer: {
      backgroundColor: '#F8FAFC',
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
    },
    feedbackTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: 4,
    },
    feedbackText: {
      fontSize: 14,
      color: '#64748B',
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
      backgroundColor: '#EFF6FF',
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
      color: '#0F172A',
      marginBottom: Platform.OS === 'web' ? 12 : 8,
      textAlign: 'center',
    },
    modernEmptySubtext: {
      fontSize: Platform.OS === 'web' ? 16 : 14,
      color: '#64748B',
      textAlign: 'center',
      maxWidth: Platform.OS === 'web' ? 400 : 300,
      lineHeight: Platform.OS === 'web' ? 24 : 20,
    },
    modernLoadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Platform.OS === 'web' ? 120 : 80,
      backgroundColor: '#F8FAFC',
    },
    modernLoadingText: {
      marginTop: Platform.OS === 'web' ? 20 : 16,
      fontSize: Platform.OS === 'web' ? 16 : 15,
      color: '#2563EB',
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
      color: '#64748B',
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: '#94A3B8',
      textAlign: 'center',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },
    modalCloseButton: {
      fontSize: 16,
      color: '#2563EB',
      fontWeight: '600',
    },
    modalSaveButton: {
      fontSize: 16,
      color: '#2563EB',
      fontWeight: '600',
    },
    formContainer: {
      flex: 1,
      padding: 20,
    },
    formLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: 8,
      marginTop: 16,
    },
    formInput: {
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
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
      backgroundColor: '#FFFFFF',
      paddingVertical: Platform.OS === 'web' ? 24 : 20,
      paddingHorizontal: Platform.OS === 'web' ? 40 : 20,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      maxWidth: Platform.OS === 'web' ? 1400 : '100%',
      alignSelf: 'center',
      width: '100%',
    },
    modernSearchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
      paddingVertical: Platform.OS === 'web' ? 4 : 4,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {}),
    },
    searchIcon: {
      fontSize: Platform.OS === 'web' ? 20 : 18,
      marginRight: Platform.OS === 'web' ? 12 : 10,
      color: '#64748B',
    },
    modernSearchInput: {
      flex: 1,
      fontSize: Platform.OS === 'web' ? 16 : 15,
      color: '#0F172A',
      paddingVertical: Platform.OS === 'web' ? 14 : 12,
      fontWeight: '500',
      backgroundColor: 'transparent',
    },
    clearSearchButton: {
      padding: Platform.OS === 'web' ? 6 : 4,
      marginLeft: Platform.OS === 'web' ? 8 : 6,
      borderRadius: 20,
      backgroundColor: '#E2E8F0',
      width: Platform.OS === 'web' ? 28 : 24,
      height: Platform.OS === 'web' ? 28 : 24,
      justifyContent: 'center',
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
          }
        : {}),
    },
    clearSearchText: {
      fontSize: Platform.OS === 'web' ? 14 : 12,
      color: '#64748B',
      fontWeight: '600',
    },
    filterContainer: {
      backgroundColor: '#FFFFFF',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    searchInput: {
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    filterScroll: {
      flexDirection: 'row',
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: '#F8FAFC',
      marginRight: 8,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    filterChipActive: {
      backgroundColor: '#0F172A',
      borderColor: '#0F172A',
    },
    filterChipText: {
      fontSize: 14,
      color: '#64748B',
      fontWeight: '500',
    },
    filterChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    eventSelector: {
      maxHeight: 150,
      marginBottom: 16,
    },
    eventOption: {
      padding: 12,
      backgroundColor: '#F8FAFC',
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    eventOptionSelected: {
      backgroundColor: '#EFF6FF',
      borderColor: '#2563EB',
    },
    eventOptionText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#0F172A',
    },
    eventOptionDate: {
      fontSize: 14,
      color: '#64748B',
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
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      alignItems: 'center',
    },
    locationTypeButtonActive: {
      backgroundColor: '#0F172A',
      borderColor: '#0F172A',
    },
    locationTypeText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#64748B',
    },
    locationTypeTextActive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    viewProposalsButton: {
      backgroundColor: '#0F172A',
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 8,
    },
    viewProposalsButtonText: {
      color: '#FFFFFF',
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
      backgroundColor: '#10B981',
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    acceptButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    rejectButton: {
      flex: 1,
      backgroundColor: '#EF4444',
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    rejectButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    applicationsGrid: {
      ...(Platform.OS === 'web'
        ? ({
            display: 'grid' as any,
            gridTemplateColumns: isMobile
              ? '1fr'
              : screenWidth < 900
                ? '1fr'
                : 'repeat(auto-fill, minmax(400px, 1fr))',
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
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: Platform.OS === 'web' ? 24 : 20,
      marginBottom: Platform.OS === 'web' ? 0 : 20,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? ({
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
            cursor: 'default' as any,
          } as any)
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
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
      color: '#0F172A',
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
      color: '#64748B',
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
      borderBottomColor: '#E2E8F0',
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
      color: '#94A3B8',
      fontWeight: '500',
      marginBottom: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    modernApplicationInfoValue: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: '#0F172A',
      fontWeight: '600',
    },
    modernRejectionNoteContainer: {
      backgroundColor: '#FEF2F2',
      borderLeftWidth: 4,
      borderLeftColor: '#EF4444',
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
      color: '#DC2626',
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
      color: '#475569',
      lineHeight: Platform.OS === 'web' ? 24 : 22,
    },
    applicationCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {
            elevation: 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
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
      color: '#0F172A',
      marginBottom: 4,
    },
    applicationProvider: {
      fontSize: 14,
      color: '#64748B',
    },
    applicationDetails: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    applicationDetailLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#64748B',
      marginRight: 8,
    },
    applicationDetailValue: {
      fontSize: 14,
      color: '#0F172A',
    },
    rejectionNoteContainer: {
      backgroundColor: '#FEE2E2',
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
      marginBottom: 8,
    },
    rejectionNoteLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#EF4444',
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
      color: '#64748B',
      lineHeight: 20,
    },
  });
