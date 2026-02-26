import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ServicePackage, calculatePackagePrice, formatPeso } from '../../models/Package';
import { createStyles } from '../BookingModal.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

export interface ConfirmBookingData {
  type: 'hourly' | 'perday';
  date?: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  slots?: number;
  days?: number;
  attendees?: number;
  cost: number;
  startDate?: string;
  endDate?: string;
}

export interface BookingConfirmationModalProps {
  visible: boolean;
  confirmBookingData: ConfirmBookingData | null;
  selectedPackage: ServicePackage | null;
  packagePaxCount: number;
  removedItems: number[];
  getPackagePrice: () => number;
  onCancel: () => void;
  onConfirm: () => void;
}

export const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
  visible,
  confirmBookingData,
  selectedPackage,
  packagePaxCount,
  removedItems,
  getPackagePrice,
  onCancel,
  onConfirm,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.confirmModalOverlay}>
        <View style={styles.confirmModalContent}>
          {/* Header */}
          <View style={styles.confirmModalHeader}>
            <View style={styles.confirmIconContainer}>
              <Feather name="check" size={28} color="#fff" />
            </View>
            <Text style={styles.confirmModalTitle}>Confirm Booking</Text>
            <Text style={styles.confirmModalSubtitle}>Please review your booking details</Text>
          </View>

          {/* Booking Details */}
          {confirmBookingData ? (
            <ScrollView style={styles.confirmDetailsContainer} showsVerticalScrollIndicator={false}>
              {confirmBookingData.type === 'hourly' ? (
                <>
                  <View style={styles.confirmDetailRow}>
                    <View style={styles.confirmDetailIcon}>
                      <Feather name="calendar" size={18} color="#64748B" />
                    </View>
                    <View style={styles.confirmDetailContent}>
                      <Text style={styles.confirmDetailLabel}>Date</Text>
                      <Text style={styles.confirmDetailValue}>
                        {confirmBookingData?.date || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.confirmDetailRow}>
                    <View style={styles.confirmDetailIcon}>
                      <Feather name="clock" size={18} color="#64748B" />
                    </View>
                    <View style={styles.confirmDetailContent}>
                      <Text style={styles.confirmDetailLabel}>Time</Text>
                      <Text style={styles.confirmDetailValue}>
                        {confirmBookingData?.startTime || 'N/A'} -{' '}
                        {confirmBookingData?.endTime || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.confirmDetailRow}>
                    <View style={styles.confirmDetailIcon}>
                      <Feather name="clock" size={18} color="#64748B" />
                    </View>
                    <View style={styles.confirmDetailContent}>
                      <Text style={styles.confirmDetailLabel}>Duration</Text>
                      <Text style={styles.confirmDetailValue}>
                        {confirmBookingData?.duration || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {confirmBookingData?.attendees && (
                    <View style={styles.confirmDetailRow}>
                      <View style={styles.confirmDetailIcon}>
                        <Feather name="users" size={18} color="#64748B" />
                      </View>
                      <View style={styles.confirmDetailContent}>
                        <Text style={styles.confirmDetailLabel}>Attendees</Text>
                        <Text style={styles.confirmDetailValue}>
                          {confirmBookingData?.attendees || 0} pax
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.confirmDetailRow}>
                    <View style={styles.confirmDetailIcon}>
                      <Feather name="calendar" size={18} color="#64748B" />
                    </View>
                    <View style={styles.confirmDetailContent}>
                      <Text style={styles.confirmDetailLabel}>Date Range</Text>
                      <Text style={styles.confirmDetailValue}>
                        {confirmBookingData?.startDate
                          ? new Date(confirmBookingData.startDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'N/A'}{' '}
                        -{' '}
                        {confirmBookingData?.endDate
                          ? new Date(confirmBookingData.endDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.confirmDetailRow}>
                    <View style={styles.confirmDetailIcon}>
                      <Feather name="bar-chart-2" size={18} color="#64748B" />
                    </View>
                    <View style={styles.confirmDetailContent}>
                      <Text style={styles.confirmDetailLabel}>Days</Text>
                      <Text style={styles.confirmDetailValue}>
                        {confirmBookingData?.days || 0} day
                        {(confirmBookingData?.days || 0) !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {/* Package Info (if selected) */}
              {selectedPackage && (
                <View style={styles.confirmPackageCard}>
                  <View style={styles.confirmPackageHeader}>
                    <Feather name="package" size={18} color="#6C63FF" />
                    <Text style={styles.confirmPackageLabel}>Package</Text>
                  </View>
                  <Text style={styles.confirmPackageName}>{selectedPackage.name}</Text>
                  <View style={styles.confirmPackageDetails}>
                    <Text style={styles.confirmPackageDetailText}>
                      {packagePaxCount} pax x{' '}
                      {formatPeso(
                        selectedPackage.priceType === 'calculated'
                          ? calculatePackagePrice(selectedPackage, 1, removedItems)
                          : selectedPackage.basePrice || 0,
                      )}
                    </Text>
                    {removedItems.length > 0 && (
                      <Text style={styles.confirmPackageRemovedText}>
                        {removedItems.length} optional item{removedItems.length !== 1 ? 's' : ''}{' '}
                        removed
                      </Text>
                    )}
                  </View>
                  <Text style={styles.confirmPackagePrice}>{formatPeso(getPackagePrice())}</Text>
                </View>
              )}

              {/* Cost Highlight */}
              <View style={styles.confirmCostCard}>
                <Text style={styles.confirmCostLabel}>Estimated Cost</Text>
                <Text style={styles.confirmCostValue}>
                  ₱
                  {(
                    (confirmBookingData?.cost || 0) + (selectedPackage ? getPackagePrice() : 0)
                  ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>

              {/* Warning */}
              <View style={styles.confirmWarning}>
                <Feather name="alert-triangle" size={16} color="#f59e0b" />
                <Text style={styles.confirmWarningText}>This action cannot be undone</Text>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.confirmDetailsContainer}>
              <Text style={{ textAlign: 'center', color: '#6B7280', padding: 20 }}>
                No booking data available
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.confirmModalActions}>
            <TouchableOpacity
              style={styles.confirmCancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmConfirmButton}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmConfirmButtonText}>Confirm Booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
