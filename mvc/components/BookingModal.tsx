import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BookingWeekCalendar } from './BookingWeekCalendar';
import { ServicePackage } from '../models/Package';
import { useBreakpoints } from '../hooks/useBreakpoints';
import { useBookingSlots } from '../hooks/useBookingSlots';
import { useBookingCost } from '../hooks/useBookingCost';
import { ProfileCompleteModal } from './booking/ProfileCompleteModal';
import { BookingConfirmationModal, ConfirmBookingData } from './booking/BookingConfirmationModal';
import { createStyles } from './BookingModal.styles';

interface BookingModalProps {
  visible: boolean;
  serviceId: number;
  serviceName: string;
  onClose: () => void;
  onConfirm: (
    date: string,
    startTime: string,
    endTime: string,
    attendees?: number,
    notes?: string,
    packageData?: {
      packageId: number;
      paxCount: number;
      removedItems: number[];
      totalPrice: number;
    },
  ) => void;
  user?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  onNavigateToPersonalInfo?: () => void;
  preSelectedPackage?: ServicePackage | null;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  visible,
  serviceId,
  serviceName,
  onClose,
  onConfirm,
  user,
  onNavigateToPersonalInfo,
  preSelectedPackage,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);

  const {
    selectedDate,
    setSelectedDate,
    availableSlots,
    selectedSlots,
    setSelectedSlots,
    noSlotsDates,
    loadingDates,
    loadingSlots,
    currentWeek,
    setCurrentWeek,
    allDatesSlots,
    selectedDays,
    setSelectedDays,
    resetState: resetSlotState,
    loadAvailableDates,
    loadWeekSlots,
    reloadSlotsForDate,
    handleSlotToggle,
    isDateAvailable,
    isDateNoSlots,
  } = useBookingSlots(serviceId, visible);

  const {
    serviceDetails,
    bookingMode,
    setBookingMode,
    estimatedCost,
    attendees,
    setAttendees,
    selectedPackage,
    removedItems,
    packagePaxCount,
    resetCostState,
    loadServiceDetails,
    loadPackages,
    getPackagePrice,
    calculateTotalDuration,
    formatDuration,
    formatTime,
  } = useBookingCost(serviceId, visible, selectedSlots, selectedDays, preSelectedPackage);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showProfileCompleteModal, setShowProfileCompleteModal] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [confirmBookingData, setConfirmBookingData] = useState<ConfirmBookingData | null>(null);

  useEffect(() => {
    if (visible && serviceId) {
      loadAvailableDates();
      loadServiceDetails();
      loadPackages();
      loadWeekSlots();
    } else if (!visible) {
      resetSlotState();
      resetCostState();
    }
  }, [visible, serviceId]);

  // Profile completeness check
  const checkProfileComplete = (): boolean => {
    if (!user) return true;

    const hasPersonalDetails = !!(
      user.firstName &&
      user.firstName.trim() !== '' &&
      user.lastName &&
      user.lastName.trim() !== '' &&
      user.phone &&
      user.phone.trim() !== '' &&
      user.dateOfBirth &&
      user.dateOfBirth.trim() !== ''
    );

    const hasAddress = !!(
      user.address &&
      user.address.trim() !== '' &&
      user.city &&
      user.city.trim() !== '' &&
      user.state &&
      user.state.trim() !== '' &&
      user.zipCode &&
      user.zipCode.trim() !== ''
    );

    if (!hasPersonalDetails || !hasAddress) {
      const fields: string[] = [];
      if (!hasPersonalDetails) {
        fields.push('Personal Details (First Name, Last Name, Phone, Date of Birth)');
      }
      if (!hasAddress) {
        fields.push('Address Information (Address, City, State, ZIP Code)');
      }
      setMissingFields(fields);
      setShowProfileCompleteModal(true);
      return false;
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!checkProfileComplete()) return;

    // For per-day booking mode
    if (bookingMode === 'perday' && selectedDays.length > 0) {
      const sortedDays = [...selectedDays].sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime(),
      );
      const startDate = sortedDays[0];
      const endDate = sortedDays[sortedDays.length - 1];

      try {
        setConfirmBookingData({
          type: 'perday',
          days: selectedDays.length,
          cost: estimatedCost,
          startDate: startDate,
          endDate: endDate,
        });
        setShowConfirmModal(true);
      } catch (error: any) {
        console.error('Error creating booking for date range:', error);
        Alert.alert('Error', `Failed to create booking: ${error.message || 'Unknown error'}`, [
          { text: 'OK' },
        ]);
      }
      return;
    }

    if (!checkProfileComplete()) return;

    // For hourly services (including catering)
    if (selectedDate && selectedSlots.length > 0) {
      if (selectedSlots.length < 2) {
        Alert.alert(
          'Minimum Slots Required',
          'Please select at least 2 time slots to proceed with booking.',
          [{ text: 'OK' }],
        );
        return;
      }

      if (serviceDetails?.category.toLowerCase() === 'catering') {
        const numAttendees = parseInt(attendees);
        if (!attendees || isNaN(numAttendees) || numAttendees < 1) {
          Alert.alert('Invalid Input', 'Please enter a valid number of attendees (minimum 1).');
          return;
        }
      }

      const sortedSlots = [...selectedSlots].sort((a, b) => {
        const timeA = a.start.split(':').map(Number);
        const timeB = b.start.split(':').map(Number);
        return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
      });

      const earliestStart = sortedSlots[0].start;
      const latestStart = sortedSlots[sortedSlots.length - 1].start;
      const numAttendees =
        serviceDetails?.category.toLowerCase() === 'catering' ? parseInt(attendees) : undefined;

      const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const startTimeFormatted = formatTime(earliestStart);
      const endTimeFormatted = formatTime(latestStart);
      const durationFormatted = formatDuration(calculateTotalDuration(selectedSlots));

      setConfirmBookingData({
        type: 'hourly',
        date: formattedDate,
        startTime: startTimeFormatted,
        endTime: endTimeFormatted,
        duration: durationFormatted,
        slots: selectedSlots.length,
        attendees: numAttendees,
        cost: estimatedCost,
      });
      setShowConfirmModal(true);
    }
  };

  const handleConfirmBooking = async () => {
    if (!confirmBookingData) {
      console.error('confirmBookingData is null');
      setShowConfirmModal(false);
      return;
    }

    setShowConfirmModal(false);

    const packageData =
      selectedPackage && selectedPackage.id
        ? {
            packageId: selectedPackage.id,
            paxCount: packagePaxCount,
            removedItems: removedItems,
            totalPrice: getPackagePrice(),
          }
        : undefined;

    try {
      if (
        confirmBookingData.type === 'perday' &&
        confirmBookingData.startDate &&
        confirmBookingData.endDate
      ) {
        const sortedDays = [...selectedDays].sort(
          (a, b) => new Date(a).getTime() - new Date(b).getTime(),
        );
        const startDate = sortedDays[0];
        const endDate = sortedDays[sortedDays.length - 1];
        const dateRangeInfo = {
          startDate: startDate,
          endDate: endDate,
          totalDays: selectedDays.length,
          allDates: sortedDays,
        };

        await onConfirm(
          startDate,
          '00:00:00',
          '23:59:59',
          undefined,
          JSON.stringify(dateRangeInfo),
          packageData,
        );

        for (const date of sortedDays) {
          await reloadSlotsForDate(date);
        }

        onClose();
        Alert.alert(
          'Success',
          `Successfully booked ${selectedDays.length} day${selectedDays.length !== 1 ? 's' : ''} (${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()})!`,
          [{ text: 'OK' }],
        );
      } else if (confirmBookingData.type === 'hourly' && selectedDate) {
        const sortedSlots = [...selectedSlots].sort((a, b) => {
          const timeA = a.start.split(':').map(Number);
          const timeB = b.start.split(':').map(Number);
          return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
        });
        const earliestStart = sortedSlots[0].start;
        const latestEnd = sortedSlots[sortedSlots.length - 1].end;
        const numAttendees = confirmBookingData.attendees;

        await onConfirm(
          selectedDate,
          earliestStart,
          latestEnd,
          numAttendees,
          undefined,
          packageData,
        );
        await reloadSlotsForDate(selectedDate);
        onClose();
        Alert.alert('Success', 'Booking created successfully!');
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      Alert.alert('Error', `Failed to create booking: ${error.message || 'Unknown error'}`, [
        { text: 'OK' },
      ]);
    }
  };

  // Render modal content (shared between web and mobile)
  const renderModalContent = () => (
    <>
      {/* Modern Header with Gradient */}
      <View style={styles.modalHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.modalTitle}>Book {serviceName}</Text>
          <Text style={styles.modalSubtitle}>
            {serviceDetails && serviceDetails.duration >= 1440
              ? 'Select your preferred date(s)'
              : 'Select your preferred date and time'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close booking modal"
        >
          <Feather name="x" size={22} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Booking Mode Switcher */}
      {serviceDetails &&
        serviceDetails.hourlyPrice &&
        serviceDetails.perDayPrice &&
        serviceDetails.category.toLowerCase() !== 'catering' && (
          <View style={styles.bookingModeSwitcher}>
            <TouchableOpacity
              style={[
                styles.bookingModeButton,
                bookingMode === 'hourly' && styles.bookingModeButtonActive,
              ]}
              onPress={() => {
                setBookingMode('hourly');
                setSelectedDays([]);
                setSelectedSlots([]);
              }}
              accessibilityRole="button"
              accessibilityLabel="Switch to hourly booking mode"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather
                  name="clock"
                  size={14}
                  color={bookingMode === 'hourly' ? '#fff' : '#64748B'}
                />
                <Text
                  style={[
                    styles.bookingModeText,
                    bookingMode === 'hourly' && styles.bookingModeTextActive,
                  ]}
                >
                  Hourly
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.bookingModeButton,
                bookingMode === 'perday' && styles.bookingModeButtonActive,
              ]}
              onPress={() => {
                setBookingMode('perday');
                setSelectedSlots([]);
                setSelectedDate(null);
              }}
              accessibilityRole="button"
              accessibilityLabel="Switch to per day booking mode"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather
                  name="calendar"
                  size={14}
                  color={bookingMode === 'perday' ? '#fff' : '#64748B'}
                />
                <Text
                  style={[
                    styles.bookingModeText,
                    bookingMode === 'perday' && styles.bookingModeTextActive,
                  ]}
                >
                  Per Day
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

      <View style={styles.calendarContainer}>
        {loadingDates || loadingSlots ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4a55e1" />
          </View>
        ) : serviceDetails?.category.toLowerCase() === 'catering' ? (
          <>
            <BookingWeekCalendar
              currentWeek={currentWeek}
              onWeekChange={setCurrentWeek}
              availableSlots={availableSlots}
              selectedSlots={selectedSlots}
              onSlotToggle={handleSlotToggle}
              selectedDate={selectedDate}
              noSlotsDates={noSlotsDates}
              allDatesSlots={allDatesSlots}
              onDateSelect={(dateStr) => {
                if (isDateNoSlots(dateStr)) {
                  Alert.alert(
                    'No Available Slots',
                    'This date has no available time slots. Please select another date.',
                    [{ text: 'OK' }],
                  );
                  return;
                }
                if (isDateAvailable(dateStr)) {
                  if (selectedDate && selectedDate !== dateStr) {
                    setSelectedSlots([]);
                  }
                  setSelectedDate(dateStr);
                }
              }}
              onTimeSlotClick={(dateStr, hour, minute) => {
                const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
                const endHour = hour + 1;
                const endTime = `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;

                const newSlot: { start: string; end: string; available: boolean } = {
                  start: startTime,
                  end: endTime,
                  available: true,
                };

                handleSlotToggle(newSlot);
              }}
            />
          </>
        ) : bookingMode === 'perday' ||
          (serviceDetails && serviceDetails.duration >= 1440 && !serviceDetails.hourlyPrice) ? (
          <>
            <BookingWeekCalendar
              currentWeek={currentWeek}
              onWeekChange={setCurrentWeek}
              availableSlots={[]}
              selectedSlots={[]}
              onSlotToggle={() => {}}
              selectedDate={null}
              noSlotsDates={noSlotsDates}
              onDateSelect={(dateStr) => {
                if (isDateAvailable(dateStr)) {
                  setSelectedDays((prev) => {
                    if (prev.includes(dateStr)) {
                      return prev.filter((d) => d !== dateStr);
                    } else {
                      return [...prev, dateStr].sort();
                    }
                  });
                }
              }}
              onTimeSlotClick={() => {}}
              isPerDayMode={true}
              selectedDays={selectedDays}
            />
            <View style={styles.perDayInfoCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="calendar" size={16} color="#64748B" />
                <Text style={styles.perDayInfoText}>
                  This service is booked per day (24 hours). Select one or more dates.
                </Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <BookingWeekCalendar
              currentWeek={currentWeek}
              onWeekChange={setCurrentWeek}
              availableSlots={availableSlots}
              selectedSlots={selectedSlots}
              onSlotToggle={handleSlotToggle}
              selectedDate={selectedDate}
              noSlotsDates={noSlotsDates}
              allDatesSlots={allDatesSlots}
              onDateSelect={(dateStr) => {
                if (isDateNoSlots(dateStr)) {
                  Alert.alert(
                    'No Available Slots',
                    'This date has no available time slots. Please select another date.',
                    [{ text: 'OK' }],
                  );
                  return;
                }
                if (isDateAvailable(dateStr)) {
                  if (selectedDate && selectedDate !== dateStr) {
                    setSelectedSlots([]);
                  }
                  setSelectedDate(dateStr);
                }
              }}
              onTimeSlotClick={(dateStr, hour, minute) => {
                const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
                const endHour = hour + 1;
                const endTime = `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;

                const newSlot: { start: string; end: string; available: boolean } = {
                  start: startTime,
                  end: endTime,
                  available: true,
                };

                handleSlotToggle(newSlot);
              }}
            />
          </>
        )}

        {serviceDetails?.category.toLowerCase() === 'catering' && (
          <View style={styles.attendeesContainer}>
            <Text style={styles.attendeesLabel}>Per Pax *</Text>
            <View style={styles.attendeesInputContainer}>
              <TextInput
                style={styles.attendeesInput}
                value={attendees}
                onChangeText={(text) => {
                  const numericValue = text.replace(/[^0-9]/g, '');
                  setAttendees(numericValue);
                }}
                onBlur={() => {
                  if (!attendees || parseInt(attendees) < 1) {
                    setAttendees('1');
                  }
                }}
                keyboardType="numeric"
                placeholder="Enter number of pax"
                placeholderTextColor="#999"
                accessibilityLabel="Number of attendees"
              />
            </View>
            <Text style={styles.attendeesHint}>Cost will be calculated per pax</Text>
          </View>
        )}

        {((bookingMode === 'perday' && selectedDays.length > 0) ||
          (bookingMode === 'hourly' && selectedDate && selectedSlots.length > 0)) && (
          <View style={styles.bookingSummaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Booking Summary</Text>
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryBadgeText}>
                  {serviceDetails && serviceDetails.duration >= 1440
                    ? `${selectedDays.length} day${selectedDays.length !== 1 ? 's' : ''}`
                    : `${selectedSlots.length} slot${selectedSlots.length !== 1 ? 's' : ''}`}
                </Text>
              </View>
            </View>

            <View style={styles.summaryDetails}>
              {serviceDetails && serviceDetails.duration >= 1440 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Duration:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedDays.length === 1 ? '1 day' : `${selectedDays.length} days`}
                  </Text>
                </View>
              ) : serviceDetails?.category.toLowerCase() !== 'catering' ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Duration:</Text>
                  <Text style={styles.summaryValue}>
                    {formatDuration(calculateTotalDuration(selectedSlots))}
                  </Text>
                </View>
              ) : null}
              {serviceDetails?.category.toLowerCase() === 'catering' && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Attendees:</Text>
                  <Text style={styles.summaryValue}>
                    {attendees} {parseInt(attendees) === 1 ? 'pax' : 'pax'}
                  </Text>
                </View>
              )}
            </View>

            {estimatedCost > 0 && (
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>Estimated Cost</Text>
                <Text style={styles.priceValue}>
                  ₱
                  {estimatedCost.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            )}

            {serviceDetails && serviceDetails.duration >= 1440 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="info" size={14} color="#64748B" />
                <Text style={[styles.summaryHint, { flex: 1 }]}>
                  Select multiple dates to book for multiple days
                </Text>
              </View>
            ) : serviceDetails?.category.toLowerCase() === 'catering' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="info" size={14} color="#64748B" />
                <Text style={[styles.summaryHint, { flex: 1 }]}>
                  Please select a date, at least 2 time slots, and enter number of attendees
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="info" size={14} color="#64748B" />
                <Text style={[styles.summaryHint, { flex: 1 }]}>
                  Please select at least 2 time slots to proceed with booking
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              ((bookingMode === 'perday' && selectedDays.length === 0) ||
                (bookingMode === 'hourly' && (!selectedDate || selectedSlots.length < 2)) ||
                (serviceDetails?.category.toLowerCase() === 'catering' &&
                  (!attendees || parseInt(attendees) < 1))) &&
                styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={
              (bookingMode === 'perday' && selectedDays.length === 0) ||
              (bookingMode === 'hourly' && (!selectedDate || selectedSlots.length < 2)) ||
              (serviceDetails?.category.toLowerCase() === 'catering' &&
                (!attendees || parseInt(attendees) < 1))
            }
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Confirm booking"
          >
            <Feather name="check" size={18} color="#fff" />
            <Text
              style={[
                styles.confirmButtonText,
                ((bookingMode === 'perday' && selectedDays.length === 0) ||
                  (bookingMode === 'hourly' && (!selectedDate || selectedSlots.length < 2))) &&
                  styles.confirmButtonTextDisabled,
              ]}
            >
              Confirm Booking
            </Text>
          </TouchableOpacity>
          {((bookingMode === 'perday' && selectedDays.length > 0) ||
            (bookingMode === 'hourly' && selectedSlots.length >= 2)) &&
            estimatedCost > 0 && (
              <View style={styles.footerInfo}>
                <Text style={styles.footerInfoText}>
                  {bookingMode === 'perday'
                    ? `${selectedDays.length} day${selectedDays.length !== 1 ? 's' : ''}`
                    : `${selectedSlots.length} time slot${selectedSlots.length !== 1 ? 's' : ''}`}{' '}
                  • ₱
                  {estimatedCost.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            )}
        </View>
      </View>
    </>
  );

  return (
    <>
      <Modal
        visible={visible}
        transparent={false}
        animationType="slide"
        onRequestClose={onClose}
        presentationStyle="fullScreen"
      >
        {Platform.OS === 'web' ? (
          <View style={styles.modalOverlay}>
            <View style={styles.backgroundContainer}>
              <View style={styles.decorativeCircle1} />
              <View style={styles.decorativeCircle2} />
            </View>
            <View style={styles.modalContent}>{renderModalContent()}</View>
          </View>
        ) : (
          <SafeAreaView style={styles.modalOverlay}>
            <View style={styles.modalContent}>{renderModalContent()}</View>
          </SafeAreaView>
        )}

        <ProfileCompleteModal
          visible={showProfileCompleteModal}
          missingFields={missingFields}
          onCancel={() => setShowProfileCompleteModal(false)}
          onGoToProfile={() => {
            setShowProfileCompleteModal(false);
            onClose();
            if (onNavigateToPersonalInfo) {
              onNavigateToPersonalInfo();
            }
          }}
        />

        <BookingConfirmationModal
          visible={showConfirmModal}
          confirmBookingData={confirmBookingData}
          selectedPackage={selectedPackage}
          packagePaxCount={packagePaxCount}
          removedItems={removedItems}
          getPackagePrice={getPackagePrice}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmBooking}
        />
      </Modal>
    </>
  );
};
