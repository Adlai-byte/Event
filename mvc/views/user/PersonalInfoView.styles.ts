import { StyleSheet, Platform } from 'react-native';

export const createStyles = (isMobile: boolean, screenWidth: number) => {
  const isExtraSmall = screenWidth < 360;
  return StyleSheet.create({
    successTooltip: {
      position: 'absolute',
      top: Platform.OS === 'web' ? 20 : 60,
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
    successTooltipContent: {
      backgroundColor: '#22C55E',
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      maxWidth: 600,
      width: '100%',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
            pointerEvents: 'auto',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 16,
            elevation: 6,
          }),
    },
    successTooltipIcon: {
      fontSize: 20,
      marginRight: 12,
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    successTooltipText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
      flex: 1,
      textAlign: 'center',
    },
    successTooltipClose: {
      marginLeft: 12,
      padding: 4,
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
          }
        : {}),
    },
    successTooltipCloseText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FFFFFF',
      lineHeight: 20,
    },
    errorTooltip: {
      position: 'absolute',
      top: Platform.OS === 'web' ? 20 : 60,
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
    errorTooltipContent: {
      backgroundColor: '#EF4444',
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      maxWidth: 600,
      width: '100%',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
            pointerEvents: 'auto',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 16,
            elevation: 6,
          }),
    },
    errorTooltipIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    errorTooltipText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
      flex: 1,
      textAlign: 'center',
    },
    errorTooltipClose: {
      marginLeft: 12,
      padding: 4,
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
          }
        : {}),
    },
    errorTooltipCloseText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FFFFFF',
      lineHeight: 20,
    },
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
      position: 'relative',
    },
    editButtonContainer: {
      alignItems: 'flex-end',
      marginBottom: 20,
      ...(Platform.OS === 'web'
        ? {
            marginTop: 10,
          }
        : {}),
    },
    editButton: {
      backgroundColor: '#0F172A',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
          }
        : {}),
    },
    editButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
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
      padding: isMobile ? 16 : 20,
      paddingTop: 10,
      ...(Platform.OS === 'web'
        ? {
            paddingBottom: 20,
            width: '100%',
            maxWidth: isMobile ? ('100%' as any) : 800,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            marginHorizontal: 'auto',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
            marginTop: 20,
            marginBottom: 20,
          }
        : {}),
    },
    profilePictureSection: {
      alignItems: 'center',
      marginBottom: 30,
      paddingVertical: 20,
      paddingHorizontal: 20,
      backgroundColor: '#F8FAFC',
      borderRadius: 12,
      marginHorizontal: -20,
      marginTop: -10,
    },
    avatarContainer: {
      width: isMobile ? 80 : 100,
      height: isMobile ? 80 : 100,
      borderRadius: isMobile ? 40 : 50,
      backgroundColor: '#0F172A',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    avatarText: {
      fontSize: isMobile ? 32 : 40,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    avatarImage: {
      width: isMobile ? 80 : 100,
      height: isMobile ? 80 : 100,
      borderRadius: isMobile ? 40 : 50,
    },
    changePhotoButton: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    changePhotoText: {
      color: '#0F172A',
      fontSize: 14,
      fontWeight: '600',
    },
    section: {
      borderRadius: 16,
      padding: isMobile ? 16 : 20,
      marginBottom: 20,
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
      fontSize: isMobile ? 16 : 18,
      fontWeight: 'bold',
      color: '#0F172A',
      marginBottom: 20,
    },
    fieldContainer: {
      marginBottom: 16,
      padding: 12,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: 8,
    },
    fieldInput: {
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: '#0F172A',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    emailFieldHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    readOnlyBadge: {
      backgroundColor: '#FFFBEB',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#FEF3C7',
    },
    readOnlyBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#D97706',
    },
    emailInputContainer: {
      position: 'relative',
    },
    emailInputDisabled: {
      backgroundColor: '#F8FAFC',
      color: '#64748B',
      borderColor: '#E2E8F0',
      opacity: 0.7,
    },
    emailInfoIcon: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: [{ translateY: -10 }],
    },
    emailInfoText: {
      fontSize: 16,
    },
    emailHelperText: {
      fontSize: 12,
      color: '#64748B',
      marginTop: 6,
      fontStyle: 'italic',
    },
    // Modern Account Information Styles
    accountSection: {
      marginBottom: 20,
      padding: isMobile ? 16 : 20,
      borderRadius: 12,
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    accountHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    accountIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    accountIcon: {
      fontSize: 20,
    },
    accountTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#0F172A',
      letterSpacing: -0.5,
    },
    accountCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      marginTop: 12,
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
    accountInfoItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F8FAFC',
    },
    accountInfoLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    accountInfoIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    accountInfoIcon: {
      fontSize: 16,
      fontWeight: '600',
    },
    accountInfoLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: '#0F172A',
      flex: 1,
    },
    accountInfoRight: {
      alignItems: 'flex-end',
    },
    accountInfoValue: {
      fontSize: 15,
      fontWeight: '600',
      color: '#0F172A',
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    statusBadgeText: {
      fontSize: 13,
      fontWeight: '600',
    },
    verificationActions: {
      flexDirection: 'column',
      gap: 10,
      marginTop: 8,
      marginBottom: 8,
      paddingTop: 12,
      paddingBottom: 4,
    },
    modernVerifyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0F172A',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }
        : {}),
      ...(Platform.OS !== 'web'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }
        : {}),
    },
    modernVerifyButtonDisabled: {
      opacity: 0.6,
      ...(Platform.OS === 'web'
        ? ({
            cursor: 'not-allowed' as any,
          } as any)
        : {}),
    },
    modernVerifyButtonIcon: {
      fontSize: 18,
      marginRight: 8,
    },
    modernVerifyButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    modernCheckButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#22C55E',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }
        : {}),
      ...(Platform.OS !== 'web'
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }
        : {}),
    },
    modernCheckButtonDisabled: {
      opacity: 0.6,
      ...(Platform.OS === 'web'
        ? ({
            cursor: 'not-allowed' as any,
          } as any)
        : {}),
    },
    modernCheckButtonIcon: {
      fontSize: 18,
      marginRight: 8,
    },
    modernCheckButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    actionButtons: {
      flexDirection: isExtraSmall ? ('column' as any) : ('row' as any),
      justifyContent: 'space-between',
      marginTop: 20,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginRight: 10,
      marginBottom: isExtraSmall ? 10 : 0,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    cancelButtonText: {
      color: '#64748B',
      fontSize: 16,
      fontWeight: '600',
    },
    saveButton: {
      flex: 1,
      backgroundColor: '#0F172A',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginLeft: 10,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    bottomColoredSection: {
      marginTop: 30,
      borderRadius: 12,
      overflow: 'hidden',
      ...(Platform.OS === 'web'
        ? {
            marginBottom: 0,
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }),
    },
    bottomColoredContent: {
      backgroundColor: '#EFF6FF',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#DBEAFE',
    },
    bottomColoredText: {
      fontSize: 14,
      color: '#2563EB',
      textAlign: 'center',
      fontWeight: '500',
      lineHeight: 20,
    },
    bottomSpacing: {
      height: 20,
    },
  });
};
