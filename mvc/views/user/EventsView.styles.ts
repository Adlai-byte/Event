import { StyleSheet, Platform } from 'react-native';

export const createStyles = (isMobile: boolean, _screenWidth: number, _screenHeight: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
      ...(Platform.OS === 'web'
        ? { justifyContent: 'center', alignItems: 'center', paddingTop: 30, paddingBottom: 20 }
        : { paddingTop: 20 }),
    },
    filterContainer: {
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      paddingVertical: Platform.OS === 'web' ? 16 : 12,
      ...(Platform.OS === 'web' ? { boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)' } : {}),
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
      borderWidth: 2,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
    },
    filterButtonActive: {
      backgroundColor: '#0F172A',
      borderColor: '#0F172A',
    },
    filterButtonText: {
      fontSize: Platform.OS === 'web' ? 15 : 14,
      fontWeight: '600',
      color: '#64748B',
    },
    filterButtonActiveText: {
      color: '#FFFFFF',
    },
    listContent: {
      padding: isMobile ? 16 : 24,
      paddingBottom: 80,
      ...(Platform.OS === 'web' && !isMobile
        ? { maxWidth: 900, width: '100%', alignSelf: 'center' as const }
        : {}),
    },
    eventCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: isMobile ? 16 : 20,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
      ...(Platform.OS === 'web' ? { boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)' } : {}),
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: isMobile ? 17 : 18,
      fontWeight: '700',
      color: '#0F172A',
      flex: 1,
      marginRight: 12,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
      gap: 8,
    },
    cardLabel: {
      fontSize: 13,
      color: '#64748B',
    },
    cardValue: {
      fontSize: 14,
      fontWeight: '500',
      color: '#0F172A',
    },
    budgetBar: {
      height: 6,
      backgroundColor: '#E2E8F0',
      borderRadius: 3,
      marginTop: 10,
      overflow: 'hidden',
    },
    budgetBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 12,
      gap: 8,
    },
    deleteButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: '#FEE2E2',
    },
    fabButton: {
      position: 'absolute',
      bottom: isMobile ? 80 : 24,
      right: 24,
      backgroundColor: '#0F172A',
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 2,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
    },
    fabButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 24,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#0F172A',
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: '#64748B',
      marginTop: 8,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
  });
