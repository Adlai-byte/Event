import { StyleSheet, Platform } from 'react-native';

export const createStyles = (isMobile: boolean, screenWidth: number, isMobileWeb: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: Platform.OS === 'web' ? 48 : 80,
      flexGrow: 1,
      width: '100%',
    },
    heroSection: {
      backgroundColor: '#FFFFFF',
      paddingTop: isMobile ? 24 : 32,
      paddingBottom: isMobile ? 24 : 32,
      paddingHorizontal: isMobile ? 16 : 24,
      marginBottom: isMobile ? 16 : 24,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    heroContent: {
      width: '100%',
    },
    heroTitle: {
      fontSize: isMobile ? 24 : 28,
      fontWeight: '700',
      color: '#0F172A',
      marginBottom: 8,
      letterSpacing: 0,
    },
    heroSubtitle: {
      fontSize: isMobile ? 15 : 16,
      color: '#64748B',
      marginBottom: 20,
      lineHeight: isMobile ? 22 : 24,
    },
    modernSearchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: isMobileWeb
              ? '0px 1px 3px rgba(0, 0, 0, 0.04)'
              : '0px 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'box-shadow 0.15s ease',
            position: 'relative' as any,
            zIndex: 1,
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
          }),
    },
    searchIconContainer: {
      marginRight: Platform.OS === 'web' ? (isMobileWeb ? 8 : 12) : 10,
    },
    modernSearchInput: {
      flex: 1,
      fontSize: Platform.OS === 'web' ? (isMobileWeb ? 14 : 16) : 15,
      color: '#0f172a', // High contrast: 15.8:1 on white
      paddingVertical: Platform.OS === 'web' ? (isMobileWeb ? 10 : 14) : 12,
      fontWeight: '500',
      lineHeight: Platform.OS === 'web' ? (isMobileWeb ? 20 : 24) : 22,
      minWidth: 0, // Allow text input to shrink on mobile
    },
    modernSearchButton: {
      backgroundColor: '#0F172A',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      marginLeft: 4,
      ...(Platform.OS === 'web'
        ? { cursor: 'pointer', transition: 'background-color 0.15s ease' }
        : {}),
    },
    modernSearchButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: Platform.OS === 'web' ? 40 : 20,
      marginTop: Platform.OS === 'web' ? 20 : 10,
      marginBottom: Platform.OS === 'web' ? 30 : 20,
      backgroundColor: '#FFFFFF',
      borderRadius: Platform.OS === 'web' ? 16 : 25,
      paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
      paddingVertical: Platform.OS === 'web' ? 16 : 12,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }
        : {
            ...((Platform.OS as string) !== 'web' && {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }),
          }),
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: '#333',
    },
    searchButton: {
      padding: 8,
    },
    searchIcon: {
      fontSize: 20,
      color: '#2563EB',
    },
    welcomeContainer: {
      paddingHorizontal: Platform.OS === 'web' ? 20 : 20,
      marginBottom: Platform.OS === 'web' ? 35 : 25,
      marginTop: Platform.OS === 'web' ? 10 : 0,
    },
    welcomeTitle: {
      fontSize: Platform.OS === 'web' ? 32 : 24,
      fontWeight: 'bold',
      color: '#0F172A',
      marginBottom: Platform.OS === 'web' ? 8 : 5,
      ...(Platform.OS === 'web'
        ? {
            letterSpacing: -0.5,
          }
        : {}),
    },
    welcomeSubtitle: {
      fontSize: Platform.OS === 'web' ? 18 : 16,
      color: '#64748B',
      ...(Platform.OS === 'web'
        ? {
            letterSpacing: 0.2,
          }
        : {}),
    },
    loadingContainer: {
      padding: 40,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      color: '#64748B',
    },
    quickActionsContainer: {
      paddingHorizontal: 20,
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: Platform.OS === 'web' ? (isMobileWeb ? 24 : 28) : 26,
      fontWeight: Platform.OS === 'web' ? '600' : '700',
      color: '#0f172a',
      marginBottom: Platform.OS === 'web' ? (isMobileWeb ? 20 : 24) : 22,
      marginTop: Platform.OS === 'web' ? 0 : 8,
      paddingBottom: Platform.OS === 'web' ? (isMobileWeb ? 14 : 16) : 14,
      borderBottomWidth: 0,
      borderBottomColor: 'transparent',
      alignSelf: 'flex-start',
      paddingRight: Platform.OS === 'web' ? (isMobileWeb ? 20 : 24) : 24,
      paddingLeft: Platform.OS === 'web' ? 0 : 4,
      ...(Platform.OS === 'web'
        ? {
            letterSpacing: 0,
          }
        : {
            letterSpacing: 0,
          }),
    },
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    quickActionButton: {
      width: (screenWidth - 60) / 2,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      alignItems: 'center',
      marginBottom: 15,
      position: 'relative',
    },
    quickActionIcon: {
      fontSize: 32,
      marginBottom: 8,
    },
    quickActionText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0F172A',
    },
    badge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: '#EF4444',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },
    categoriesContainer: {
      marginBottom: Platform.OS === 'web' ? 48 : 40,
      marginTop: Platform.OS === 'web' ? 32 : 28,
      paddingHorizontal: Platform.OS === 'web' ? 24 : 24,
      paddingVertical: Platform.OS === 'web' ? 32 : 28,
      paddingTop: Platform.OS === 'web' ? 32 : 28,
      backgroundColor: '#FFFFFF',
      borderRadius: Platform.OS === 'web' ? 20 : 18,
      marginHorizontal: Platform.OS === 'web' ? 24 : 16,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }),
    },
    categoriesScrollView: {
      paddingLeft: 20,
    },
    categoriesScrollContent: {
      paddingRight: 20,
    },
    // Banner Slider Styles
    bannerContainer: {
      marginBottom: Platform.OS === 'web' ? 32 : 28,
      marginTop: Platform.OS === 'web' ? 24 : 24,
      marginHorizontal: Platform.OS === 'web' ? 24 : 16,
      paddingVertical: Platform.OS === 'web' ? 0 : 8,
    },
    bannerHeader: {
      marginBottom: Platform.OS === 'web' ? 20 : 20,
      marginTop: Platform.OS === 'web' ? 0 : 8,
      paddingHorizontal: Platform.OS === 'web' ? 0 : 4,
    },
    bannerTitle: {
      fontSize: Platform.OS === 'web' ? 26 : 24,
      fontWeight: '600',
      color: '#0F172A',
      paddingBottom: Platform.OS === 'web' ? 12 : 12,
      alignSelf: 'flex-start',
      paddingRight: Platform.OS === 'web' ? 24 : 24,
      paddingLeft: Platform.OS === 'web' ? 0 : 4,
    },
    bannerScrollView: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    bannerScrollContent: {
      paddingHorizontal: 0,
    },
    bannerSlide: {
      width: screenWidth - (Platform.OS === 'web' ? 48 : 32),
      marginRight: Platform.OS === 'web' ? 0 : 0,
    },
    bannerCard: {
      width: '100%',
      height: Platform.OS === 'web' ? (isMobileWeb ? 240 : 280) : 220,
      borderRadius: 16,
      overflow: 'hidden',
      position: 'relative',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
          }),
    },
    bannerImage: {
      width: '100%',
      height: '100%',
      position: 'absolute',
    },
    bannerImagePlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
    },
    bannerImageIcon: {
      fontSize: 80,
    },
    bannerOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '65%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    bannerContent: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: Platform.OS === 'web' ? 20 : 16,
      zIndex: 2,
    },
    bannerBadgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Platform.OS === 'web' ? 6 : 4,
      marginBottom: Platform.OS === 'web' ? 6 : 4,
      flexWrap: 'wrap',
    },
    bannerBadge: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      paddingHorizontal: Platform.OS === 'web' ? 10 : 8,
      paddingVertical: Platform.OS === 'web' ? 4 : 3,
      borderRadius: 12,
    },
    bannerBadgeText: {
      color: '#0F172A',
      fontSize: Platform.OS === 'web' ? 11 : 10,
      fontWeight: '600',
    },
    bannerServiceName: {
      fontSize: Platform.OS === 'web' ? (isMobileWeb ? 18 : 20) : 18,
      fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: Platform.OS === 'web' ? 4 : 4,
    },
    bannerProviderName: {
      fontSize: Platform.OS === 'web' ? 13 : 12,
      fontWeight: '500',
      color: '#E2E8F0',
      marginBottom: Platform.OS === 'web' ? 6 : 4,
    },
    bannerRating: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Platform.OS === 'web' ? 6 : 4,
      gap: 6,
    },
    bannerRatingText: {
      fontSize: Platform.OS === 'web' ? 13 : 12,
      fontWeight: '600',
      color: '#FFD700',
    },
    bannerReviewCount: {
      fontSize: Platform.OS === 'web' ? 12 : 11,
      color: '#E2E8F0',
    },
    bannerPrice: {
      fontSize: Platform.OS === 'web' ? 18 : 16,
      fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: Platform.OS === 'web' ? 10 : 8,
    },
    bannerActions: {
      flexDirection: 'row',
      gap: Platform.OS === 'web' ? 10 : 8,
    },
    bannerViewButton: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      paddingVertical: Platform.OS === 'web' ? 8 : 8,
      paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
      borderRadius: Platform.OS === 'web' ? 10 : 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.6)',
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? {
            transition: 'box-shadow 0.15s ease',
            cursor: 'pointer',
          }
        : {}),
    },
    bannerViewButtonText: {
      color: '#FFFFFF',
      fontSize: Platform.OS === 'web' ? 13 : 12,
      fontWeight: '600',
    },
    bannerBookButton: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      paddingVertical: Platform.OS === 'web' ? 8 : 8,
      paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
      borderRadius: Platform.OS === 'web' ? 10 : 8,
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? {
            transition: 'box-shadow 0.15s ease',
            cursor: 'pointer',
          }
        : {}),
    },
    bannerBookButtonText: {
      color: '#0F172A',
      fontSize: Platform.OS === 'web' ? 13 : 12,
      fontWeight: '600',
    },
    bannerPagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: Platform.OS === 'web' ? 16 : 12,
      gap: 8,
    },
    bannerDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#CBD5E1',
      ...(Platform.OS === 'web'
        ? {
            transition: 'box-shadow 0.15s ease',
          }
        : {}),
    },
    bannerDotActive: {
      width: 20,
      backgroundColor: '#0F172A',
    },
    // Modern Category Cards (matching service card style)
    modernCategoryCard: {
      width: Platform.OS === 'web' ? 320 : 280,
      backgroundColor: '#FFFFFF',
      borderRadius: Platform.OS === 'web' ? 16 : 14,
      overflow: 'hidden',
      marginRight: Platform.OS === 'web' ? 20 : 16,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
            borderWidth: 1,
            borderColor: '#F1F5F9',
            transition: 'box-shadow 0.15s ease',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
          }),
    },
    modernCategoryImageContainer: {
      width: '100%',
      height: Platform.OS === 'web' ? 180 : 160,
      position: 'relative',
      backgroundColor: '#F1F5F9',
    },
    modernCategoryImage: {
      width: '100%',
      height: '100%',
    },
    modernCategoryImagePlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F1F5F9',
    },
    categoryEmoji: {
      fontSize: Platform.OS === 'web' ? 64 : 56,
    },
    categoryCountBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: '#0F172A',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
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
    categoryCountBadgeText: {
      color: '#FFFFFF',
      fontSize: Platform.OS === 'web' ? 12 : 11,
      fontWeight: '700',
    },
    modernCategoryInfo: {
      padding: Platform.OS === 'web' ? 20 : 16,
    },
    modernCategoryTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Platform.OS === 'web' ? 8 : 6,
      gap: Platform.OS === 'web' ? 8 : 6,
    },
    modernCategoryTitle: {
      fontSize: Platform.OS === 'web' ? 20 : 18,
      fontWeight: '600',
      color: '#0F172A',
      flex: 1,
      lineHeight: Platform.OS === 'web' ? 26 : 24,
    },
    modernCategoryMeta: {
      marginBottom: Platform.OS === 'web' ? 14 : 12,
    },
    modernCategoryCountText: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: '#475569',
      fontWeight: '600',
    },
    modernCategoryActions: {
      flexDirection: 'row',
      paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
      paddingBottom: Platform.OS === 'web' ? 20 : 16,
    },
    modernCategoryViewButton: {
      flex: 1,
      backgroundColor: '#0F172A',
      paddingVertical: Platform.OS === 'web' ? 14 : 12,
      borderRadius: Platform.OS === 'web' ? 12 : 10,
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? {
            transition: 'box-shadow 0.15s ease',
            cursor: 'pointer',
          }
        : {}),
    },
    modernCategoryViewButtonText: {
      color: '#FFFFFF',
      fontSize: Platform.OS === 'web' ? 15 : 14,
      fontWeight: '700',
    },
    categoryCard: {
      width: Platform.OS === 'web' ? 140 : 120,
      backgroundColor: '#FFFFFF',
      borderRadius: Platform.OS === 'web' ? 16 : 12,
      padding: Platform.OS === 'web' ? 20 : 15,
      alignItems: 'center',
      marginRight: Platform.OS === 'web' ? 20 : 15,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
            borderWidth: 1,
            borderColor: '#F1F3F5',
            transition: 'box-shadow 0.15s ease',
            cursor: 'pointer',
          }
        : {
            ...((Platform.OS as string) !== 'web' && {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }),
          }),
    },
    categoryIcon: {
      fontSize: 32,
      marginBottom: 8,
    },
    categoryLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0F172A',
      textAlign: 'center',
      marginBottom: 4,
    },
    categoryCount: {
      fontSize: 11,
      color: '#64748B',
    },
    servicesContainer: {
      marginBottom: Platform.OS === 'web' ? (isMobileWeb ? 32 : 48) : 40,
      marginTop: Platform.OS === 'web' ? (isMobileWeb ? 24 : 32) : 28,
      paddingHorizontal: Platform.OS === 'web' ? (isMobileWeb ? 16 : 24) : 24,
      paddingVertical: Platform.OS === 'web' ? (isMobileWeb ? 20 : 32) : 28,
      paddingTop: Platform.OS === 'web' ? (isMobileWeb ? 20 : 32) : 28,
      backgroundColor: '#FFFFFF',
      borderRadius: Platform.OS === 'web' ? (isMobileWeb ? 16 : 20) : 18,
      marginHorizontal: Platform.OS === 'web' ? (isMobileWeb ? 16 : 24) : 16,
      overflow: 'hidden',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }),
    },
    seeAllText: {
      fontSize: 14,
      color: '#2563EB',
      fontWeight: '600',
    },
    servicesScrollView: {
      paddingLeft: 20,
    },
    servicesScrollContent: {
      paddingRight: 20,
    },
    // Modern Service Cards
    modernServiceCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: Platform.OS === 'web' ? (isMobileWeb ? 16 : 20) : 18,
      marginRight: Platform.OS === 'web' ? 0 : 0,
      marginBottom: Platform.OS === 'web' ? 0 : 16,
      width: Platform.OS === 'web' ? (isMobileWeb ? '100%' : ('calc(25% - 18px)' as any)) : '100%', // Full width on mobile web, 4 columns on desktop
      overflow: 'hidden',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            transition: 'box-shadow 0.15s ease',
            cursor: 'pointer',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
          }),
    },
    modernServiceImageContainer: {
      width: '100%',
      height: Platform.OS === 'web' ? (isMobileWeb ? 180 : 200) : 220,
      backgroundColor: '#F8FAFC',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
    },
    modernServiceImage: {
      width: '100%',
      height: '100%',
    },
    modernServiceImagePlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F1F5F9',
    },
    featuredBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: '#10B981',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
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
    featuredBadgeText: {
      color: '#FFFFFF',
      fontSize: Platform.OS === 'web' ? 12 : 11,
      fontWeight: '700',
    },
    modernServiceInfo: {
      padding: Platform.OS === 'web' ? (isMobileWeb ? 16 : 20) : 16,
    },
    modernServiceTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Platform.OS === 'web' ? (isMobileWeb ? 6 : 8) : 6,
      gap: Platform.OS === 'web' ? (isMobileWeb ? 6 : 8) : 6,
    },
    modernServiceTitle: {
      fontSize: Platform.OS === 'web' ? (isMobileWeb ? 18 : 20) : 18,
      fontWeight: '600',
      color: '#0F172A',
      flex: 1,
      lineHeight: Platform.OS === 'web' ? (isMobileWeb ? 24 : 26) : 24,
    },
    modernServiceProvider: {
      fontSize: Platform.OS === 'web' ? (isMobileWeb ? 13 : 14) : 13,
      color: '#475569', // Better contrast: 7.4:1 on white (was #64748b - 5.2:1)
      marginBottom: Platform.OS === 'web' ? (isMobileWeb ? 10 : 12) : 10,
      fontWeight: '600', // Increased for better readability
    },
    modernServiceMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Platform.OS === 'web' ? (isMobileWeb ? 12 : 14) : 12,
    },
    modernRatingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
      paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
      paddingVertical: Platform.OS === 'web' ? 6 : 5,
      borderRadius: Platform.OS === 'web' ? 20 : 18,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    modernRatingStar: {
      fontSize: Platform.OS === 'web' ? 16 : 14,
      marginRight: 4,
    },
    modernRatingText: {
      fontSize: Platform.OS === 'web' ? 15 : 14,
      fontWeight: '700',
      color: '#78350F',
      marginRight: 4,
    },
    modernReviewCount: {
      fontSize: Platform.OS === 'web' ? 13 : 12,
      color: '#78350F',
      fontWeight: '600',
    },
    newBadge: {
      backgroundColor: '#FEF3C7',
      color: '#92400e',
      fontSize: Platform.OS === 'web' ? 12 : 11,
      fontWeight: '700',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    modernLocationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginLeft: 8,
    },
    modernLocationIcon: {
      fontSize: Platform.OS === 'web' ? 14 : 12,
      marginRight: 4,
    },
    modernLocationText: {
      fontSize: Platform.OS === 'web' ? 13 : 12,
      color: '#475569', // Better contrast: 7.4:1 (was #64748b - 5.2:1)
      fontWeight: '600', // Increased for readability
      flex: 1,
      flexWrap: 'wrap',
    },
    modernDistanceText: {
      fontSize: Platform.OS === 'web' ? 13 : 12,
      color: '#64748B', // Darker green for better contrast: 4.8:1 (was #10b981 - 3.1:1)
      fontWeight: '700',
      marginLeft: 4,
    },
    modernPriceContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: Platform.OS === 'web' ? (isMobileWeb ? 14 : 16) : 14,
      paddingTop: Platform.OS === 'web' ? (isMobileWeb ? 10 : 12) : 10,
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
    },
    modernPriceLabel: {
      fontSize: Platform.OS === 'web' ? (isMobileWeb ? 11 : 12) : 11,
      color: '#475569', // Better contrast: 7.4:1 (was #64748b - 5.2:1)
      fontWeight: '600', // Increased for readability
      marginRight: 6,
    },
    modernPrice: {
      fontSize: Platform.OS === 'web' ? (isMobileWeb ? 22 : 24) : 22,
      fontWeight: '700',
      color: '#0F172A',
    },
    modernServiceActions: {
      flexDirection: 'row',
      paddingHorizontal: Platform.OS === 'web' ? (isMobileWeb ? 16 : 20) : 16,
      paddingBottom: Platform.OS === 'web' ? (isMobileWeb ? 16 : 20) : 16,
      gap: Platform.OS === 'web' ? (isMobileWeb ? 10 : 12) : 10,
    },
    modernViewButton: {
      flex: 1,
      backgroundColor: '#F8FAFC',
      paddingVertical: Platform.OS === 'web' ? (isMobileWeb ? 12 : 14) : 12,
      borderRadius: Platform.OS === 'web' ? (isMobileWeb ? 10 : 12) : 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            transition: 'box-shadow 0.15s ease',
            cursor: 'pointer',
          }
        : {}),
    },
    modernViewButtonText: {
      color: '#334155', // Better contrast: 9.5:1 on light gray (was #475569)
      fontSize: Platform.OS === 'web' ? (isMobileWeb ? 14 : 15) : 14,
      fontWeight: '700',
    },
    modernBookButton: {
      flex: 1,
      backgroundColor: '#0F172A',
      paddingVertical: Platform.OS === 'web' ? (isMobileWeb ? 12 : 14) : 12,
      borderRadius: Platform.OS === 'web' ? (isMobileWeb ? 10 : 12) : 10,
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? {
            transition: 'box-shadow 0.15s ease',
            cursor: 'pointer',
          }
        : {}),
    },
    modernBookButtonText: {
      color: '#FFFFFF', // High contrast: 12.6:1 on #4f46e5
      fontSize: Platform.OS === 'web' ? (isMobileWeb ? 14 : 15) : 14,
      fontWeight: '700',
    },
    modernProfileButton: {
      flex: 1,
      backgroundColor: '#10B981',
      paddingVertical: Platform.OS === 'web' ? 14 : 12,
      borderRadius: Platform.OS === 'web' ? 12 : 10,
      alignItems: 'center',
      marginHorizontal: Platform.OS === 'web' ? 6 : 5,
      ...(Platform.OS === 'web'
        ? {
            transition: 'box-shadow 0.15s ease',
            cursor: 'pointer',
          }
        : {}),
    },
    modernProfileButtonText: {
      color: '#FFFFFF',
      fontSize: Platform.OS === 'web' ? 15 : 14,
      fontWeight: '700',
    },
    serviceCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 0,
      marginRight: 15,
      width: 280,
      overflow: 'hidden',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
          }),
    },
    serviceCardGrid: {
      width: '100%',
      marginRight: 0,
    },
    serviceImageContainer: {
      width: '100%',
      height: 160,
      backgroundColor: '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    serviceImage: {
      width: '100%',
      height: '100%',
    },
    serviceEmoji: {
      fontSize: 56,
    },
    serviceInfo: {
      padding: 16,
      paddingBottom: 12,
    },
    serviceTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 6,
      gap: 8,
    },
    serviceTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#0F172A',
      flex: 1,
      letterSpacing: -0.3,
    },
    serviceProvider: {
      fontSize: 14,
      color: '#64748B',
      marginBottom: 8,
      fontWeight: '500',
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      backgroundColor: '#F8FAFC',
      paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
      paddingVertical: Platform.OS === 'web' ? 6 : 5,
      borderRadius: Platform.OS === 'web' ? 20 : 18,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    ratingText: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: '#0F172A',
      marginRight: 4,
      fontWeight: '700',
    },
    reviewCount: {
      fontSize: Platform.OS === 'web' ? 13 : 12,
      color: '#64748B',
      fontWeight: '600',
    },
    servicePrice: {
      fontSize: 20,
      fontWeight: '700',
      color: '#0F172A',
      marginBottom: 6,
    },
    locationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    serviceLocation: {
      fontSize: 13,
      color: '#64748B',
      fontWeight: '500',
      flexWrap: 'wrap',
    },
    distanceText: {
      fontSize: 13,
      color: '#64748B',
      fontWeight: '600',
    },
    serviceActions: {
      flexDirection: 'row',
      paddingHorizontal: isMobile ? 12 : 16,
      paddingBottom: isMobile ? 12 : 16,
      gap: isMobile ? 8 : 10,
    },
    viewDetailsButton: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      paddingVertical: isMobile ? 16 : 14,
      paddingHorizontal: isMobile ? 12 : 16,
      borderRadius: isMobile ? 10 : 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      minHeight: isMobile ? 48 : undefined,
    },
    viewDetailsButtonText: {
      color: '#334155',
      fontSize: isMobile ? 14 : 15,
      fontWeight: '700',
      letterSpacing: isMobile ? 0.3 : 0.2,
    },
    bookNowButton: {
      flex: 1,
      backgroundColor: '#0F172A',
      paddingVertical: isMobile ? 16 : 14,
      paddingHorizontal: isMobile ? 12 : 16,
      borderRadius: isMobile ? 10 : 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: isMobile ? 48 : undefined,
    },
    bookNowButtonText: {
      color: '#FFFFFF',
      fontSize: isMobile ? 14 : 15,
      fontWeight: '700',
      letterSpacing: isMobile ? 0.3 : 0.2,
    },
    profileButtonAction: {
      flex: 1,
      backgroundColor: '#10B981',
      paddingVertical: isMobile ? 16 : 14,
      paddingHorizontal: isMobile ? 12 : 16,
      borderRadius: isMobile ? 10 : 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: isMobile ? 48 : undefined,
      marginHorizontal: isMobile ? 4 : 5,
    },
    profileButtonText: {
      color: '#FFFFFF',
      fontSize: isMobile ? 14 : 15,
      fontWeight: '700',
      letterSpacing: isMobile ? 0.3 : 0.2,
    },
    searchResultsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Platform.OS === 'web' ? 20 : 20,
      paddingVertical: Platform.OS === 'web' ? 20 : 15,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    searchResultsTitle: {
      fontSize: Platform.OS === 'web' ? 24 : 20,
      fontWeight: '700',
      color: '#0F172A',
      flex: 1,
      textAlign: 'center',
    },
    categoryFilterHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Platform.OS === 'web' ? 20 : 24,
      paddingVertical: Platform.OS === 'web' ? 15 : 18,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    categoryFilterTitle: {
      fontSize: Platform.OS === 'web' ? 20 : 24,
      fontWeight: '600',
      color: '#0F172A',
      flex: 1,
      textAlign: 'center',
    },
    backButton: {
      padding: 8,
    },
    backButtonText: {
      fontSize: 16,
      color: '#64748B',
      fontWeight: '600',
    },
    placeholder: {
      width: 60,
    },
    servicesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      ...(Platform.OS === 'web'
        ? {
            gap: isMobileWeb ? 16 : 24,
            justifyContent: 'flex-start',
          }
        : {
            gap: 16,
            paddingHorizontal: 0,
            paddingBottom: 20,
            justifyContent: 'flex-start',
          }),
    },
    servicesRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Platform.OS === 'web' ? 20 : 16,
      width: '100%',
      paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
      gap: Platform.OS === 'web' ? 24 : 12,
    },
    serviceCardWrapper: {
      ...(Platform.OS === 'web'
        ? {
            width: '48%',
          }
        : {
            width: '100%', // Full width on mobile (1 column)
          }),
      marginBottom: Platform.OS === 'web' ? 0 : 16,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 20,
    },
    emptyStateIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyStateText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#64748B',
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: '#95A5A6',
      textAlign: 'center',
    },
    searchResultsScroll: {
      flex: 1,
    },
    providersSection: {
      paddingHorizontal: Platform.OS === 'web' ? 32 : 20,
      paddingTop: Platform.OS === 'web' ? 32 : 24,
      paddingBottom: Platform.OS === 'web' ? 24 : 20,
      marginBottom: Platform.OS === 'web' ? 32 : 24,
      backgroundColor: '#FFFFFF',
      borderRadius: Platform.OS === 'web' ? 20 : 16,
      marginHorizontal: Platform.OS === 'web' ? 24 : 16,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
          }),
    },
    sectionTitleSecondary: {
      fontSize: Platform.OS === 'web' ? 26 : 24,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: Platform.OS === 'web' ? 24 : 22,
      marginTop: Platform.OS === 'web' ? 0 : 8,
      paddingBottom: Platform.OS === 'web' ? 16 : 14,
      alignSelf: 'flex-start',
      paddingRight: Platform.OS === 'web' ? 24 : 24,
      paddingLeft: Platform.OS === 'web' ? 0 : 4,
    },
    providersContainer: {
      gap: 12,
    },
    providerCard: {
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderRadius: Platform.OS === 'web' ? 16 : 14,
      padding: Platform.OS === 'web' ? 20 : 16,
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
            transition: 'box-shadow 0.15s ease',
            cursor: 'pointer',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
          }),
    },
    providerImageContainer: {
      width: Platform.OS === 'web' ? 60 : 56,
      height: Platform.OS === 'web' ? 60 : 56,
      borderRadius: Platform.OS === 'web' ? 30 : 28,
      overflow: 'hidden',
      marginRight: 16,
    },
    providerImage: {
      width: '100%',
      height: '100%',
    },
    providerImagePlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: '#0F172A',
      justifyContent: 'center',
      alignItems: 'center',
    },
    providerImagePlaceholderText: {
      fontSize: Platform.OS === 'web' ? 24 : 22,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    providerInfo: {
      flex: 1,
    },
    providerName: {
      fontSize: Platform.OS === 'web' ? 18 : 16,
      fontWeight: '700',
      color: '#0F172A',
      marginBottom: 4,
    },
    providerServicesCount: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: '#64748B',
      marginBottom: 4,
    },
    providerRating: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    providerRatingText: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      fontWeight: '600',
      color: '#F59E0B',
    },
    providerReviewCount: {
      fontSize: Platform.OS === 'web' ? 13 : 12,
      color: '#94A3B8',
    },
    providerArrow: {
      marginLeft: 12,
    },
    providerArrowText: {
      fontSize: Platform.OS === 'web' ? 20 : 18,
      color: '#94A3B8',
    },
    // Filter Styles
    filterButton: {
      backgroundColor: '#F1F5F9',
      paddingHorizontal: Platform.OS === 'web' ? (isMobileWeb ? 10 : 16) : 14,
      paddingVertical: Platform.OS === 'web' ? (isMobileWeb ? 10 : 12) : 10,
      borderRadius: Platform.OS === 'web' ? (isMobileWeb ? 10 : 12) : 10,
      marginRight: Platform.OS === 'web' ? (isMobileWeb ? 6 : 8) : 6,
      position: 'relative',
      ...(Platform.OS === 'web'
        ? {
            transition: 'box-shadow 0.15s ease',
            cursor: 'pointer',
          }
        : {}),
    },
    filterButtonActive: {
      backgroundColor: '#0F172A',
    },
    filterButtonText: {
      color: '#475569',
      fontSize: Platform.OS === 'web' ? (isMobileWeb ? 12 : 14) : 13,
      fontWeight: '600',
    },
    filterButtonTextActive: {
      color: '#FFFFFF',
    },
    filterBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#10B981',
      ...(Platform.OS === 'web'
        ? {
          }
        : {}),
    },
    filterPanel: {
      backgroundColor: '#FFFFFF',
      borderRadius: Platform.OS === 'web' ? 16 : 14,
      marginTop: Platform.OS === 'web' ? 16 : 12,
      marginHorizontal: Platform.OS === 'web' ? 0 : 0,
      maxHeight: Platform.OS === 'web' ? 800 : 750,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
          }),
    },
    filterPanelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Platform.OS === 'web' ? 20 : 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    filterPanelTitle: {
      fontSize: Platform.OS === 'web' ? 20 : 18,
      fontWeight: '700',
      color: '#0f172a',
    },
    filterCloseButton: {
      fontSize: Platform.OS === 'web' ? 24 : 20,
      color: '#64748B',
      fontWeight: 'bold',
      padding: 4,
    },
    filterContent: {
      maxHeight: Platform.OS === 'web' ? 650 : 600,
    },
    filterContentContainer: {
      padding: Platform.OS === 'web' ? 20 : 16,
      paddingBottom: Platform.OS === 'web' ? 20 : 24,
    },
    filterSection: {
      marginBottom: Platform.OS === 'web' ? 24 : 20,
    },
    filterLabel: {
      fontSize: Platform.OS === 'web' ? 16 : 15,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: Platform.OS === 'web' ? 12 : 10,
    },
    priceRangeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Platform.OS === 'web' ? 12 : 10,
    },
    priceInputContainer: {
      flex: 1,
    },
    priceLabel: {
      fontSize: Platform.OS === 'web' ? 13 : 12,
      color: '#64748B',
      marginBottom: Platform.OS === 'web' ? 6 : 5,
      fontWeight: '500',
    },
    priceInput: {
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: Platform.OS === 'web' ? 10 : 8,
      paddingHorizontal: Platform.OS === 'web' ? 14 : 12,
      paddingVertical: Platform.OS === 'web' ? 12 : 10,
      fontSize: Platform.OS === 'web' ? 15 : 14,
      color: '#0f172a',
    },
    priceSeparatorContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Platform.OS === 'web' ? 8 : 6,
    },
    priceSeparator: {
      fontSize: Platform.OS === 'web' ? 18 : 16,
      color: '#64748B',
      fontWeight: '600',
    },
    filterInput: {
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: Platform.OS === 'web' ? 10 : 8,
      paddingHorizontal: Platform.OS === 'web' ? 14 : 12,
      paddingVertical: Platform.OS === 'web' ? 12 : 10,
      fontSize: Platform.OS === 'web' ? 15 : 14,
      color: '#0f172a',
    },
    radiusContainer: {
      marginTop: Platform.OS === 'web' ? 12 : 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Platform.OS === 'web' ? 12 : 10,
    },
    radiusLabel: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: '#64748B',
      fontWeight: '500',
      flex: 1,
    },
    radiusInput: {
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: Platform.OS === 'web' ? 10 : 8,
      paddingHorizontal: Platform.OS === 'web' ? 14 : 12,
      paddingVertical: Platform.OS === 'web' ? 10 : 8,
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: '#0f172a',
      width: Platform.OS === 'web' ? 100 : 80,
    },
    categoryButtonsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Platform.OS === 'web' ? 10 : 8,
    },
    categoryFilterButton: {
      paddingHorizontal: Platform.OS === 'web' ? 16 : 14,
      paddingVertical: Platform.OS === 'web' ? 10 : 8,
      borderRadius: Platform.OS === 'web' ? 10 : 8,
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            transition: 'box-shadow 0.15s ease',
            cursor: 'pointer',
          }
        : {}),
    },
    categoryFilterButtonActive: {
      backgroundColor: '#0F172A',
      borderColor: '#0F172A',
    },
    categoryFilterButtonText: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      fontWeight: '600',
      color: '#64748B',
    },
    categoryFilterButtonTextActive: {
      color: '#FFFFFF',
    },
    filterActions: {
      flexDirection: 'row',
      padding: Platform.OS === 'web' ? 20 : 16,
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
      gap: Platform.OS === 'web' ? 12 : 10,
    },
    clearFiltersButton: {
      flex: 1,
      backgroundColor: '#F1F5F9',
      paddingVertical: Platform.OS === 'web' ? 14 : 12,
      borderRadius: Platform.OS === 'web' ? 12 : 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            transition: 'box-shadow 0.15s ease',
            cursor: 'pointer',
          }
        : {}),
    },
    clearFiltersButtonText: {
      color: '#64748B',
      fontSize: Platform.OS === 'web' ? 15 : 14,
      fontWeight: '600',
    },
    applyFiltersButton: {
      flex: 1,
      backgroundColor: '#0F172A',
      paddingVertical: Platform.OS === 'web' ? 14 : 12,
      borderRadius: Platform.OS === 'web' ? 12 : 10,
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? {
            transition: 'box-shadow 0.15s ease',
            cursor: 'pointer',
          }
        : {}),
    },
    applyFiltersButtonText: {
      color: '#FFFFFF',
      fontSize: Platform.OS === 'web' ? 15 : 14,
      fontWeight: '700',
    },
    // Provider Group Styles
    providerGroup: {
      marginBottom: Platform.OS === 'web' ? 32 : 24,
      backgroundColor: '#FFFFFF',
      borderRadius: Platform.OS === 'web' ? 20 : 16,
      padding: Platform.OS === 'web' ? 24 : 20,
      marginHorizontal: Platform.OS === 'web' ? 24 : 16,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
          }),
    },
    providerGroupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: Platform.OS === 'web' ? 16 : 12,
      marginBottom: Platform.OS === 'web' ? 20 : 16,
      borderBottomWidth: 2,
      borderBottomColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
            transition: 'box-shadow 0.15s ease',
          }
        : {}),
    },
    providerGroupHeaderContent: {
      flex: 1,
    },
    providerGroupTitle: {
      fontSize: Platform.OS === 'web' ? 22 : 20,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: Platform.OS === 'web' ? 4 : 2,
    },
    providerGroupCount: {
      fontSize: Platform.OS === 'web' ? 14 : 13,
      color: '#64748B',
      fontWeight: '500',
    },
    providerGroupArrow: {
      fontSize: Platform.OS === 'web' ? 20 : 18,
      color: '#64748B',
      fontWeight: '700',
      marginLeft: Platform.OS === 'web' ? 16 : 12,
    },
    // Category Tag Styles
    categoryTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F1F5F9',
      paddingHorizontal: Platform.OS === 'web' ? 10 : 8,
      paddingVertical: Platform.OS === 'web' ? 4 : 3,
      borderRadius: Platform.OS === 'web' ? 12 : 10,
      gap: Platform.OS === 'web' ? 4 : 3,
      flexShrink: 0,
    },
    categoryTagIcon: {
      fontSize: Platform.OS === 'web' ? 12 : 11,
    },
    categoryTagText: {
      fontSize: Platform.OS === 'web' ? 11 : 10,
      fontWeight: '600',
      color: '#64748B',
      textTransform: 'capitalize',
    },
    bannerCategoryTag: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    bannerCategoryTagText: {
      color: '#FFFFFF',
    },
    ratingDropdownButton: {
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    ratingDropdownText: {
      fontSize: 14,
      color: '#0f172a',
      flex: 1,
    },
    ratingDropdownPlaceholder: {
      color: '#94A3B8',
    },
    ratingDropdownArrow: {
      fontSize: 12,
      color: '#64748B',
      marginLeft: 8,
    },
    ratingModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    ratingModalContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      width: '85%',
      maxWidth: 400,
      maxHeight: '70%',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
          }),
    },
    ratingModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    ratingModalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#0f172a',
    },
    ratingModalCloseButton: {
      padding: 4,
    },
    ratingModalCloseText: {
      fontSize: 20,
      color: '#64748B',
      fontWeight: 'bold',
    },
    ratingModalBody: {
      maxHeight: 400,
    },
    ratingModalItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    },
    ratingModalItemSelected: {
      backgroundColor: '#f0f4ff',
    },
    ratingModalItemText: {
      fontSize: 15,
      color: '#0f172a',
    },
    ratingModalItemTextSelected: {
      color: '#2563EB',
      fontWeight: '600',
    },
    ratingModalCheckmark: {
      fontSize: 18,
      color: '#2563EB',
      fontWeight: 'bold',
    },
  });
