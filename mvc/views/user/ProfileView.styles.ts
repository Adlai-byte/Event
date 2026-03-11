import { StyleSheet, Platform } from 'react-native';

export const createStyles = (isMobile: boolean, screenWidth: number, screenHeight: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },
    scrollView: {
      flex: 1,
    },
    contentWrapper: {
      flex: 1,
      ...(Platform.OS === 'web'
        ? {
            alignItems: 'center',
            paddingVertical: 20,
          }
        : {}),
    },
    content: {
      ...(Platform.OS === 'web'
        ? {
            width: '100%',
            maxWidth: 800,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            marginHorizontal: 'auto',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {
            width: '100%',
          }),
    },
    modernProfileSection: {
      backgroundColor: Platform.OS === 'web' ? 'transparent' : '#FFFFFF',
      margin: Platform.OS === 'web' ? 0 : isMobile ? 12 : 20,
      marginBottom: Platform.OS === 'web' ? 24 : isMobile ? 12 : 20,
      borderRadius: Platform.OS === 'web' ? 0 : 16,
      padding: Platform.OS === 'web' ? 0 : isMobile ? 20 : 24,
      flexDirection: Platform.OS === 'web' ? 'row' : isMobile ? 'column' : 'row',
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? {}
        : {
            borderWidth: 1,
            borderColor: '#E2E8F0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }),
    },
    modernAvatarContainer: {
      position: 'relative',
      marginRight: Platform.OS === 'web' ? 24 : isMobile ? 0 : 20,
      marginBottom: Platform.OS === 'web' ? 0 : isMobile ? 16 : 0,
    },
    modernAvatarPlaceholder: {
      width: Platform.OS === 'web' ? 100 : isMobile ? 80 : 90,
      height: Platform.OS === 'web' ? 100 : isMobile ? 80 : 90,
      borderRadius: Platform.OS === 'web' ? 50 : isMobile ? 40 : 45,
      backgroundColor: '#0F172A',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    modernAvatarText: {
      fontSize: Platform.OS === 'web' ? 40 : 32,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    modernAvatarImage: {
      width: Platform.OS === 'web' ? 100 : isMobile ? 80 : 90,
      height: Platform.OS === 'web' ? 100 : isMobile ? 80 : 90,
      borderRadius: Platform.OS === 'web' ? 50 : isMobile ? 40 : 45,
    },
    modernVerifiedBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: Platform.OS === 'web' ? 32 : 28,
      height: Platform.OS === 'web' ? 32 : 28,
      borderRadius: Platform.OS === 'web' ? 16 : 14,
      backgroundColor: '#22C55E',
      borderWidth: 3,
      borderColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modernVerifiedIcon: {
      fontSize: Platform.OS === 'web' ? 16 : 14,
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    modernUserInfo: {
      flex: 1,
      alignItems: Platform.OS === 'web' ? 'flex-start' : isMobile ? 'center' : 'flex-start',
    },
    modernUserName: {
      fontSize: Platform.OS === 'web' ? 28 : isMobile ? 22 : 24,
      fontWeight: '700',
      color: '#0F172A',
      marginBottom: Platform.OS === 'web' ? 8 : 6,
      letterSpacing: Platform.OS === 'web' ? -0.5 : 0,
    },
    modernUserEmailContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    modernUserEmailIcon: {
      fontSize: Platform.OS === 'web' ? 16 : 14,
      marginRight: 6,
    },
    modernUserEmail: {
      fontSize: Platform.OS === 'web' ? 16 : isMobile ? 14 : 15,
      color: '#64748B',
      fontWeight: '500',
    },
    profileSection: {
      backgroundColor: '#FFFFFF',
      margin: isMobile ? 12 : 20,
      borderRadius: 16,
      padding: isMobile ? 16 : 24,
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'center' : 'center',
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
    avatarContainer: {
      width: isMobile ? 70 : 80,
      height: isMobile ? 70 : 80,
      borderRadius: isMobile ? 35 : 40,
      backgroundColor: '#0F172A',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: isMobile ? 0 : 20,
      marginBottom: isMobile ? 12 : 0,
      overflow: 'hidden',
    },
    avatarText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    avatarImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: isMobile ? 20 : 24,
      fontWeight: 'bold',
      color: '#0F172A',
      marginBottom: 4,
      textAlign: isMobile ? 'center' : 'left',
    },
    userEmail: {
      fontSize: isMobile ? 14 : 16,
      color: '#64748B',
      marginBottom: 8,
      textAlign: isMobile ? 'center' : 'left',
    },
    verifiedBadge: {
      backgroundColor: '#E8F5E8',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    verifiedText: {
      fontSize: 12,
      color: '#34C759',
      fontWeight: '600',
    },
    modernSection: {
      marginHorizontal: Platform.OS === 'web' ? 0 : isMobile ? 16 : 24,
      marginBottom: Platform.OS === 'web' ? 32 : isMobile ? 24 : 32,
      marginTop: Platform.OS === 'web' ? 24 : isMobile ? 16 : 24,
    },
    modernSectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: Platform.OS === 'web' ? 20 : 16,
      paddingBottom: Platform.OS === 'web' ? 12 : 10,
      borderBottomWidth: 0,
      borderBottomColor: 'transparent',
      alignSelf: 'flex-start',
      paddingRight: Platform.OS === 'web' ? 24 : 20,
      marginLeft: Platform.OS === 'web' ? 0 : 0,
      letterSpacing: Platform.OS === 'web' ? -0.4 : -0.2,
    },
    modernSectionCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: Platform.OS === 'web' ? 4 : 8,
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
    section: {
      marginHorizontal: isMobile ? 16 : 24,
      marginBottom: isMobile ? 24 : 32,
      marginTop: isMobile ? 16 : 24,
      paddingHorizontal: isMobile ? 20 : 24,
      paddingVertical: isMobile ? 20 : 24,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
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
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: Platform.OS === 'web' ? 20 : 16,
      paddingBottom: Platform.OS === 'web' ? 12 : 10,
      borderBottomWidth: 0,
      borderBottomColor: 'transparent',
      alignSelf: 'flex-start',
      paddingRight: Platform.OS === 'web' ? 24 : 20,
      letterSpacing: Platform.OS === 'web' ? -0.3 : -0.2,
    },
    modernApplyProviderButton: {
      backgroundColor: '#0F172A',
      borderRadius: Platform.OS === 'web' ? 16 : 14,
      padding: Platform.OS === 'web' ? 20 : 16,
      marginTop: Platform.OS === 'web' ? 8 : 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }),
    },
    modernApplyProviderIconContainer: {
      width: Platform.OS === 'web' ? 48 : 44,
      height: Platform.OS === 'web' ? 48 : 44,
      borderRadius: Platform.OS === 'web' ? 24 : 22,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Platform.OS === 'web' ? 16 : 14,
    },
    modernApplyProviderIcon: {
      fontSize: Platform.OS === 'web' ? 24 : 22,
    },
    modernApplyProviderTextContainer: {
      flex: 1,
    },
    modernApplyProviderTitle: {
      fontSize: Platform.OS === 'web' ? 18 : isMobile ? 15 : 16,
      fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: Platform.OS === 'web' ? 4 : 2,
    },
    modernApplyProviderSubtitle: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: 'rgba(255, 255, 255, 0.9)',
    },
    applyProviderButton: {
      backgroundColor: '#0F172A',
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    applyProviderIcon: {
      fontSize: 24,
      marginRight: 16,
    },
    applyProviderTextContainer: {
      flex: 1,
    },
    applyProviderTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: 2,
    },
    applyProviderSubtitle: {
      fontSize: 14,
      color: '#E0E0FF',
    },
    modernMenuButton: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: Platform.OS === 'web' ? 18 : isMobile ? 14 : 16,
      marginBottom: Platform.OS === 'web' ? 4 : 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }
        : {}),
    },
    modernMenuButtonLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    modernMenuIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Platform.OS === 'web' ? 16 : 14,
    },
    modernMenuIcon: {
      fontSize: Platform.OS === 'web' ? 22 : 20,
    },
    modernMenuTextContainer: {
      flex: 1,
    },
    modernMenuTitle: {
      fontSize: Platform.OS === 'web' ? 17 : isMobile ? 15 : 16,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: Platform.OS === 'web' ? 4 : 2,
    },
    modernMenuSubtitle: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: '#64748B',
      lineHeight: Platform.OS === 'web' ? 20 : 18,
    },
    modernMenuButtonRight: {
      marginLeft: 12,
    },
    modernArrowIcon: {
      fontSize: Platform.OS === 'web' ? 24 : 20,
      color: '#94A3B8',
      fontWeight: 'bold',
    },
    menuButton: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: isMobile ? 12 : 16,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    menuButtonLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuIcon: {
      fontSize: 24,
      marginRight: 16,
      width: 30,
      textAlign: 'center',
    },
    menuTextContainer: {
      flex: 1,
    },
    menuTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: 2,
    },
    menuSubtitle: {
      fontSize: 14,
      color: '#64748B',
    },
    menuButtonRight: {
      marginLeft: 12,
    },
    arrowIcon: {
      fontSize: 20,
      color: '#94A3B8',
      fontWeight: 'bold',
    },
    modernLogoutButton: {
      backgroundColor: '#EF4444',
      borderRadius: Platform.OS === 'web' ? 16 : 14,
      padding: Platform.OS === 'web' ? 18 : 16,
      alignItems: 'center',
      marginTop: Platform.OS === 'web' ? 0 : 20,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }),
    },
    modernLogoutButtonText: {
      color: '#FFFFFF',
      fontSize: Platform.OS === 'web' ? 17 : 16,
      fontWeight: '600',
      letterSpacing: Platform.OS === 'web' ? 0.3 : 0,
    },
    logoutButton: {
      backgroundColor: '#EF4444',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 20,
    },
    logoutButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    bottomSpacing: {
      height: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Math.max(10, screenWidth * 0.05),
    },
    modalContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      width: '100%',
      maxWidth: Math.min(500, screenWidth * 0.95),
      maxHeight: '90%',
      marginHorizontal: 10,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 16,
            elevation: 6,
          }),
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
      fontWeight: '700',
      color: '#0F172A',
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#F8FAFC',
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButtonText: {
      fontSize: 18,
      color: '#64748B',
      fontWeight: 'bold',
    },
    modalBody: {
      padding: 20,
      maxHeight: screenHeight * 0.6,
    },
    documentSection: {
      marginBottom: 24,
    },
    documentSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: 12,
    },
    modalDescription: {
      fontSize: 14,
      color: '#64748B',
      lineHeight: 20,
      marginBottom: 12,
    },
    modalNote: {
      fontSize: 12,
      color: '#2563EB',
      fontWeight: '600',
      marginBottom: 20,
    },
    documentPreviewContainer: {
      marginBottom: 12,
      alignItems: 'center',
    },
    documentPreview: {
      width: '100%',
      height: 200,
      borderRadius: 12,
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      marginBottom: 12,
    },
    removeDocumentButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: '#EF4444',
    },
    removeDocumentText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    uploadButton: {
      backgroundColor: '#0F172A',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 20,
    },
    uploadButtonDisabled: {
      opacity: 0.6,
    },
    uploadButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    modalFooter: {
      flexDirection: 'row',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    cancelButtonText: {
      color: '#64748B',
      fontSize: 16,
      fontWeight: '600',
    },
    submitButton: {
      flex: 1,
      backgroundColor: '#0F172A',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    modernRejectionNotice: {
      backgroundColor: '#FFFBEB',
      borderWidth: 1,
      borderColor: '#FDE68A',
      borderRadius: Platform.OS === 'web' ? 16 : 14,
      padding: Platform.OS === 'web' ? 18 : 16,
      marginTop: Platform.OS === 'web' ? 8 : 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {}),
    },
    modernRejectionIconContainer: {
      width: Platform.OS === 'web' ? 44 : 40,
      height: Platform.OS === 'web' ? 44 : 40,
      borderRadius: Platform.OS === 'web' ? 22 : 20,
      backgroundColor: '#FFFBEB',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Platform.OS === 'web' ? 16 : 14,
    },
    modernRejectionIcon: {
      fontSize: Platform.OS === 'web' ? 22 : 20,
    },
    modernRejectionTextContainer: {
      flex: 1,
    },
    modernRejectionTitle: {
      fontSize: Platform.OS === 'web' ? 17 : isMobile ? 15 : 16,
      fontWeight: '600',
      color: '#92400E',
      marginBottom: Platform.OS === 'web' ? 4 : 2,
    },
    modernRejectionSubtitle: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: '#B45309',
      lineHeight: Platform.OS === 'web' ? 20 : 18,
    },
    rejectionNotice: {
      backgroundColor: '#FFF3CD',
      borderWidth: 1,
      borderColor: '#FFC107',
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rejectionIcon: {
      fontSize: 24,
      marginRight: 16,
    },
    rejectionTextContainer: {
      flex: 1,
    },
    rejectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#856404',
      marginBottom: 2,
    },
    rejectionSubtitle: {
      fontSize: 14,
      color: '#856404',
      opacity: 0.8,
    },
    rejectionModalContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      width: '100%',
      maxWidth: 500,
      maxHeight: '90%',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 16,
            elevation: 6,
          }),
    },
    rejectionModalBody: {
      padding: 20,
    },
    rejectionModalDescription: {
      fontSize: 14,
      color: '#64748B',
      lineHeight: 20,
      marginBottom: 20,
    },
    rejectionReasonBox: {
      backgroundColor: '#FFF3CD',
      borderWidth: 1,
      borderColor: '#FFC107',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    rejectionReasonLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#856404',
      marginBottom: 8,
    },
    rejectionReasonText: {
      fontSize: 14,
      color: '#856404',
      lineHeight: 20,
    },
    rejectionModalNote: {
      fontSize: 12,
      color: '#64748B',
      fontStyle: 'italic',
      textAlign: 'center',
    },
    closeModalButton: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    closeModalButtonText: {
      color: '#64748B',
      fontSize: 16,
      fontWeight: '600',
    },
    reapplyButton: {
      flex: 1,
      backgroundColor: '#0F172A',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
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
    reapplyButtonIcon: {
      fontSize: 18,
      marginRight: 8,
    },
    reapplyButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    modernPendingNotice: {
      backgroundColor: '#EFF6FF',
      borderWidth: 1,
      borderColor: '#BFDBFE',
      borderRadius: Platform.OS === 'web' ? 16 : 14,
      padding: Platform.OS === 'web' ? 18 : 16,
      marginTop: Platform.OS === 'web' ? 8 : 8,
      flexDirection: 'row',
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {}),
    },
    modernPendingIconContainer: {
      width: Platform.OS === 'web' ? 44 : 40,
      height: Platform.OS === 'web' ? 44 : 40,
      borderRadius: Platform.OS === 'web' ? 22 : 20,
      backgroundColor: '#DBEAFE',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Platform.OS === 'web' ? 16 : 14,
    },
    modernPendingIcon: {
      fontSize: Platform.OS === 'web' ? 22 : 20,
    },
    modernPendingTextContainer: {
      flex: 1,
    },
    modernPendingTitle: {
      fontSize: Platform.OS === 'web' ? 17 : isMobile ? 15 : 16,
      fontWeight: '600',
      color: '#1E40AF',
      marginBottom: Platform.OS === 'web' ? 4 : 2,
    },
    modernPendingSubtitle: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: '#3B82F6',
      lineHeight: Platform.OS === 'web' ? 20 : 18,
    },
    pendingNotice: {
      backgroundColor: '#E3F2FD',
      borderWidth: 1,
      borderColor: '#2196F3',
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    pendingIcon: {
      fontSize: 24,
      marginRight: 16,
    },
    pendingTextContainer: {
      flex: 1,
    },
    pendingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1976D2',
      marginBottom: 2,
    },
    pendingSubtitle: {
      fontSize: 14,
      color: '#1976D2',
      opacity: 0.8,
    },
  });
