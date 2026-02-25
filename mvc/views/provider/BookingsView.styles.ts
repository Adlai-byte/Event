import { StyleSheet, Dimensions, Platform } from 'react-native';
import { colors, semantic } from '../../theme';

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;

export const styles = StyleSheet.create({
  main: {
    flex: 1,
  },
  mainContent: {
    padding: isMobile ? 12 : 20,
    paddingBottom: isMobile ? 20 : 20,
  },
  header: {
    marginBottom: isMobile ? 12 : 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: isMobile ? 12 : 14,
    color: semantic.textSecondary,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: semantic.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  refreshButtonText: {
    fontSize: 20,
    color: semantic.surface,
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
  tableScrollContainer: {
    marginTop: 16,
    ...(isMobile && {
      maxHeight: '100%',
    }),
  },
  tableScrollContent: {
    ...(isMobile && {
      minWidth: 900, // Minimum width to ensure all columns are visible
    }),
  },
  tableContainer: {
    backgroundColor: semantic.surface,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: isMobile ? 900 : '100%', // Fixed width on mobile for horizontal scroll, full width on web
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
    borderBottomColor: semantic.background,
    alignItems: 'center',
  },
  tableCell: {
    paddingHorizontal: 8,
  },
  tableCellEventName: {
    fontSize: 14,
    fontWeight: '700',
    color: semantic.textPrimary,
    marginBottom: 2,
  },
  tableCellServiceName: {
    fontSize: 12,
    color: semantic.textSecondary,
  },
  tableCellText: {
    fontSize: 14,
    color: semantic.textPrimary,
  },
  tableCellPrice: {
    fontWeight: '700',
    color: semantic.primary,
  },
  tableCellActions: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tableActionButton: {
    paddingVertical: isMobile ? 8 : 6,
    paddingHorizontal: isMobile ? 10 : 12,
    borderRadius: 6,
    minWidth: isMobile ? 65 : 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableActionButtonText: {
    color: semantic.surface,
    fontSize: isMobile ? 10 : 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: semantic.success,
  },
  cancelButton: {
    backgroundColor: semantic.error,
  },
  paidButton: {
    backgroundColor: semantic.success,
    marginRight: 8,
  },
  invoiceButton: {
    backgroundColor: semantic.warning,
    marginRight: 8,
  },
  completeButton: {
    backgroundColor: semantic.primary,
  },
  messageButton: {
    backgroundColor: semantic.textSecondary,
  },
  actionButtonText: {
    color: semantic.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: semantic.textPrimary,
    marginBottom: 4,
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
  emptyStateSubtext: {
    fontSize: 14,
    color: semantic.textSecondary,
  },
  viewDetailsButton: {
    backgroundColor: semantic.primary,
    marginRight: 8,
  },
  clientDetailsModalContent: {
    backgroundColor: semantic.surface,
    borderRadius: Platform.OS === 'web' ? 20 : 16,
    width: Platform.OS === 'web' ? '90%' : '100%',
    maxWidth: 600,
    maxHeight: Platform.OS === 'web' ? '90%' : '100%',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)',
    } as any : {
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
    padding: Platform.OS === 'web' ? 24 : 20,
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
    backgroundColor: semantic.surface,
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 22 : 20,
    fontWeight: '700',
    color: semantic.textPrimary,
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: semantic.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } as any : {}),
  },
  closeButtonText: {
    fontSize: 20,
    color: semantic.textSecondary,
    fontWeight: '600',
  },
  clientDetailsSection: {
    marginBottom: Platform.OS === 'web' ? 24 : 20,
    paddingBottom: Platform.OS === 'web' ? 20 : 16,
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  clientDetailsSectionTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: '700',
    color: semantic.textPrimary,
    marginBottom: Platform.OS === 'web' ? 16 : 12,
  },
  clientDetailsRow: {
    flexDirection: 'row',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    alignItems: 'flex-start',
  },
  clientDetailsLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
    color: semantic.textSecondary,
    width: Platform.OS === 'web' ? 100 : 90,
    marginRight: Platform.OS === 'web' ? 12 : 8,
  },
  clientDetailsValue: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: semantic.textPrimary,
    flex: 1,
  },
  clientDetailsLink: {
    color: semantic.primary,
    ...(Platform.OS === 'web' ? {
      textDecorationLine: 'underline',
      cursor: 'pointer',
    } as any : {}),
  },
  closeModalButton: {
    backgroundColor: semantic.background,
  },
  closeModalButtonText: {
    color: semantic.textSecondary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 16,
  },
  confirmModalContent: {
    backgroundColor: semantic.surface,
    borderRadius: Platform.OS === 'web' ? 16 : 12,
    width: Platform.OS === 'web' ? '90%' : '100%',
    maxWidth: 500,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 10,
    }),
  },
  cancelModalContent: {
    backgroundColor: semantic.surface,
    borderRadius: Platform.OS === 'web' ? 16 : 12,
    width: Platform.OS === 'web' ? '90%' : '100%',
    maxWidth: 600,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 10,
    }),
  },
  modalBody: {
    padding: Platform.OS === 'web' ? 24 : 20,
  },
  modalMessage: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: semantic.textPrimary,
    marginBottom: Platform.OS === 'web' ? 16 : 12,
    lineHeight: Platform.OS === 'web' ? 24 : 22,
  },
  cancelReasonInput: {
    backgroundColor: semantic.background,
    borderWidth: 1,
    borderColor: semantic.border,
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    padding: Platform.OS === 'web' ? 16 : 14,
    fontSize: Platform.OS === 'web' ? 15 : 14,
    color: semantic.textPrimary,
    minHeight: Platform.OS === 'web' ? 120 : 100,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? {
      resize: 'vertical' as any,
    } : {}),
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Platform.OS === 'web' ? 12 : 10,
    padding: Platform.OS === 'web' ? 24 : 20,
    paddingTop: Platform.OS === 'web' ? 0 : 0,
    borderTopWidth: 1,
    borderTopColor: semantic.border,
  },
  modalButton: {
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
    borderRadius: Platform.OS === 'web' ? 10 : 8,
    minWidth: Platform.OS === 'web' ? 100 : 80,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: semantic.background,
    borderWidth: 1,
    borderColor: semantic.border,
  },
  cancelModalButtonText: {
    color: semantic.textSecondary,
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '600',
  },
  confirmModalButton: {
    backgroundColor: semantic.success,
  },
  confirmModalButtonText: {
    color: semantic.surface,
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '600',
  },
  submitCancelButton: {
    backgroundColor: semantic.error,
  },
  submitCancelButtonText: {
    color: semantic.surface,
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '600',
  },
  disabledButtonText: {
    color: semantic.textMuted,
  },
  closeModalIcon: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    color: semantic.textSecondary,
    fontWeight: 'bold',
  },
});
