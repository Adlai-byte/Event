import { StyleSheet, Platform } from 'react-native';
import { colors, semantic } from '../../theme';
import { getShadowStyle } from '../../utils/shadowStyles';

export const createStyles = (isMobile: boolean, screenWidth: number, screenHeight: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Platform.OS === 'web' ? '#F0F2F5' : semantic.background,
      ...(Platform.OS === 'web'
        ? {
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 30,
            paddingBottom: 20,
          }
        : {
            paddingTop: 20,
          }),
    },
    placeholder: {
      width: 40,
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
      color: semantic.textSecondary,
      fontWeight: '500',
    },
    filterContainer: {
      backgroundColor: semantic.surface,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
      paddingVertical: Platform.OS === 'web' ? 16 : 12,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }
        : {}),
    },
    filterScrollContent: {
      paddingHorizontal: Platform.OS === 'web' ? 32 : 16,
      gap: Platform.OS === 'web' ? 12 : 8,
    },
    filterButton: {
      paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
      paddingVertical: Platform.OS === 'web' ? 10 : 8,
      borderRadius: Platform.OS === 'web' ? 12 : 20,
      backgroundColor: semantic.background,
      marginRight: Platform.OS === 'web' ? 12 : 8,
      borderWidth: 2,
      borderColor: semantic.border,
      ...(Platform.OS === 'web'
        ? {
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }
        : {}),
    },
    filterButtonActive: {
      backgroundColor: semantic.primary,
      borderColor: semantic.primary,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
          }
        : {}),
    },
    filterButtonText: {
      fontSize: Platform.OS === 'web' ? 15 : 14,
      fontWeight: '600',
      color: semantic.textSecondary,
    },
    filterButtonTextActive: {
      color: semantic.surface,
      fontWeight: '700',
    },
    content: {
      flex: 1,
      paddingHorizontal: Platform.OS === 'web' ? 32 : 20,
      paddingTop: Platform.OS === 'web' ? 24 : 10,
      paddingBottom: Platform.OS === 'web' ? 24 : 10,
    },
    listContent: {
      paddingBottom: 10,
    },
    section: {
      marginTop: Platform.OS === 'web' ? 32 : 24,
      marginBottom: Platform.OS === 'web' ? 24 : 20,
      paddingHorizontal: Platform.OS === 'web' ? 32 : 20,
    },
    sectionTitle: {
      fontSize: Platform.OS === 'web' ? 24 : 22,
      fontWeight: '800',
      color: semantic.textPrimary,
      marginBottom: Platform.OS === 'web' ? 20 : 16,
      marginTop: Platform.OS === 'web' ? 16 : 12,
      paddingBottom: Platform.OS === 'web' ? 12 : 10,
      borderBottomWidth: 3,
      borderBottomColor: semantic.primary,
      alignSelf: 'flex-start',
      paddingRight: Platform.OS === 'web' ? 24 : 20,
      letterSpacing: -0.4,
    },
    bookingCard: {
      backgroundColor: semantic.surface,
      borderRadius: Platform.OS === 'web' ? 14 : 12,
      padding: Platform.OS === 'web' ? 20 : 16,
      marginBottom: Platform.OS === 'web' ? 20 : 16,
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: semantic.border,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }),
    },
    bookingImageContainer: {
      marginRight: 16,
    },
    bookingImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
    },
    placeholderImage: {
      width: 80,
      height: 80,
      backgroundColor: semantic.border,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      fontSize: 24,
      color: '#95A5A6',
      fontWeight: 'bold',
    },
    bookingContent: {
      flex: 1,
    },
    bookingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    bookingTitle: {
      fontSize: Platform.OS === 'web' ? 18 : 16,
      fontWeight: '700',
      color: semantic.textPrimary,
      flex: 1,
      letterSpacing: -0.2,
    },
    badgeContainer: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    paidBadge: {
      backgroundColor: semantic.success,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    paidBadgeText: {
      fontSize: 10,
      color: semantic.surface,
      fontWeight: 'bold',
    },
    cancelledBadge: {
      backgroundColor: semantic.error,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    cancelledBadgeText: {
      fontSize: 10,
      color: semantic.surface,
      fontWeight: 'bold',
    },
    statusBadge: {
      backgroundColor: '#27AE60',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 12,
      color: semantic.surface,
      fontWeight: 'bold',
    },
    bookingDateTime: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginBottom: 8,
      fontWeight: '500',
    },
    bookingDescription: {
      fontSize: 14,
      color: semantic.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    bookingActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    },
    payButton: {
      backgroundColor: semantic.success,
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 6,
      ...getShadowStyle(0.2, 2, 1),
    },
    payButtonText: {
      color: semantic.surface,
      fontSize: 12,
      fontWeight: 'bold',
    },
    viewDetailsButton: {
      backgroundColor: semantic.primary,
      paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
      paddingVertical: Platform.OS === 'web' ? 10 : 8,
      borderRadius: Platform.OS === 'web' ? 10 : 6,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }
        : {}),
    },
    viewDetailsButtonWithPay: {
      paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    },
    viewDetailsButtonText: {
      color: semantic.surface,
      fontSize: Platform.OS === 'web' ? 13 : 12,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Platform.OS === 'web' ? 80 : 60,
      paddingHorizontal: 20,
    },
    emptyStateIcon: {
      fontSize: Platform.OS === 'web' ? 64 : 48,
      marginBottom: Platform.OS === 'web' ? 20 : 16,
      opacity: 0.6,
    },
    emptyStateText: {
      fontSize: Platform.OS === 'web' ? 20 : 18,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: Platform.OS === 'web' ? 12 : 8,
      textAlign: 'center',
    },
    emptyStateSubtext: {
      fontSize: Platform.OS === 'web' ? 15 : 14,
      color: semantic.textSecondary,
      textAlign: 'center',
      lineHeight: Platform.OS === 'web' ? 22 : 20,
      maxWidth: Platform.OS === 'web' ? 400 : '100%',
    },
    // Modal Styles
    modalContainer: {
      flex: 1,
      backgroundColor: Platform.OS === 'web' ? 'rgba(0, 0, 0, 0.5)' : semantic.background,
      ...(Platform.OS === 'web'
        ? {
            justifyContent: 'center',
            alignItems: 'center',
          }
        : {}),
    },
    modalWebCardContainer: {
      width: '90%',
      maxWidth: 800,
      maxHeight: screenHeight * 0.9,
      backgroundColor: semantic.surface,
      borderRadius: 16,
      overflow: 'hidden',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.2)',
          }
        : {}),
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
      paddingVertical: Platform.OS === 'web' ? 20 : 16,
      backgroundColor: semantic.surface,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
          }
        : {}),
    },
    closeButton: {
      padding: 8,
    },
    closeButtonText: {
      fontSize: Platform.OS === 'web' ? 20 : 18,
      color: semantic.textSecondary,
      fontWeight: 'bold',
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
          }
        : {}),
    },
    modalTitle: {
      fontSize: Platform.OS === 'web' ? 22 : 18,
      fontWeight: '700',
      color: semantic.textPrimary,
      letterSpacing: -0.3,
    },
    modalContent: {
      flex: 1,
      maxHeight: Platform.OS === 'web' ? screenHeight * 0.9 - 180 : undefined,
    },
    modalContentContainer: {
      paddingBottom: Platform.OS === 'web' ? 24 : 20,
    },
    eventImageContainer: {
      height: Platform.OS === 'web' ? 280 : 200,
      backgroundColor: semantic.border,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    eventImage: {
      width: '100%',
      height: 200,
    },
    eventInfo: {
      padding: Platform.OS === 'web' ? 28 : 20,
    },
    eventTitle: {
      fontSize: Platform.OS === 'web' ? 28 : 24,
      fontWeight: '800',
      color: semantic.textPrimary,
      marginBottom: Platform.OS === 'web' ? 12 : 8,
      letterSpacing: -0.5,
    },
    eventDateTime: {
      fontSize: Platform.OS === 'web' ? 16 : 16,
      color: semantic.textSecondary,
      marginBottom: Platform.OS === 'web' ? 6 : 4,
      fontWeight: '500',
    },
    eventLocation: {
      fontSize: Platform.OS === 'web' ? 16 : 16,
      color: semantic.textSecondary,
      marginBottom: Platform.OS === 'web' ? 6 : 4,
      fontWeight: '500',
    },
    eventAttendees: {
      fontSize: 16,
      color: semantic.textSecondary,
      marginBottom: 16,
    },
    eventDescription: {
      fontSize: Platform.OS === 'web' ? 16 : 16,
      color: colors.neutral[600],
      lineHeight: Platform.OS === 'web' ? 26 : 24,
      marginBottom: Platform.OS === 'web' ? 28 : 24,
      fontWeight: '400',
    },
    servicesSection: {
      marginBottom: Platform.OS === 'web' ? 28 : 24,
    },
    servicesTitle: {
      fontSize: Platform.OS === 'web' ? 20 : 18,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: Platform.OS === 'web' ? 16 : 12,
      letterSpacing: -0.3,
    },
    serviceDetailCard: {
      backgroundColor: semantic.background,
      borderRadius: Platform.OS === 'web' ? 12 : 8,
      padding: Platform.OS === 'web' ? 20 : 16,
      marginBottom: Platform.OS === 'web' ? 16 : 12,
      borderWidth: 1,
      borderColor: semantic.border,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }
        : {}),
    },
    serviceDetailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    serviceDetailName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#2C3E50',
      flex: 1,
    },
    ratingBadge: {
      backgroundColor: '#FBBF24',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    ratingBadgeText: {
      color: semantic.surface,
      fontSize: 12,
      fontWeight: '700',
    },
    ratingCommentBox: {
      backgroundColor: semantic.surface,
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    ratingCommentLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: semantic.textSecondary,
      marginBottom: 6,
    },
    ratingCommentText: {
      fontSize: 14,
      color: '#374151',
      lineHeight: 20,
    },
    rateButton: {
      backgroundColor: semantic.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 8px rgba(108, 99, 255, 0.3)',
          }
        : {
            shadowColor: semantic.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
          }),
    },
    rateButtonIcon: {
      fontSize: 16,
    },
    rateButtonText: {
      color: semantic.surface,
      fontSize: 14,
      fontWeight: '600',
    },
    ratedBadge: {
      backgroundColor: semantic.success,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginTop: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ratedBadgeText: {
      color: semantic.surface,
      fontSize: 14,
      fontWeight: '600',
    },
    serviceDetailDescription: {
      fontSize: 14,
      color: semantic.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    serviceDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    serviceDetailLabel: {
      fontSize: 14,
      color: semantic.textSecondary,
      fontWeight: '500',
    },
    serviceDetailValue: {
      fontSize: 14,
      color: '#2C3E50',
      fontWeight: '600',
    },
    suppliersSection: {
      marginBottom: 24,
    },
    suppliersTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#2C3E50',
      marginBottom: 12,
    },
    supplierItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    supplierImage: {
      width: 40,
      height: 40,
      backgroundColor: semantic.border,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    supplierName: {
      fontSize: 16,
      color: '#2C3E50',
      flex: 1,
    },
    costSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: semantic.background,
      borderRadius: 8,
      marginBottom: 24,
    },
    costLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#2C3E50',
    },
    costValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    costValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: semantic.success,
    },
    modalActions: {
      flexDirection: 'row',
      paddingHorizontal: Platform.OS === 'web' ? 24 : isMobile ? 12 : 16,
      paddingTop: Platform.OS === 'web' ? 20 : isMobile ? 12 : 16,
      paddingBottom: Platform.OS === 'web' ? 24 : 100,
      backgroundColor: semantic.surface,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
      flexWrap: 'wrap',
      justifyContent: Platform.OS === 'web' ? 'flex-end' : 'space-between',
      gap: Platform.OS === 'web' ? 12 : isMobile ? 8 : 10,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)',
          }
        : {}),
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: isMobile ? 4 : 6,
    },
    buttonIcon: {
      fontSize: isMobile ? 16 : 18,
    },
    payButtonModal: {
      backgroundColor: semantic.success,
      paddingVertical: isMobile ? 14 : 16,
      paddingHorizontal: isMobile ? 16 : 20,
      borderRadius: isMobile ? 12 : 14,
      alignItems: 'center',
      justifyContent: 'center',
      flex: isMobile ? undefined : 1,
      width: isMobile ? (screenWidth - 40) / 2 : undefined,
      minWidth: isMobile ? undefined : 140,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25), 0 2px 6px rgba(16, 185, 129, 0.15)',
            transition: 'all 0.2s ease',
          }
        : {
            shadowColor: semantic.success,
            shadowOffset: { width: 0, height: isMobile ? 4 : 6 },
            shadowOpacity: 0.25,
            shadowRadius: isMobile ? 8 : 10,
            elevation: isMobile ? 6 : 8,
          }),
    },
    payButtonModalText: {
      color: semantic.surface,
      fontSize: isMobile ? 14 : 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    editButton: {
      flex: isMobile ? undefined : 1,
      backgroundColor: semantic.primary,
      paddingVertical: isMobile ? 14 : 16,
      paddingHorizontal: isMobile ? 16 : 20,
      borderRadius: isMobile ? 12 : 14,
      alignItems: 'center',
      justifyContent: 'center',
      width: isMobile ? (screenWidth - 40) / 2 : undefined,
      minWidth: isMobile ? undefined : 140,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 6px 20px rgba(99, 102, 241, 0.25), 0 2px 6px rgba(99, 102, 241, 0.15)',
            transition: 'all 0.2s ease',
          }
        : {
            shadowColor: semantic.primary,
            shadowOffset: { width: 0, height: isMobile ? 4 : 6 },
            shadowOpacity: 0.25,
            shadowRadius: isMobile ? 8 : 10,
            elevation: isMobile ? 6 : 8,
          }),
    },
    editButtonWithPay: {
      flex: isMobile ? undefined : 1,
      width: isMobile ? (screenWidth - 40) / 2 : undefined,
      minWidth: isMobile ? undefined : 140,
    },
    editButtonWithOther: {
      flex: isMobile ? undefined : 1,
      width: isMobile ? (screenWidth - 40) / 2 : undefined,
      minWidth: isMobile ? undefined : 140,
    },
    editButtonText: {
      color: semantic.surface,
      fontSize: isMobile ? 14 : 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    messageButton: {
      backgroundColor: colors.success[600],
      paddingVertical: isMobile ? 14 : 16,
      paddingHorizontal: isMobile ? 16 : 20,
      borderRadius: isMobile ? 12 : 14,
      alignItems: 'center',
      justifyContent: 'center',
      flex: isMobile ? undefined : 1,
      width: isMobile ? (screenWidth - 40) / 2 : undefined,
      minWidth: isMobile ? undefined : 140,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 6px 20px rgba(5, 150, 105, 0.25), 0 2px 6px rgba(5, 150, 105, 0.15)',
            transition: 'all 0.2s ease',
          }
        : {
            shadowColor: colors.success[600],
            shadowOffset: { width: 0, height: isMobile ? 4 : 6 },
            shadowOpacity: 0.25,
            shadowRadius: isMobile ? 8 : 10,
            elevation: isMobile ? 6 : 8,
          }),
    },
    messageButtonText: {
      color: semantic.surface,
      fontSize: isMobile ? 14 : 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    messageButtonWithPay: {
      marginTop: 0,
    },
    invoiceButton: {
      backgroundColor: semantic.warning,
      paddingVertical: isMobile ? 14 : 16,
      paddingHorizontal: isMobile ? 16 : 20,
      borderRadius: isMobile ? 12 : 14,
      alignItems: 'center',
      justifyContent: 'center',
      flex: isMobile ? undefined : 1,
      width: isMobile ? (screenWidth - 40) / 2 : undefined,
      minWidth: isMobile ? undefined : 140,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 6px 20px rgba(245, 158, 11, 0.25), 0 2px 6px rgba(245, 158, 11, 0.15)',
            transition: 'all 0.2s ease',
          }
        : {
            shadowColor: semantic.warning,
            shadowOffset: { width: 0, height: isMobile ? 4 : 6 },
            shadowOpacity: 0.25,
            shadowRadius: isMobile ? 8 : 10,
            elevation: isMobile ? 6 : 8,
          }),
    },
    invoiceButtonWithPay: {
      marginTop: 0,
    },
    invoiceButtonText: {
      color: semantic.surface,
      fontSize: isMobile ? 14 : 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    cancelButton: {
      flex: isMobile ? undefined : 1,
      backgroundColor: colors.error[600],
      paddingVertical: isMobile ? 14 : 16,
      paddingHorizontal: isMobile ? 16 : 20,
      borderRadius: isMobile ? 12 : 14,
      alignItems: 'center',
      justifyContent: 'center',
      width: isMobile ? (screenWidth - 40) / 2 : undefined,
      minWidth: isMobile ? undefined : 140,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 6px 20px rgba(220, 38, 38, 0.25), 0 2px 6px rgba(220, 38, 38, 0.15)',
            transition: 'all 0.2s ease',
          }
        : {
            shadowColor: colors.error[600],
            shadowOffset: { width: 0, height: isMobile ? 4 : 6 },
            shadowOpacity: 0.25,
            shadowRadius: isMobile ? 8 : 10,
            elevation: isMobile ? 6 : 8,
          }),
    },
    cancelButtonText: {
      color: semantic.surface,
      fontSize: isMobile ? 14 : 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    cancelModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Platform.OS === 'web' ? 20 : 16,
    },
    cancelModalContent: {
      backgroundColor: semantic.surface,
      borderRadius: Platform.OS === 'web' ? 16 : 12,
      width: Platform.OS === 'web' ? '90%' : '100%',
      maxWidth: 600,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 24,
            elevation: 10,
          }),
    },
    cancelModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Platform.OS === 'web' ? 24 : 20,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
      backgroundColor: semantic.surface,
    },
    cancelModalTitle: {
      fontSize: Platform.OS === 'web' ? 22 : 20,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
    cancelModalCloseButton: {
      padding: 4,
    },
    cancelModalCloseIcon: {
      fontSize: Platform.OS === 'web' ? 24 : 20,
      color: semantic.textSecondary,
      fontWeight: 'bold',
    },
    cancelModalBody: {
      padding: Platform.OS === 'web' ? 24 : 20,
    },
    cancelModalMessage: {
      fontSize: Platform.OS === 'web' ? 16 : 15,
      color: semantic.textPrimary,
      marginBottom: Platform.OS === 'web' ? 16 : 12,
      lineHeight: Platform.OS === 'web' ? 24 : 22,
      fontWeight: '600',
    },
    cancelModalSubMessage: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: semantic.textSecondary,
      marginBottom: Platform.OS === 'web' ? 12 : 10,
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
      ...(Platform.OS === 'web'
        ? {
            resize: 'vertical' as any,
          }
        : {}),
    },
    cancelModalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Platform.OS === 'web' ? 12 : 10,
      padding: Platform.OS === 'web' ? 24 : 20,
      paddingTop: Platform.OS === 'web' ? 0 : 0,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
    },
    cancelModalButton: {
      paddingVertical: Platform.OS === 'web' ? 12 : 10,
      paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
      borderRadius: Platform.OS === 'web' ? 10 : 8,
      minWidth: Platform.OS === 'web' ? 100 : 80,
      alignItems: 'center',
    },
    cancelModalBackButton: {
      backgroundColor: colors.neutral[100],
      borderWidth: 1,
      borderColor: semantic.border,
    },
    cancelModalBackButtonText: {
      color: semantic.textSecondary,
      fontSize: Platform.OS === 'web' ? 15 : 14,
      fontWeight: '600',
    },
    cancelModalConfirmButton: {
      backgroundColor: semantic.error,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }
        : {
            shadowColor: semantic.error,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 4,
          }),
    },
    cancelModalConfirmButtonText: {
      color: semantic.surface,
      fontSize: Platform.OS === 'web' ? 15 : 14,
      fontWeight: '700',
    },
  });
