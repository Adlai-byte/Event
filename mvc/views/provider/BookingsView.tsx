import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { User } from '../../models/User';
import { AppLayout } from '../../components/layout';
import { ProviderBookingCard } from '../../components/booking/ProviderBookingCard';
import { useProviderBookings, getStatusColor } from '../../hooks/useProviderBookings';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { SkeletonListItem } from '../../components/ui';
import { semantic } from '../../theme';
import { createStyles } from './BookingsView.styles';

interface BookingsViewProps {
  user?: User;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

export const BookingsView: React.FC<BookingsViewProps> = ({ user, onNavigate, onLogout }) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);

  const {
    filteredBookings,
    loading,
    filterStatus,
    searchQuery,
    selectedBooking,
    cancelReason,
    statusFilters,
    showClientDetailsModal,
    showConfirmModal,
    showCancelModal,
    setFilterStatus,
    setSearchQuery,
    setCancelReason,
    loadBookings,
    handleUpdateBookingStatus,
    handleConfirmClick,
    handleCancelClick,
    handleConfirmBooking,
    handleCancelBooking,
    handleMarkPaymentAsPaid,
    handleDownloadInvoice,
    handleViewClientDetails,
    handleCloseClientDetails,
    handleCloseConfirmModal,
    handleCloseCancelModal,
  } = useProviderBookings(user);

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Service / Event</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Client</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Date</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Time</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Location</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Total</Text>
      <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Actions</Text>
    </View>
  );

  const renderBookingRows = (showDetails: boolean) =>
    filteredBookings.map((booking) => (
      <ProviderBookingCard
        key={booking.id}
        booking={booking}
        isMobile={!showDetails}
        onConfirmClick={handleConfirmClick}
        onCancelClick={handleCancelClick}
        onCompleteClick={(id) => handleUpdateBookingStatus(id, 'completed')}
        onMarkPaymentAsPaid={handleMarkPaymentAsPaid}
        onDownloadInvoice={handleDownloadInvoice}
        onViewClientDetails={showDetails ? handleViewClientDetails : undefined}
      />
    ));

  const renderBookingsTable = () => {
    if (filteredBookings.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Feather name="calendar" size={48} color="#64748B" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyStateText}>No bookings found</Text>
          <Text style={styles.emptyStateSubtext}>
            {filterStatus === 'all'
              ? "You don't have any bookings yet"
              : `No ${filterStatus} bookings`}
          </Text>
        </View>
      );
    }

    if (isMobile) {
      return (
        <View style={styles.mobileCardContainer}>
          {filteredBookings.map((booking) => {
            const statusColor = getStatusColor(booking.status);
            return (
              <View key={booking.id} style={styles.mobileCard}>
                <View style={styles.mobileCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mobileCardTitle}>{booking.eventName}</Text>
                    <Text style={styles.mobileCardSubtitle}>{booking.serviceName}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {booking.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.mobileCardRow}>
                  <Text style={styles.mobileCardLabel}>Client</Text>
                  <Text style={styles.mobileCardValue}>{booking.clientName}</Text>
                </View>
                <View style={styles.mobileCardRow}>
                  <Text style={styles.mobileCardLabel}>Date</Text>
                  <Text style={styles.mobileCardValue}>{booking.date}</Text>
                </View>
                <View style={styles.mobileCardRow}>
                  <Text style={styles.mobileCardLabel}>Time</Text>
                  <Text style={styles.mobileCardValue}>{booking.time}</Text>
                </View>
                <View style={styles.mobileCardRow}>
                  <Text style={styles.mobileCardLabel}>Location</Text>
                  <Text style={styles.mobileCardValue} numberOfLines={1}>
                    {booking.location}
                  </Text>
                </View>
                <View style={[styles.mobileCardRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.mobileCardLabel}>Total</Text>
                  <Text
                    style={[styles.mobileCardValue, { color: semantic.primary, fontWeight: '700' }]}
                  >
                    ₱{booking.totalCost.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.mobileCardActions}>
                  {handleViewClientDetails && (
                    <TouchableOpacity
                      style={[styles.tableActionButton, styles.viewDetailsButton]}
                      onPress={() => handleViewClientDetails(booking)}
                      accessibilityRole="button"
                      accessibilityLabel={`View details for ${booking.eventName}`}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather name="eye" size={12} color="#fff" />
                        <Text style={styles.tableActionButtonText}>Details</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  {booking.status === 'pending' && (
                    <>
                      <TouchableOpacity
                        style={[styles.tableActionButton, styles.confirmButton]}
                        onPress={() => handleConfirmClick(booking.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Confirm booking"
                      >
                        <Text style={styles.tableActionButtonText}>Confirm</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.tableActionButton, styles.cancelButton]}
                        onPress={() => handleCancelClick(booking.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel booking"
                      >
                        <Text style={styles.tableActionButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {booking.status === 'confirmed' && (
                    <>
                      <TouchableOpacity
                        style={[styles.tableActionButton, styles.completeButton]}
                        onPress={() => handleUpdateBookingStatus(booking.id, 'completed')}
                        accessibilityRole="button"
                        accessibilityLabel="Complete booking"
                      >
                        <Text style={styles.tableActionButtonText}>Complete</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    return (
      <View style={styles.tableContainer}>
        {renderTableHeader()}
        {renderBookingRows(true)}
      </View>
    );
  };

  return (
    <AppLayout
      role="provider"
      activeRoute="bookings"
      title="Bookings"
      user={user}
      onNavigate={(route) => onNavigate?.(route)}
      onLogout={() => onLogout?.()}
    >
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerSubtitle}>Manage your service bookings</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadBookings}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Refresh bookings"
          >
            <Text style={styles.refreshButtonText}>{loading ? '⟳' : '↻'}</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search bookings by event name, client, location, date, or service..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
            accessibilityLabel="Search bookings"
          />
        </View>

        {/* Status Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {statusFilters.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
              onPress={() => setFilterStatus(status)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${status}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterStatus === status && styles.filterChipTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={{ padding: 16 }}>
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
          </View>
        ) : (
          renderBookingsTable()
        )}
      </ScrollView>

      {/* Client Details Modal */}
      <Modal
        visible={showClientDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseClientDetails}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.clientDetailsModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Client Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseClientDetails}
                accessibilityRole="button"
                accessibilityLabel="Close client details"
              >
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <ScrollView style={styles.modalBody}>
                {/* Booking Info */}
                <View style={styles.clientDetailsSection}>
                  <Text style={styles.clientDetailsSectionTitle}>Booking Information</Text>
                  <View style={styles.clientDetailsRow}>
                    <Text style={styles.clientDetailsLabel}>Event:</Text>
                    <Text style={styles.clientDetailsValue}>{selectedBooking.eventName}</Text>
                  </View>
                  <View style={styles.clientDetailsRow}>
                    <Text style={styles.clientDetailsLabel}>Service:</Text>
                    <Text style={styles.clientDetailsValue}>{selectedBooking.serviceName}</Text>
                  </View>
                  <View style={styles.clientDetailsRow}>
                    <Text style={styles.clientDetailsLabel}>Date:</Text>
                    <Text style={styles.clientDetailsValue}>{selectedBooking.date}</Text>
                  </View>
                  <View style={styles.clientDetailsRow}>
                    <Text style={styles.clientDetailsLabel}>Time:</Text>
                    <Text style={styles.clientDetailsValue}>{selectedBooking.time}</Text>
                  </View>
                  <View style={styles.clientDetailsRow}>
                    <Text style={styles.clientDetailsLabel}>Location:</Text>
                    <Text style={styles.clientDetailsValue}>{selectedBooking.location}</Text>
                  </View>
                  <View style={styles.clientDetailsRow}>
                    <Text style={styles.clientDetailsLabel}>Total:</Text>
                    <Text style={styles.clientDetailsValue}>
                      ₱{selectedBooking.totalCost.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Client Contact Info */}
                <View style={styles.clientDetailsSection}>
                  <Text style={styles.clientDetailsSectionTitle}>Client Contact Information</Text>
                  <View style={styles.clientDetailsRow}>
                    <Text style={styles.clientDetailsLabel}>Name:</Text>
                    <Text style={styles.clientDetailsValue}>{selectedBooking.clientName}</Text>
                  </View>
                  {selectedBooking.clientEmail && (
                    <View style={styles.clientDetailsRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather name="mail" size={14} color="#64748B" />
                        <Text style={styles.clientDetailsLabel}>Email:</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            window.location.href = `mailto:${selectedBooking.clientEmail}`;
                          } else {
                            Linking.openURL(`mailto:${selectedBooking.clientEmail}`);
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Email client at ${selectedBooking.clientEmail}`}
                      >
                        <Text style={[styles.clientDetailsValue, styles.clientDetailsLink]}>
                          {selectedBooking.clientEmail}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {selectedBooking.clientPhone && (
                    <View style={styles.clientDetailsRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather name="phone" size={14} color="#64748B" />
                        <Text style={styles.clientDetailsLabel}>Phone:</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            window.location.href = `tel:${selectedBooking.clientPhone}`;
                          } else {
                            Linking.openURL(`tel:${selectedBooking.clientPhone}`);
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Call client at ${selectedBooking.clientPhone}`}
                      >
                        <Text style={[styles.clientDetailsValue, styles.clientDetailsLink]}>
                          {selectedBooking.clientPhone}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {selectedBooking.clientAddress && (
                    <View style={styles.clientDetailsRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather name="map-pin" size={14} color="#64748B" />
                        <Text style={styles.clientDetailsLabel}>Address:</Text>
                      </View>
                      <Text style={[styles.clientDetailsValue, { flex: 1 }]}>
                        {selectedBooking.clientAddress}
                      </Text>
                    </View>
                  )}
                  {!selectedBooking.clientEmail &&
                    !selectedBooking.clientPhone &&
                    !selectedBooking.clientAddress && (
                      <Text
                        style={[
                          styles.clientDetailsValue,
                          { color: '#94A3B8', fontStyle: 'italic' },
                        ]}
                      >
                        No contact information available
                      </Text>
                    )}
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeModalButton]}
                onPress={handleCloseClientDetails}
                accessibilityRole="button"
                accessibilityLabel="Close client details"
              >
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Booking Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseConfirmModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Booking</Text>
              <TouchableOpacity
                onPress={handleCloseConfirmModal}
                accessibilityRole="button"
                accessibilityLabel="Close confirm booking modal"
              >
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                Are you sure you want to confirm this booking? This action cannot be undone.
              </Text>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={handleCloseConfirmModal}
                accessibilityRole="button"
                accessibilityLabel="Cancel confirmation"
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={handleConfirmBooking}
                accessibilityRole="button"
                accessibilityLabel="Confirm booking"
              >
                <Text style={styles.confirmModalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Booking Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseCancelModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cancelModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Booking</Text>
              <TouchableOpacity
                onPress={handleCloseCancelModal}
                accessibilityRole="button"
                accessibilityLabel="Close cancel booking modal"
              >
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                Please provide a reason for cancelling this booking:
              </Text>
              <TextInput
                style={styles.cancelReasonInput}
                placeholder="Enter cancellation reason..."
                placeholderTextColor="#94a3b8"
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                accessibilityLabel="Cancellation reason"
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={handleCloseCancelModal}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Text style={styles.cancelModalButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitCancelButton]}
                onPress={handleCancelBooking}
                disabled={!cancelReason.trim()}
                accessibilityRole="button"
                accessibilityLabel="Submit booking cancellation"
              >
                <Text
                  style={[
                    styles.submitCancelButtonText,
                    !cancelReason.trim() && styles.disabledButtonText,
                  ]}
                >
                  Cancel Booking
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
};

export default BookingsView;
