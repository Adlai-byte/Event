import { StyleSheet, Platform } from 'react-native';
import { colors, semantic } from '../../theme';

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
      backgroundColor: semantic.success,
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
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 10,
          }),
    },
    successTooltipIcon: {
      fontSize: 20,
      marginRight: 12,
      color: semantic.surface,
      fontWeight: 'bold',
    },
    successTooltipText: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.surface,
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
      color: semantic.surface,
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
      backgroundColor: semantic.error,
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
      fontSize: 14,
      fontWeight: '600',
      color: semantic.surface,
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
      color: semantic.surface,
      lineHeight: 20,
    },
    container: {
      flex: 1,
      backgroundColor: semantic.background,
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
      backgroundColor: semantic.primary,
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
      color: semantic.surface,
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
            backgroundColor: semantic.surface,
            borderRadius: 12,
            marginHorizontal: 'auto',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
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
      backgroundColor: colors.error[50],
      borderRadius: 12,
      marginHorizontal: -20,
      marginTop: -10,
    },
    avatarContainer: {
      width: isMobile ? 80 : 100,
      height: isMobile ? 80 : 100,
      borderRadius: isMobile ? 40 : 50,
      backgroundColor: semantic.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    avatarText: {
      fontSize: isMobile ? 32 : 40,
      fontWeight: 'bold',
      color: semantic.surface,
    },
    avatarImage: {
      width: isMobile ? 80 : 100,
      height: isMobile ? 80 : 100,
      borderRadius: isMobile ? 40 : 50,
    },
    changePhotoButton: {
      backgroundColor: semantic.background,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: semantic.primary,
    },
    changePhotoText: {
      color: semantic.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    section: {
      borderRadius: 16,
      padding: isMobile ? 16 : 20,
      marginBottom: 20,
      borderWidth: 1,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }),
    },
    sectionTitle: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: 'bold',
      color: semantic.textPrimary,
      marginBottom: 20,
    },
    fieldContainer: {
      marginBottom: 16,
      padding: 12,
      borderRadius: 8,
      backgroundColor: semantic.surface,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 8,
    },
    fieldInput: {
      backgroundColor: semantic.background,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: semantic.textPrimary,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    emailFieldHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    readOnlyBadge: {
      backgroundColor: colors.warning[50],
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.warning[100],
    },
    readOnlyBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.warning[600],
    },
    emailInputContainer: {
      position: 'relative',
    },
    emailInputDisabled: {
      backgroundColor: semantic.background,
      color: semantic.textSecondary,
      borderColor: semantic.border,
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
      color: semantic.textSecondary,
      marginTop: 6,
      fontStyle: 'italic',
    },
    // Modern Account Information Styles
    accountSection: {
      marginBottom: 20,
      padding: isMobile ? 16 : 20,
      borderRadius: 12,
      backgroundColor: colors.error[50],
      borderWidth: 1,
      borderColor: colors.error[50],
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
      backgroundColor: semantic.background,
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
      color: semantic.textPrimary,
      letterSpacing: -0.5,
    },
    accountCard: {
      backgroundColor: semantic.surface,
      borderRadius: 16,
      padding: 20,
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.error[50],
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
          }),
    },
    accountInfoItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: semantic.background,
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
      backgroundColor: semantic.background,
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
      color: semantic.textPrimary,
      flex: 1,
    },
    accountInfoRight: {
      alignItems: 'flex-end',
    },
    accountInfoValue: {
      fontSize: 15,
      fontWeight: '600',
      color: semantic.textPrimary,
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
      backgroundColor: semantic.primary,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            ':hover': {
              backgroundColor: colors.primary[700],
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(108, 99, 255, 0.3)',
            },
          }
        : {}),
      ...(Platform.OS !== 'web'
        ? {
            shadowColor: semantic.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }
        : {}),
    },
    modernVerifyButtonDisabled: {
      opacity: 0.6,
      ...(Platform.OS === 'web'
        ? ({
            cursor: 'not-allowed' as any,
            ':hover': {
              backgroundColor: semantic.primary,
              transform: 'none',
              boxShadow: 'none',
            },
          } as any)
        : {}),
    },
    modernVerifyButtonIcon: {
      fontSize: 18,
      marginRight: 8,
    },
    modernVerifyButtonText: {
      color: semantic.surface,
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    modernCheckButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: semantic.success,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            ':hover': {
              backgroundColor: colors.success[600],
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            },
          }
        : {}),
      ...(Platform.OS !== 'web'
        ? {
            shadowColor: semantic.success,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }
        : {}),
    },
    modernCheckButtonDisabled: {
      opacity: 0.6,
      ...(Platform.OS === 'web'
        ? ({
            cursor: 'not-allowed' as any,
            ':hover': {
              backgroundColor: semantic.success,
              transform: 'none',
              boxShadow: 'none',
            },
          } as any)
        : {}),
    },
    modernCheckButtonIcon: {
      fontSize: 18,
      marginRight: 8,
    },
    modernCheckButtonText: {
      color: semantic.surface,
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
      backgroundColor: semantic.background,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginRight: 10,
      marginBottom: isExtraSmall ? 10 : 0,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    cancelButtonText: {
      color: semantic.textSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
    saveButton: {
      flex: 1,
      backgroundColor: semantic.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginLeft: 10,
    },
    saveButtonText: {
      color: semantic.surface,
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
            boxShadow: '0 2px 8px rgba(108, 99, 255, 0.15)',
          }
        : {
            marginBottom: 20,
            shadowColor: semantic.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 3,
          }),
    },
    bottomColoredContent: {
      backgroundColor: colors.primary[50],
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary[100],
    },
    bottomColoredText: {
      fontSize: 14,
      color: semantic.primary,
      textAlign: 'center',
      fontWeight: '500',
      lineHeight: 20,
    },
    bottomSpacing: {
      height: 20,
    },
  });
};
