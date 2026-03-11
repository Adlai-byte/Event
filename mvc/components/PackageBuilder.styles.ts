import { StyleSheet, Platform } from 'react-native';

export const createStyles = (isMobile: boolean, _screenWidth: number) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      width: isMobile ? '95%' : '80%',
      maxWidth: 900,
      maxHeight: '90%',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)' }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 16,
            elevation: 6,
          }),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    modalHeaderLeft: {
      flex: 1,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#0F172A',
    },
    modalSubtitle: {
      fontSize: 14,
      color: '#64748B',
      marginTop: 2,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      fontSize: 24,
      color: '#64748B',
      lineHeight: 28,
    },
    modalBody: {
      flex: 1,
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: 12,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: '#334155',
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: '#0F172A',
      backgroundColor: '#FFFFFF',
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    rowInputs: {
      flexDirection: 'row',
      gap: 12,
    },
    halfInput: {
      flex: 1,
    },
    priceTypeButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    priceTypeButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#FFFFFF',
    },
    priceTypeButtonActive: {
      borderColor: '#2563EB',
      backgroundColor: '#EFF6FF',
    },
    priceTypeButtonText: {
      fontSize: 12,
      color: '#64748B',
      fontWeight: '500',
    },
    priceTypeButtonTextActive: {
      color: '#2563EB',
    },
    addCategoryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: '#0F172A',
      borderRadius: 10,
    },
    addCategoryIcon: {
      fontSize: 16,
      color: '#FFFFFF',
      marginRight: 6,
    },
    addCategoryText: {
      fontSize: 14,
      color: '#FFFFFF',
      fontWeight: '500',
    },
    emptyState: {
      padding: 32,
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderStyle: 'dashed',
    },
    emptyStateText: {
      fontSize: 14,
      color: '#64748B',
      textAlign: 'center',
    },
    categoryCard: {
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    categoryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: '#F8FAFC',
    },
    categoryHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    expandIcon: {
      fontSize: 12,
      color: '#64748B',
      marginRight: 8,
      width: 16,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0F172A',
    },
    categoryNameInput: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: '#0F172A',
      borderWidth: 1,
      borderColor: '#2563EB',
      borderRadius: 6,
      padding: 4,
      marginRight: 8,
    },
    categoryHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    categorySubtotal: {
      fontSize: 14,
      fontWeight: '600',
      color: '#10B981',
      marginRight: 8,
    },
    categoryActionButton: {
      padding: 4,
    },
    categoryActionIcon: {
      fontSize: 14,
    },
    categoryContent: {
      padding: 12,
    },
    itemsHeader: {
      flexDirection: 'row',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      marginBottom: 8,
    },
    itemsHeaderText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#64748B',
      textTransform: 'uppercase',
    },
    itemNameCol: {
      flex: 1,
    },
    itemTotalCol: {
      width: 80,
      textAlign: 'right',
    },
    itemActionsCol: {
      width: 60,
      textAlign: 'center',
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 14,
      color: '#0F172A',
    },
    optionalBadge: {
      fontSize: 12,
      color: '#94A3B8',
      fontStyle: 'italic',
    },
    itemDetails: {
      fontSize: 12,
      color: '#64748B',
      marginTop: 2,
    },
    itemTotal: {
      width: 80,
      fontSize: 14,
      fontWeight: '500',
      color: '#0F172A',
      textAlign: 'right',
    },
    itemActions: {
      flexDirection: 'row',
      width: 60,
      justifyContent: 'center',
      gap: 4,
    },
    itemActionButton: {
      padding: 4,
    },
    itemActionIcon: {
      fontSize: 14,
    },
    itemEditForm: {
      flex: 1,
      padding: 8,
      backgroundColor: '#F8FAFC',
      borderRadius: 10,
    },
    itemEditRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    itemInput: {
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 6,
      padding: 8,
      fontSize: 14,
      color: '#0F172A',
      backgroundColor: '#FFFFFF',
    },
    itemNameInput: {
      flex: 1,
    },
    itemQtyInput: {
      width: 60,
    },
    itemUnitInput: {
      width: 80,
    },
    itemPriceInput: {
      flex: 1,
    },
    itemEditActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    optionalToggle: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkbox: {
      width: 18,
      height: 18,
      borderWidth: 2,
      borderColor: '#CBD5E1',
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    checkboxChecked: {
      backgroundColor: '#2563EB',
      borderColor: '#2563EB',
    },
    checkmark: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },
    optionalLabel: {
      fontSize: 12,
      color: '#64748B',
    },
    itemDoneButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: '#0F172A',
      borderRadius: 6,
    },
    itemDoneButtonText: {
      fontSize: 12,
      color: '#FFFFFF',
      fontWeight: '500',
    },
    addItemButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 10,
      borderStyle: 'dashed',
      marginTop: 8,
    },
    addItemIcon: {
      fontSize: 16,
      color: '#64748B',
      marginRight: 6,
    },
    addItemText: {
      fontSize: 14,
      color: '#64748B',
    },
    priceSummary: {
      backgroundColor: '#F8FAFC',
      borderRadius: 10,
      padding: 16,
      marginTop: 8,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    priceSummaryTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: 12,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    priceLabel: {
      fontSize: 14,
      color: '#64748B',
    },
    priceValue: {
      fontSize: 14,
      color: '#0F172A',
    },
    discountValue: {
      color: '#EF4444',
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
      paddingTop: 8,
      marginTop: 4,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#0F172A',
    },
    totalValue: {
      fontSize: 18,
      fontWeight: '700',
      color: '#10B981',
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
    },
    cancelButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#FFFFFF',
    },
    cancelButtonText: {
      fontSize: 14,
      color: '#334155',
      fontWeight: '500',
    },
    saveButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      backgroundColor: '#0F172A',
      minWidth: 140,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      backgroundColor: '#94A3B8',
    },
    saveButtonText: {
      fontSize: 14,
      color: '#FFFFFF',
      fontWeight: '600',
    },
  });
