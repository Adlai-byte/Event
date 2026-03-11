import { StyleSheet, Platform } from 'react-native';

export const createStyles = (isMobile: boolean, screenWidth: number, screenHeight: number) =>
  StyleSheet.create({
    container: {
      paddingTop: Platform.OS === 'web' ? (screenWidth < 768 ? 0 : 20) : 10,
      paddingBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 0 : 20) : 10,
      flex: 1,
      backgroundColor: '#F8FAFC',
      ...(Platform.OS === 'web'
        ? {
            justifyContent: screenWidth < 768 ? 'flex-start' : 'center',
            alignItems: 'center',
          }
        : {}),
    },
    backgroundContainer: { display: 'none' },
    backgroundGradient: { display: 'none' },
    backgroundGradientWeb: { display: 'none' },
    webCardContainer: {
      width: screenWidth < 768 ? '100%' : '90%',
      maxWidth: screenWidth < 768 ? '100%' : 900,
      maxHeight: screenWidth < 768 ? '100%' : screenHeight * 0.95,
      backgroundColor: '#FFFFFF',
      borderRadius: screenWidth < 768 ? 0 : 16,
      overflow: 'hidden',
      borderWidth: screenWidth < 768 ? 0 : 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            boxShadow:
              screenWidth < 768
                ? 'none'
                : '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
          }
        : {}),
    },
    backgroundCircle1: { display: 'none' },
    backgroundCircle2: { display: 'none' },
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
    content: {
      flex: 1,
      zIndex: 1,
      maxHeight:
        Platform.OS === 'web'
          ? screenWidth < 768
            ? undefined
            : screenHeight * 0.95 - 200
          : undefined,
    },
    contentContainer: {
      paddingBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 100 : 24) : isMobile ? 100 : 40,
      backgroundColor: 'transparent',
    },
    // Modern Hero Image Section
    heroImageContainer: {
      width: '100%',
      height: Platform.OS === 'web' ? (screenWidth < 768 ? 200 : 260) : 220,
      backgroundColor: '#F1F5F9',
      position: 'relative',
      overflow: 'hidden',
    },
    heroImage: {
      width: '100%',
      height: '100%',
    },
    heroImagePlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F1F5F9',
    },
    heroImagePlaceholderIcon: {
      fontSize: Platform.OS === 'web' ? 64 : 48,
      opacity: 0.3,
    },
    ratingBadgeOverlay: {
      position: 'absolute',
      top: Platform.OS === 'web' ? 20 : 16,
      right: Platform.OS === 'web' ? 20 : 16,
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
      paddingVertical: Platform.OS === 'web' ? 6 : 5,
      flexDirection: 'row',
      alignItems: 'center',
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
    ratingBadgeIcon: {
      fontSize: Platform.OS === 'web' ? 18 : 16,
      marginRight: 6,
    },
    ratingBadgeText: {
      color: '#0F172A',
      fontSize: Platform.OS === 'web' ? 13 : 12,
      fontWeight: '600',
    },
    // Modern Info Card
    infoCard: {
      marginTop: Platform.OS === 'web' ? (screenWidth < 768 ? -20 : -24) : -20,
      marginHorizontal: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 32) : 16,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 24) : 20,
      position: 'relative',
      zIndex: 2,
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
    serviceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Platform.OS === 'web' ? 24 : 20,
    },
    serviceHeaderLeft: {
      flex: 1,
    },
    serviceName: {
      fontSize: Platform.OS === 'web' ? (screenWidth < 768 ? 20 : 24) : 22,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 8 : 10) : 8,
      lineHeight: Platform.OS === 'web' ? (screenWidth < 768 ? 26 : 32) : 28,
    },
    serviceMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    providerBadge: {
      backgroundColor: '#F8FAFC',
      borderRadius: 20,
      paddingHorizontal: Platform.OS === 'web' ? 14 : 12,
      paddingVertical: Platform.OS === 'web' ? 6 : 5,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    providerBadgeText: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: '#475569',
      fontWeight: '700',
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      paddingHorizontal: Platform.OS === 'web' ? 14 : 12,
      paddingVertical: Platform.OS === 'web' ? 6 : 5,
    },
    ratingStar: {
      fontSize: Platform.OS === 'web' ? 16 : 14,
      marginRight: 4,
    },
    ratingValue: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      fontWeight: '600',
      color: '#0F172A',
      marginRight: 4,
    },
    reviewCount: {
      fontSize: Platform.OS === 'web' ? 13 : 12,
      color: '#64748B',
      fontWeight: '600',
    },
    categoryBadge: {
      width: Platform.OS === 'web' ? 56 : 48,
      height: Platform.OS === 'web' ? 56 : 48,
      borderRadius: Platform.OS === 'web' ? 28 : 24,
      backgroundColor: '#F8FAFC',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    categoryIcon: {
      fontSize: Platform.OS === 'web' ? 28 : 24,
    },
    // Price Card - Prominent
    priceCard: {
      backgroundColor: '#F8FAFC',
      borderRadius: Platform.OS === 'web' ? 12 : 12,
      padding: Platform.OS === 'web' ? 20 : 16,
      marginBottom: Platform.OS === 'web' ? 20 : 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    priceLabel: {
      fontSize: Platform.OS === 'web' ? 13 : 12,
      color: '#64748B',
      fontWeight: '600',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flexWrap: 'wrap',
    },
    priceValue: {
      fontSize: Platform.OS === 'web' ? (screenWidth < 768 ? 22 : 26) : 24,
      fontWeight: '700',
      color: '#0F172A',
      marginRight: 8,
    },
    pricingTypeBadge: {
      backgroundColor: '#F1F5F9',
      borderRadius: 6,
      paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
      paddingVertical: Platform.OS === 'web' ? 6 : 5,
      alignSelf: 'flex-start',
    },
    pricingTypeText: {
      fontSize: Platform.OS === 'web' ? 13 : 12,
      color: '#64748B',
      fontWeight: '600',
    },
    // Modern Card Styles
    descriptionCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: Platform.OS === 'web' ? (screenWidth < 768 ? 12 : 16) : 16,
      padding: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 24) : 24,
      marginBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 20,
      marginHorizontal: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 32) : 20,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }),
    },
    detailsCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: Platform.OS === 'web' ? (screenWidth < 768 ? 12 : 16) : 16,
      padding: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 24) : 24,
      marginBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 20,
      marginHorizontal: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 32) : 20,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }),
    },
    cardTitle: {
      fontSize: Platform.OS === 'web' ? (screenWidth < 768 ? 18 : 22) : 20,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 16,
      letterSpacing: -0.3,
    },
    descriptionText: {
      fontSize: Platform.OS === 'web' ? 16 : 15,
      color: '#475569',
      lineHeight: Platform.OS === 'web' ? 28 : 24,
      fontWeight: '500',
    },
    detailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Platform.OS === 'web' ? 16 : 12,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
      borderRadius: Platform.OS === 'web' ? 16 : 14,
      padding: Platform.OS === 'web' ? 20 : 16,
      flex: Platform.OS === 'web' ? 1 : undefined,
      minWidth: Platform.OS === 'web' ? 200 : '100%',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    detailIcon: {
      fontSize: Platform.OS === 'web' ? 28 : 24,
      marginRight: Platform.OS === 'web' ? 16 : 12,
    },
    detailContent: {
      flex: 1,
    },
    detailLabel: {
      fontSize: Platform.OS === 'web' ? 13 : 12,
      color: '#64748B',
      fontWeight: '600',
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    detailValue: {
      fontSize: Platform.OS === 'web' ? 18 : 16,
      color: '#0F172A',
      fontWeight: '700',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: 12,
    },
    locationCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: Platform.OS === 'web' ? (screenWidth < 768 ? 12 : 16) : 16,
      padding: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 24) : 24,
      marginBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 20,
      marginHorizontal: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 32) : 20,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }),
    },
    locationContent: {
      backgroundColor: '#F8FAFC',
      borderRadius: Platform.OS === 'web' ? 12 : 10,
      padding: Platform.OS === 'web' ? 20 : 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    locationText: {
      fontSize: Platform.OS === 'web' ? 15 : 14,
      color: '#0F172A',
      marginBottom: 8,
      lineHeight: Platform.OS === 'web' ? 24 : 22,
      fontWeight: '600',
    },
    locationCity: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: '#64748B',
      fontWeight: '500',
    },
    galleryCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: Platform.OS === 'web' ? (screenWidth < 768 ? 12 : 16) : 16,
      padding: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 24) : 24,
      marginBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 20,
      marginHorizontal: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 32) : 20,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }),
    },
    galleryScroll: {
      marginTop: 16,
    },
    galleryScrollContent: {
      paddingRight: Platform.OS === 'web' ? 0 : 20,
    },
    galleryImageContainer: {
      marginRight: Platform.OS === 'web' ? 16 : 12,
      borderRadius: Platform.OS === 'web' ? 16 : 12,
      overflow: 'hidden',
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
    galleryImage: {
      width: Platform.OS === 'web' ? Math.min(240, screenWidth - 48) : 200,
      height: Platform.OS === 'web' ? Math.min(180, (screenWidth - 48) * 0.75) : 150,
    },
    reviewsCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: Platform.OS === 'web' ? (screenWidth < 768 ? 12 : 16) : 16,
      padding: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 24) : 24,
      marginBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 24 : 32) : 32,
      marginTop: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 20,
      marginHorizontal: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 32) : 20,
      minHeight: 120,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }),
    },
    reviewsLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      gap: 12,
    },
    reviewsLoadingText: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: '#64748B',
    },
    reviewsList: {
      marginTop: 16,
      gap: Platform.OS === 'web' ? 20 : 16,
    },
    reviewItem: {
      paddingBottom: Platform.OS === 'web' ? 20 : 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    reviewUserInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    reviewAvatar: {
      width: Platform.OS === 'web' ? 48 : 40,
      height: Platform.OS === 'web' ? 48 : 40,
      borderRadius: Platform.OS === 'web' ? 24 : 20,
      marginRight: 12,
    },
    reviewAvatarPlaceholder: {
      width: Platform.OS === 'web' ? 48 : 40,
      height: Platform.OS === 'web' ? 48 : 40,
      borderRadius: Platform.OS === 'web' ? 24 : 20,
      backgroundColor: '#0F172A',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    reviewAvatarText: {
      color: '#FFFFFF',
      fontSize: Platform.OS === 'web' ? 18 : 16,
      fontWeight: '700',
    },
    reviewUserDetails: {
      flex: 1,
    },
    reviewUserName: {
      fontSize: Platform.OS === 'web' ? 16 : 15,
      fontWeight: '700',
      color: '#0F172A',
      marginBottom: 4,
    },
    reviewDate: {
      fontSize: Platform.OS === 'web' ? 13 : 12,
      color: '#64748B',
    },
    reviewRating: {
      marginLeft: 12,
    },
    reviewRatingText: {
      fontSize: Platform.OS === 'web' ? 16 : 14,
    },
    reviewComment: {
      fontSize: Platform.OS === 'web' ? 15 : 14,
      color: '#334155',
      lineHeight: Platform.OS === 'web' ? 24 : 22,
    },
    reviewsEmpty: {
      paddingVertical: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reviewsEmptyIcon: {
      fontSize: Platform.OS === 'web' ? 48 : 40,
      marginBottom: 12,
    },
    reviewsEmptyText: {
      fontSize: Platform.OS === 'web' ? 15 : 14,
      color: '#64748B',
      fontStyle: 'italic',
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    footer: {
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
      paddingHorizontal: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 32) : 20,
      paddingTop: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 20,
      paddingBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 20 : 24) : isMobile ? 20 : 24,
      position: 'relative',
      zIndex: 10,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }),
    },
    footerButtons: {
      flexDirection: 'row',
      gap: Platform.OS === 'web' ? (screenWidth < 768 ? 12 : 16) : 12,
      alignItems: 'stretch',
    },
    modernBookButton: {
      flex: 1,
      backgroundColor: '#0F172A',
      paddingVertical: Platform.OS === 'web' ? 12 : 12,
      paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      minHeight: 44,
      gap: 8,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.3s ease',
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
    modernBookButtonFull: {
      ...(Platform.OS === 'web'
        ? {
            maxWidth: screenWidth < 768 ? '100%' : 400,
            alignSelf: 'center',
            width: '100%',
          }
        : {}),
    },
    viewProfileButton: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      paddingVertical: Platform.OS === 'web' ? 12 : 12,
      paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      minHeight: 44,
      gap: 8,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.3s ease',
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
    viewProfileButtonIcon: {
      fontSize: Platform.OS === 'web' ? (screenWidth < 768 ? 20 : 24) : 22,
    },
    viewProfileButtonText: {
      color: '#334155',
      fontSize: 14,
      fontWeight: '600',
    },
    modernBookButtonIcon: {
      fontSize: Platform.OS === 'web' ? (screenWidth < 768 ? 20 : 24) : 22,
    },
    modernBookButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    bookNowButton: {
      backgroundColor: '#0F172A',
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web'
        ? { cursor: 'pointer', transition: 'background-color 0.15s ease' }
        : {}),
    },
    bookNowButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyStateText: {
      fontSize: 16,
      color: '#64748B',
    },
    // Package styles
    packagesCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: isMobile ? 16 : 20,
      marginBottom: 16,
      ...(Platform.OS === 'web'
        ? { boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)' }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 3,
            elevation: 1,
          }),
    },
    packagesSubtitle: {
      fontSize: 13,
      color: '#64748B',
      marginBottom: 16,
      marginTop: -4,
    },
  });
