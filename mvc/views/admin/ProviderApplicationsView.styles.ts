import { StyleSheet, Platform } from 'react-native';
import { colors, semantic } from '../../theme';

/**
 * Static styles that do not depend on screen dimensions.
 */
export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterTabActive: {
    backgroundColor: semantic.primary,
  },
  filterTabTextActive: {
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
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: semantic.textPrimary,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: semantic.textSecondary,
  },
  tableScrollView: {
    marginTop: 8,
  },
  tableScrollContent: {
    minWidth: 800,
  },
  tableRowAlt: {
    backgroundColor: semantic.background,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  approveButton: {
    backgroundColor: semantic.success,
  },
  rejectButton: {
    backgroundColor: semantic.error,
  },
  approvedText: {
    color: semantic.success,
    fontSize: 12,
    fontWeight: '600',
  },
  rejectedText: {
    color: semantic.error,
    fontSize: 12,
    fontWeight: '600',
  },
  viewDocumentsButton: {
    backgroundColor: semantic.primary,
    marginRight: 8,
  },
  documentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: semantic.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 800,
    maxHeight: '90%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: semantic.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: semantic.textSecondary,
    fontWeight: 'bold',
  },
  documentSection: {
    marginBottom: 24,
  },
  documentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: semantic.textPrimary,
    marginBottom: 12,
  },
  documentImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    backgroundColor: semantic.background,
    borderWidth: 1,
    borderColor: semantic.border,
  },
  noDocumentsText: {
    fontSize: 14,
    color: semantic.textSecondary,
    textAlign: 'center',
    paddingVertical: 40,
  },
  modalFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: semantic.border,
    gap: 12,
  },
  closeModalButton: {
    backgroundColor: semantic.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: semantic.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  rejectModalContent: {
    backgroundColor: semantic.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  approveModalContent: {
    backgroundColor: semantic.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    margin: 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  approveModalBody: {
    padding: 20,
  },
  rejectModalBody: {
    padding: 20,
  },
  rejectReasonInput: {
    borderWidth: 1,
    borderColor: semantic.border,
    borderRadius: 12,
    padding: 12,
    color: semantic.textPrimary,
    backgroundColor: semantic.background,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  searchContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  searchInput: {
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: semantic.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: semantic.textPrimary,
  },
});

/**
 * Responsive styles that depend on screen dimensions.
 * Call this inside a component that has access to useBreakpoints().
 */
export const getResponsiveStyles = (isMobile: boolean, screenWidth: number) =>
  StyleSheet.create({
    content: {
      padding: isMobile ? 12 : 20,
    },
    header: {
      marginBottom: isMobile ? 16 : 24,
    },
    title: {
      fontSize: isMobile ? 20 : 24,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
    filterContainer: {
      flexDirection: 'row',
      marginBottom: isMobile ? 12 : 20,
      backgroundColor: semantic.surface,
      flexWrap: 'wrap',
      borderRadius: 8,
      padding: 4,
    },
    filterTab: {
      flex: isMobile ? undefined : 1,
      minWidth: isMobile ? (screenWidth - 48) / 4 : undefined,
      paddingVertical: isMobile ? 6 : 8,
      paddingHorizontal: isMobile ? 8 : 12,
      borderRadius: 6,
      alignItems: 'center',
    },
    filterTabText: {
      fontSize: isMobile ? 11 : 13,
      color: semantic.textSecondary,
      fontWeight: '600',
    },
    tableContainer: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      overflow: 'hidden',
      ...(isMobile && { minWidth: 800 }),
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: semantic.background,
      paddingVertical: isMobile ? 10 : 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    tableHeaderText: {
      fontSize: isMobile ? 10 : 12,
      fontWeight: '700',
      color: semantic.textSecondary,
      textTransform: 'uppercase',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: isMobile ? 12 : 16,
      paddingHorizontal: isMobile ? 12 : 16,
      borderBottomWidth: 1,
      borderBottomColor: semantic.background,
    },
    tableCell: {
      fontSize: isMobile ? 12 : 14,
      color: semantic.textPrimary,
    },
    tableColName: {
      flex: 1.5,
      minWidth: isMobile ? 120 : undefined,
      paddingRight: isMobile ? 8 : 0,
    },
    tableColEmail: {
      flex: 2,
      minWidth: isMobile ? 150 : undefined,
      paddingRight: isMobile ? 8 : 0,
    },
    tableColStatus: {
      flex: 1,
      minWidth: isMobile ? 100 : undefined,
      paddingRight: isMobile ? 8 : 0,
    },
    tableColDate: {
      flex: 1,
      minWidth: isMobile ? 100 : undefined,
      paddingRight: isMobile ? 8 : 0,
    },
    tableColActions: {
      flex: 1.5,
      minWidth: isMobile ? 200 : undefined,
    },
    actionButton: {
      paddingVertical: isMobile ? 6 : 6,
      paddingHorizontal: isMobile ? 10 : 12,
      borderRadius: 6,
      minWidth: isMobile ? 60 : 70,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    approveButtonText: {
      color: semantic.surface,
      fontSize: isMobile ? 11 : 12,
      fontWeight: '600',
    },
    rejectButtonText: {
      color: semantic.surface,
      fontSize: isMobile ? 11 : 12,
      fontWeight: '600',
    },
    viewDocumentsButtonText: {
      color: semantic.surface,
      fontSize: isMobile ? 11 : 12,
      fontWeight: '600',
    },
    modalTitle: {
      fontSize: isMobile ? 18 : 20,
      fontWeight: '700',
      color: semantic.textPrimary,
      flex: 1,
    },
    modalBody: {
      padding: 20,
      maxHeight: screenWidth * 0.6,
    },
    approveModalDescription: {
      fontSize: isMobile ? 16 : 15,
      color: semantic.textPrimary,
      lineHeight: isMobile ? 24 : 22,
    },
    approveConfirmButton: {
      flex: 1,
      minWidth: isMobile ? 120 : undefined,
      backgroundColor: semantic.success,
      borderRadius: 12,
      paddingVertical: isMobile ? 18 : 16,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    approveConfirmButtonText: {
      color: semantic.surface,
      fontSize: isMobile ? 17 : 16,
      fontWeight: '700',
      ...(Platform.OS === 'android' && {
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
      }),
    },
    rejectModalDescription: {
      fontSize: isMobile ? 15 : 14,
      color: isMobile ? colors.neutral[700] : semantic.textSecondary,
      lineHeight: isMobile ? 22 : 20,
      marginBottom: 20,
    },
    rejectModalLabel: {
      fontSize: isMobile ? 15 : 14,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 8,
    },
    rejectReasonInputFontSize: {
      fontSize: isMobile ? 16 : 14,
    },
    rejectModalNote: {
      fontSize: isMobile ? 13 : 12,
      color: isMobile ? colors.neutral[600] : semantic.textSecondary,
      fontStyle: 'italic',
    },
    rejectConfirmButton: {
      flex: 1,
      minWidth: isMobile ? 140 : undefined,
      backgroundColor: semantic.error,
      borderRadius: 12,
      paddingVertical: isMobile ? 18 : 16,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rejectConfirmButtonText: {
      color: semantic.surface,
      fontSize: isMobile ? 17 : 16,
      fontWeight: '700',
      ...(Platform.OS === 'android' && {
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
      }),
    },
    cancelButton: {
      flex: 1,
      minWidth: isMobile ? 120 : undefined,
      backgroundColor: semantic.background,
      borderRadius: 12,
      paddingVertical: isMobile ? 18 : 16,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      color: semantic.textPrimary,
      fontSize: isMobile ? 17 : 16,
      fontWeight: '700',
    },
  });
