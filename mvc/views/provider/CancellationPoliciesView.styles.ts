import { StyleSheet, Platform } from 'react-native';
import { colors, semantic } from '../../theme';

export const createStyles = (isMobile: boolean, screenWidth: number) => {
  const isExtraSmall = screenWidth < 360;

  return StyleSheet.create({
    main: {
      flex: 1,
    },
    mainContent: {
      padding: isMobile ? 12 : 20,
      paddingBottom: isMobile ? 20 : 20,
    },

    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: isMobile ? 12 : 20,
      flexWrap: 'wrap',
      gap: 8,
    },
    headerTextContainer: {
      flex: 1,
      minWidth: 200,
    },
    headerTitle: {
      fontSize: isMobile ? (isExtraSmall ? 20 : 24) : 32,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: isMobile ? (isExtraSmall ? 12 : 14) : 16,
      color: semantic.textSecondary,
    },

    // Create button in header
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: semantic.primary,
      paddingVertical: isMobile ? 10 : 12,
      paddingHorizontal: isMobile ? 14 : 20,
      borderRadius: 8,
      gap: 6,
    } as any,
    createButtonText: {
      fontSize: isMobile ? 13 : 14,
      fontWeight: '600',
      color: semantic.surface,
    },

    // Policy cards
    policyCard: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: isMobile ? 12 : 16,
      marginBottom: isMobile ? 10 : 14,
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
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: isMobile ? 10 : 12,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 8,
    } as any,
    cardTitle: {
      fontSize: isMobile ? (isExtraSmall ? 15 : 16) : 18,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
    depositBadge: {
      backgroundColor: colors.primary[50],
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary[200],
    },
    depositBadgeText: {
      fontSize: isExtraSmall ? 11 : 12,
      fontWeight: '600',
      color: colors.primary[700],
    },
    cardActions: {
      flexDirection: 'row',
      gap: 8,
    } as any,

    // Rules table
    rulesTable: {
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      overflow: 'hidden',
    },
    rulesHeaderRow: {
      flexDirection: 'row',
      backgroundColor: semantic.background,
      paddingVertical: 8,
      paddingHorizontal: isMobile ? 10 : 14,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    rulesHeaderText: {
      fontSize: isExtraSmall ? 11 : 12,
      fontWeight: '700',
      color: semantic.textSecondary,
      textTransform: 'uppercase',
    },
    ruleRow: {
      flexDirection: 'row',
      paddingVertical: isMobile ? 8 : 10,
      paddingHorizontal: isMobile ? 10 : 14,
      borderBottomWidth: 1,
      borderBottomColor: semantic.borderLight,
    },
    ruleRowLast: {
      borderBottomWidth: 0,
    },
    ruleColDays: {
      flex: 1,
    },
    ruleColRefund: {
      flex: 1,
    },
    ruleText: {
      fontSize: isMobile ? 13 : 14,
      color: semantic.textPrimary,
    },
    ruleTextHighlight: {
      fontWeight: '600',
      color: colors.success[600],
    },
    ruleTextWarning: {
      fontWeight: '600',
      color: colors.warning[600],
    },
    ruleTextDanger: {
      fontWeight: '600',
      color: colors.error[600],
    },

    // Edit / Delete buttons
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary[50],
      paddingVertical: 6,
      paddingHorizontal: isMobile ? 10 : 12,
      borderRadius: 6,
      gap: 4,
    } as any,
    editButtonText: {
      fontSize: isExtraSmall ? 12 : 13,
      fontWeight: '600',
      color: semantic.primary,
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.error[50],
      paddingVertical: 6,
      paddingHorizontal: isMobile ? 10 : 12,
      borderRadius: 6,
      gap: 4,
    } as any,
    deleteButtonText: {
      fontSize: isExtraSmall ? 12 : 13,
      fontWeight: '600',
      color: semantic.error,
    },

    // Form container
    formContainer: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: isMobile ? 14 : 20,
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
    formTitle: {
      fontSize: isMobile ? 18 : 22,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: isMobile ? 14 : 20,
    },

    // Form fields
    formField: {
      marginBottom: isMobile ? 14 : 18,
    },
    formLabel: {
      fontSize: isMobile ? 13 : 14,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 6,
    },
    formInput: {
      backgroundColor: semantic.background,
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: isMobile ? 10 : 12,
      fontSize: isMobile ? 14 : 15,
      color: semantic.textPrimary,
    },
    formHint: {
      fontSize: 12,
      color: semantic.textMuted,
      marginTop: 4,
    },

    // Rules editor section
    rulesEditorSection: {
      marginBottom: isMobile ? 14 : 18,
    },
    rulesEditorHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    ruleEditorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isMobile ? 6 : 10,
      marginBottom: 8,
    } as any,
    ruleEditorInput: {
      flex: 1,
      backgroundColor: semantic.background,
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      paddingHorizontal: isMobile ? 8 : 12,
      paddingVertical: isMobile ? 8 : 10,
      fontSize: isMobile ? 13 : 14,
      color: semantic.textPrimary,
      textAlign: 'center',
    },
    ruleEditorLabel: {
      fontSize: isExtraSmall ? 11 : 12,
      color: semantic.textSecondary,
      fontWeight: '600',
      marginBottom: 4,
    },
    ruleEditorFieldGroup: {
      flex: 1,
    },
    removeRuleButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.error[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: isExtraSmall ? 14 : 16,
    },
    addRuleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: semantic.primary,
      borderStyle: 'dashed',
      gap: 6,
    } as any,
    addRuleButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: semantic.primary,
    },

    // Form actions
    formActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: isMobile ? 16 : 20,
      paddingTop: isMobile ? 14 : 18,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
    } as any,
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: semantic.primary,
      paddingVertical: isMobile ? 10 : 12,
      paddingHorizontal: isMobile ? 18 : 24,
      borderRadius: 8,
      gap: 6,
    } as any,
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.surface,
    },
    cancelButton: {
      paddingVertical: isMobile ? 10 : 12,
      paddingHorizontal: isMobile ? 18 : 24,
      borderRadius: 8,
      backgroundColor: semantic.background,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textSecondary,
    },

    // Empty state
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: isMobile ? 40 : 60,
    },
    emptyStateIcon: {
      marginBottom: 16,
    },
    emptyStateText: {
      fontSize: isMobile ? 14 : 16,
      color: semantic.textSecondary,
      textAlign: 'center',
      maxWidth: 300,
      lineHeight: isMobile ? 20 : 24,
    },

    // Messages
    messageContainer: {
      padding: 10,
      borderRadius: 8,
      marginBottom: 12,
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

    // Loading
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
  });
};
