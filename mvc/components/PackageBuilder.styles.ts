import { StyleSheet, Platform } from 'react-native';
import { colors, semantic } from '../theme';

export const createStyles = (isMobile: boolean, _screenWidth: number) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: semantic.surface,
      borderRadius: 16,
      width: isMobile ? '95%' : '80%',
      maxWidth: 900,
      maxHeight: '90%',
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)' }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
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
    modalHeaderLeft: {
      flex: 1,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1F2937',
    },
    modalSubtitle: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginTop: 2,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: semantic.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      fontSize: 24,
      color: semantic.textSecondary,
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
      color: '#374151',
      marginBottom: 12,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: '#374151',
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: '#D1D5DB',
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: '#1F2937',
      backgroundColor: semantic.surface,
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
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#D1D5DB',
      backgroundColor: semantic.surface,
    },
    priceTypeButtonActive: {
      borderColor: semantic.primary,
      backgroundColor: semantic.primaryLight,
    },
    priceTypeButtonText: {
      fontSize: 12,
      color: semantic.textSecondary,
      fontWeight: '500',
    },
    priceTypeButtonTextActive: {
      color: semantic.primary,
    },
    addCategoryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: semantic.primary,
      borderRadius: 8,
    },
    addCategoryIcon: {
      fontSize: 16,
      color: semantic.surface,
      marginRight: 6,
    },
    addCategoryText: {
      fontSize: 14,
      color: semantic.surface,
      fontWeight: '500',
    },
    emptyState: {
      padding: 32,
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: semantic.border,
      borderStyle: 'dashed',
    },
    emptyStateText: {
      fontSize: 14,
      color: semantic.textSecondary,
      textAlign: 'center',
    },
    categoryCard: {
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      marginBottom: 12,
      overflow: 'hidden',
    },
    categoryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: '#F9FAFB',
    },
    categoryHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    expandIcon: {
      fontSize: 12,
      color: semantic.textSecondary,
      marginRight: 8,
      width: 16,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '600',
      color: '#1F2937',
    },
    categoryNameInput: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: '#1F2937',
      borderWidth: 1,
      borderColor: semantic.primary,
      borderRadius: 4,
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
      color: colors.success[600],
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
      borderBottomColor: semantic.border,
      marginBottom: 8,
    },
    itemsHeaderText: {
      fontSize: 12,
      fontWeight: '600',
      color: semantic.textSecondary,
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
      borderBottomColor: semantic.background,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 14,
      color: '#1F2937',
    },
    optionalBadge: {
      fontSize: 12,
      color: '#9CA3AF',
      fontStyle: 'italic',
    },
    itemDetails: {
      fontSize: 12,
      color: semantic.textSecondary,
      marginTop: 2,
    },
    itemTotal: {
      width: 80,
      fontSize: 14,
      fontWeight: '500',
      color: '#1F2937',
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
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
    },
    itemEditRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    itemInput: {
      borderWidth: 1,
      borderColor: '#D1D5DB',
      borderRadius: 4,
      padding: 8,
      fontSize: 14,
      color: '#1F2937',
      backgroundColor: semantic.surface,
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
      borderColor: '#D1D5DB',
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    checkboxChecked: {
      backgroundColor: semantic.primary,
      borderColor: semantic.primary,
    },
    checkmark: {
      color: semantic.surface,
      fontSize: 12,
      fontWeight: 'bold',
    },
    optionalLabel: {
      fontSize: 12,
      color: semantic.textSecondary,
    },
    itemDoneButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: semantic.primary,
      borderRadius: 4,
    },
    itemDoneButtonText: {
      fontSize: 12,
      color: semantic.surface,
      fontWeight: '500',
    },
    addItemButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: '#D1D5DB',
      borderRadius: 6,
      borderStyle: 'dashed',
      marginTop: 8,
    },
    addItemIcon: {
      fontSize: 16,
      color: semantic.textSecondary,
      marginRight: 6,
    },
    addItemText: {
      fontSize: 14,
      color: semantic.textSecondary,
    },
    priceSummary: {
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      padding: 16,
      marginTop: 8,
    },
    priceSummaryTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#374151',
      marginBottom: 12,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    priceLabel: {
      fontSize: 14,
      color: semantic.textSecondary,
    },
    priceValue: {
      fontSize: 14,
      color: '#1F2937',
    },
    discountValue: {
      color: colors.error[600],
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: semantic.border,
      paddingTop: 8,
      marginTop: 4,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1F2937',
    },
    totalValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.success[600],
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
    },
    cancelButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#D1D5DB',
      backgroundColor: semantic.surface,
    },
    cancelButtonText: {
      fontSize: 14,
      color: semantic.textSecondary,
      fontWeight: '500',
    },
    saveButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      backgroundColor: semantic.primary,
      minWidth: 140,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      backgroundColor: '#9CA3AF',
    },
    saveButtonText: {
      fontSize: 14,
      color: semantic.surface,
      fontWeight: '600',
    },
  });
