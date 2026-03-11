import { StyleSheet, Platform } from 'react-native';

export const createStyles = (isMobile: boolean, screenWidth: number, screenHeight: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
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
      backgroundColor: '#F8FAFC',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: '#64748B',
      fontWeight: '500',
    },
    filterContainer: {
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      paddingVertical: Platform.OS === 'web' ? 16 : 12,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
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
      backgroundColor: '#F8FAFC',
      marginRight: Platform.OS === 'web' ? 12 : 8,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {}),
    },
    filterButtonActive: {
      backgroundColor: '#0F172A',
      borderColor: '#0F172A',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {}),
    },
    filterButtonText: {
      fontSize: Platform.OS === 'web' ? 15 : 14,
      fontWeight: '600',
      color: '#64748B',
    },
    filterButtonTextActive: {
      color: '#FFFFFF',
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
      color: '#0F172A',
      marginBottom: Platform.OS === 'web' ? 20 : 16,
      marginTop: Platform.OS === 'web' ? 16 : 12,
      paddingBottom: Platform.OS === 'web' ? 12 : 10,
      borderBottomWidth: 0,
      borderBottomColor: 'transparent',
      alignSelf: 'flex-start',
      paddingRight: Platform.OS === 'web' ? 24 : 20,
      letterSpacing: -0.4,
    },
    bookingCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: isMobile ? 14 : 18,
      marginBottom: Platform.OS === 'web' ? 20 : 16,
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
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
      backgroundColor: '#F1F5F9',
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      fontSize: 24,
      color: '#94A3B8',
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
      color: '#0F172A',
      flex: 1,
      letterSpacing: -0.2,
    },
    badgeContainer: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    paidBadge: {
      backgroundColor: '#DCFCE7',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    paidBadgeText: {
      fontSize: 10,
      color: '#065F46',
      fontWeight: 'bold',
    },
    cancelledBadge: {
      backgroundColor: '#FEE2E2',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    cancelledBadgeText: {
      fontSize: 10,
      color: '#991B1B',
      fontWeight: 'bold',
    },
    statusBadge: {
      backgroundColor: '#DCFCE7',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 12,
      color: '#065F46',
      fontWeight: 'bold',
    },
    bookingDateTime: {
      fontSize: 14,
      color: '#64748B',
      marginBottom: 8,
      fontWeight: '500',
    },
    bookingDescription: {
      fontSize: 14,
      color: '#64748B',
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
      backgroundColor: '#065F46',
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 6,
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
    payButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },
    viewDetailsButton: {
      backgroundColor: '#0F172A',
      paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
      paddingVertical: Platform.OS === 'web' ? 10 : 8,
      borderRadius: Platform.OS === 'web' ? 10 : 6,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }
        : {}),
    },
    viewDetailsButtonWithPay: {
      paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    },
    viewDetailsButtonText: {
      color: '#FFFFFF',
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
      color: '#0F172A',
      marginBottom: Platform.OS === 'web' ? 12 : 8,
      textAlign: 'center',
    },
    emptyStateSubtext: {
      fontSize: Platform.OS === 'web' ? 15 : 14,
      color: '#64748B',
      textAlign: 'center',
      lineHeight: Platform.OS === 'web' ? 22 : 20,
      maxWidth: Platform.OS === 'web' ? 400 : '100%',
    },
    // Modal Styles
    modalContainer: {
      flex: 1,
      backgroundColor: Platform.OS === 'web' ? 'rgba(0, 0, 0, 0.5)' : '#F8FAFC',
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
      backgroundColor: '#FFFFFF',
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
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {}),
    },
    closeButton: {
      padding: 8,
    },
    closeButtonText: {
      fontSize: Platform.OS === 'web' ? 20 : 18,
      color: '#64748B',
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
      color: '#0F172A',
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
      backgroundColor: '#F1F5F9',
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
      color: '#0F172A',
      marginBottom: Platform.OS === 'web' ? 12 : 8,
      letterSpacing: -0.5,
    },
    eventDateTime: {
      fontSize: Platform.OS === 'web' ? 16 : 16,
      color: '#64748B',
      marginBottom: Platform.OS === 'web' ? 6 : 4,
      fontWeight: '500',
    },
    eventLocation: {
      fontSize: Platform.OS === 'web' ? 16 : 16,
      color: '#64748B',
      marginBottom: Platform.OS === 'web' ? 6 : 4,
      fontWeight: '500',
    },
    eventAttendees: {
      fontSize: 16,
      color: '#64748B',
      marginBottom: 16,
    },
    eventDescription: {
      fontSize: Platform.OS === 'web' ? 16 : 16,
      color: '#475569',
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
      color: '#0F172A',
      marginBottom: Platform.OS === 'web' ? 16 : 12,
      letterSpacing: -0.3,
    },
    serviceDetailCard: {
      backgroundColor: '#F8FAFC',
      borderRadius: Platform.OS === 'web' ? 12 : 8,
      padding: Platform.OS === 'web' ? 20 : 16,
      marginBottom: Platform.OS === 'web' ? 16 : 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
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
      color: '#0F172A',
      flex: 1,
    },
    ratingBadge: {
      backgroundColor: '#FEF3C7',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    ratingBadgeText: {
      color: '#92400E',
      fontSize: 12,
      fontWeight: '700',
    },
    ratingCommentBox: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    ratingCommentLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: '#64748B',
      marginBottom: 6,
    },
    ratingCommentText: {
      fontSize: 14,
      color: '#334155',
      lineHeight: 20,
    },
    rateButton: {
      backgroundColor: '#0F172A',
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
    rateButtonIcon: {
      fontSize: 16,
    },
    rateButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    ratedBadge: {
      backgroundColor: '#DCFCE7',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginTop: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ratedBadgeText: {
      color: '#065F46',
      fontSize: 14,
      fontWeight: '600',
    },
    serviceDetailDescription: {
      fontSize: 14,
      color: '#64748B',
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
      color: '#64748B',
      fontWeight: '500',
    },
    serviceDetailValue: {
      fontSize: 14,
      color: '#0F172A',
      fontWeight: '600',
    },
    suppliersSection: {
      marginBottom: 24,
    },
    suppliersTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#0F172A',
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
      backgroundColor: '#F1F5F9',
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    supplierName: {
      fontSize: 16,
      color: '#0F172A',
      flex: 1,
    },
    costSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: '#F8FAFC',
      borderRadius: 8,
      marginBottom: 24,
    },
    costLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#0F172A',
    },
    costValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    costValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#065F46',
    },
    modalActions: {
      flexDirection: 'row',
      paddingHorizontal: Platform.OS === 'web' ? 24 : isMobile ? 12 : 16,
      paddingTop: Platform.OS === 'web' ? 20 : isMobile ? 12 : 16,
      paddingBottom: Platform.OS === 'web' ? 24 : 100,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
      flexWrap: 'wrap',
      justifyContent: Platform.OS === 'web' ? 'flex-end' : 'space-between',
      gap: Platform.OS === 'web' ? 12 : isMobile ? 8 : 10,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
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
      backgroundColor: '#065F46',
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
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
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
    payButtonModalText: {
      color: '#FFFFFF',
      fontSize: isMobile ? 14 : 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    editButton: {
      flex: isMobile ? undefined : 1,
      backgroundColor: '#0F172A',
      paddingVertical: isMobile ? 14 : 16,
      paddingHorizontal: isMobile ? 16 : 20,
      borderRadius: isMobile ? 12 : 14,
      alignItems: 'center',
      justifyContent: 'center',
      width: isMobile ? (screenWidth - 40) / 2 : undefined,
      minWidth: isMobile ? undefined : 140,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
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
      color: '#FFFFFF',
      fontSize: isMobile ? 14 : 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    messageButton: {
      backgroundColor: '#059669',
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
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
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
    messageButtonText: {
      color: '#FFFFFF',
      fontSize: isMobile ? 14 : 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    messageButtonWithPay: {
      marginTop: 0,
    },
    invoiceButton: {
      backgroundColor: '#D97706',
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
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
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
    invoiceButtonWithPay: {
      marginTop: 0,
    },
    invoiceButtonText: {
      color: '#FFFFFF',
      fontSize: isMobile ? 14 : 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    cancelButton: {
      flex: isMobile ? undefined : 1,
      backgroundColor: '#DC2626',
      paddingVertical: isMobile ? 14 : 16,
      paddingHorizontal: isMobile ? 16 : 20,
      borderRadius: isMobile ? 12 : 14,
      alignItems: 'center',
      justifyContent: 'center',
      width: isMobile ? (screenWidth - 40) / 2 : undefined,
      minWidth: isMobile ? undefined : 140,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
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
    cancelButtonText: {
      color: '#FFFFFF',
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
      backgroundColor: '#FFFFFF',
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
      borderBottomColor: '#E2E8F0',
      backgroundColor: '#FFFFFF',
    },
    cancelModalTitle: {
      fontSize: Platform.OS === 'web' ? 22 : 20,
      fontWeight: '700',
      color: '#0F172A',
    },
    cancelModalCloseButton: {
      padding: 4,
    },
    cancelModalCloseIcon: {
      fontSize: Platform.OS === 'web' ? 24 : 20,
      color: '#64748B',
      fontWeight: 'bold',
    },
    cancelModalBody: {
      padding: Platform.OS === 'web' ? 24 : 20,
    },
    cancelModalMessage: {
      fontSize: Platform.OS === 'web' ? 16 : 15,
      color: '#0F172A',
      marginBottom: Platform.OS === 'web' ? 16 : 12,
      lineHeight: Platform.OS === 'web' ? 24 : 22,
      fontWeight: '600',
    },
    cancelModalSubMessage: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: '#64748B',
      marginBottom: Platform.OS === 'web' ? 12 : 10,
    },
    cancelReasonInput: {
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: Platform.OS === 'web' ? 12 : 10,
      padding: Platform.OS === 'web' ? 16 : 14,
      fontSize: Platform.OS === 'web' ? 15 : 14,
      color: '#0F172A',
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
      borderTopColor: '#E2E8F0',
    },
    cancelModalButton: {
      paddingVertical: Platform.OS === 'web' ? 12 : 10,
      paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
      borderRadius: Platform.OS === 'web' ? 10 : 8,
      minWidth: Platform.OS === 'web' ? 100 : 80,
      alignItems: 'center',
    },
    cancelModalBackButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    cancelModalBackButtonText: {
      color: '#334155',
      fontSize: Platform.OS === 'web' ? 15 : 14,
      fontWeight: '600',
    },
    cancelModalConfirmButton: {
      backgroundColor: '#DC2626',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }),
    },
    cancelModalConfirmButtonText: {
      color: '#FFFFFF',
      fontSize: Platform.OS === 'web' ? 15 : 14,
      fontWeight: '700',
    },
  });
