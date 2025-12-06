import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  TextInput
} from 'react-native';
import { getApiBaseUrl } from '../services/api';
import { BookingWeekCalendar } from './BookingWeekCalendar';
import { TimePickerModal } from './TimePickerModal';

interface BookingModalProps {
  visible: boolean;
  serviceId: number;
  serviceName: string;
  onClose: () => void;
  onConfirm: (date: string, startTime: string, endTime: string, attendees?: number) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768 || Platform.OS !== 'web';

export const BookingModal: React.FC<BookingModalProps> = ({
  visible,
  serviceId,
  serviceName,
  onClose,
  onConfirm
}) => {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Array<{ start: string; end: string; available: boolean }>>([]);
  const [selectedSlots, setSelectedSlots] = useState<Array<{ start: string; end: string; available: boolean }>>([]);
  const [noSlotsDates, setNoSlotsDates] = useState<string[]>([]); // Track dates with no available slots
  const [datesWithNoSlots, setDatesWithNoSlots] = useState<Set<string>>(new Set()); // Track dates with no available slots
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [serviceDetails, setServiceDetails] = useState<{ basePrice: number; duration: number; category: string } | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [attendees, setAttendees] = useState<string>('1');

  useEffect(() => {
    if (visible && serviceId) {
      loadAvailableDates();
      loadServiceDetails();
    } else if (!visible) {
      // Reset selections when modal closes
      setSelectedSlots([]);
      setSelectedDate(null);
      setNoSlotsDates([]);
      setEstimatedCost(0);
      setAttendees('1');
    }
  }, [visible, serviceId]);

  const loadServiceDetails = async () => {
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/services/${serviceId}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && data.service) {
          const service = data.service;
          const basePrice = parseFloat(service.s_base_price) || 0;
          const duration = parseInt(service.s_duration) || 60; // Default to 60 minutes if not set
          const category = service.s_category || '';
          setServiceDetails({ basePrice, duration, category });
        }
      }
    } catch (error) {
      console.error('Error loading service details:', error);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots(selectedDate);
    } else {
      setAvailableSlots([]);
      setSelectedSlots([]);
    }
  }, [selectedDate]);

  const loadAvailableDates = async () => {
    setLoadingDates(true);
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/services/${serviceId}/available-slots`);
      if (resp.ok) {
        const data = await resp.json();
        const dates = data.dates || [];
        setAvailableDates(dates);
        
        // Pre-check dates to see which ones have no available slots
        // This helps mark dates as red before user selects them
        const noSlotsCheckPromises = dates.map(async (date: string) => {
          try {
            const slotResp = await fetch(`${getApiBaseUrl()}/api/services/${serviceId}/available-slots?date=${date}`);
            if (slotResp.ok) {
              const slotData = await slotResp.json();
              const slots = slotData.slots || [];
              const availableOnly = slots.filter((slot: { available: boolean }) => slot.available === true);
              return availableOnly.length === 0 ? date : null;
            }
          } catch (error) {
            console.error(`Error checking slots for ${date}:`, error);
          }
          return null;
        });
        
        const noSlotsResults = await Promise.all(noSlotsCheckPromises);
        const noSlotsDatesList = noSlotsResults.filter((date): date is string => date !== null);
        setNoSlotsDates(noSlotsDatesList);
      }
    } catch (error) {
      console.error('Error loading available dates:', error);
    } finally {
      setLoadingDates(false);
    }
  };

  const loadAvailableSlots = async (date: string) => {
    setLoadingSlots(true);
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/services/${serviceId}/available-slots?date=${date}`);
      if (resp.ok) {
        const data = await resp.json();
        const slots = data.slots || [];
        setAvailableSlots(slots);
        
        // Check if date has no available slots
        const availableOnly = slots.filter(slot => slot.available === true);
        if (availableOnly.length === 0) {
          // Mark this date as having no available slots
          setNoSlotsDates(prev => {
            if (!prev.includes(date)) {
              return [...prev, date];
            }
            return prev;
          });
          setDatesWithNoSlots(prev => new Set(prev).add(date));
        } else {
          // Remove from no slots list if it has available slots
          setNoSlotsDates(prev => prev.filter(d => d !== date));
          setDatesWithNoSlots(prev => {
            const newSet = new Set(prev);
            newSet.delete(date);
            return newSet;
          });
        }
      }
    } catch (error) {
      console.error('Error loading available slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calculateTotalDuration = (slots: Array<{ start: string; end: string }>): number => {
    if (slots.length === 0) return 0;
    
    // Sort slots by start time
    const sortedSlots = [...slots].sort((a, b) => {
      const timeA = a.start.split(':').map(Number);
      const timeB = b.start.split(':').map(Number);
      return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
    });
    
    // Get earliest start and latest end
    const earliestStart = sortedSlots[0].start;
    const latestEnd = sortedSlots[sortedSlots.length - 1].end;
    
    // Calculate duration in minutes
    const [startHour, startMin] = earliestStart.split(':').map(Number);
    const [endHour, endMin] = latestEnd.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const totalMinutes = endMinutes - startMinutes;
    
    return totalMinutes;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (mins === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
      }
      return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
      }
  };

  const calculateEstimatedCost = (slots: Array<{ start: string; end: string }>) => {
    if (!serviceDetails || slots.length === 0) {
      setEstimatedCost(0);
      return;
    }
    
    const { basePrice, duration: serviceDurationMinutes, category } = serviceDetails;
    let calculatedCost = 0;
    
    // For catering services, calculate based on attendees (per pax)
    if (category.toLowerCase() === 'catering') {
      const numAttendees = parseInt(attendees) || 1;
      calculatedCost = basePrice * numAttendees;
    } else {
      // For other services, calculate based on duration (per minute)
      const selectedDurationMinutes = calculateTotalDuration(slots);
      // Calculate cost: (selected_duration_minutes / service_duration_minutes) * base_price
      // Example: If service is 60 minutes and user selects 9 hours (540 minutes)
      // Cost = (540 / 60) * price = 9 * price
      calculatedCost = (selectedDurationMinutes / serviceDurationMinutes) * basePrice;
    }
    
    setEstimatedCost(calculatedCost);
  };

  useEffect(() => {
    // Recalculate cost whenever selected slots or attendees change
    if (selectedSlots.length > 0 && serviceDetails) {
      calculateEstimatedCost(selectedSlots);
    } else {
      setEstimatedCost(0);
    }
  }, [selectedSlots, serviceDetails, attendees]);


  const isDateAvailable = (dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);
    
    // Don't allow past dates
    if (checkDate < today) {
      return false;
    }
    
    // If no availability data exists, make all future dates available
    if (availableDates.length === 0) {
      return true;
    }
    
    // Otherwise, check if date is in available dates list
    return availableDates.includes(dateStr);
  };

  const isDateNoSlots = (dateStr: string): boolean => {
    return noSlotsDates.includes(dateStr);
  };

  // Check if two time slots overlap
  const doSlotsOverlap = (slot1: { start: string; end: string }, slot2: { start: string; end: string }): boolean => {
    const [start1Hour, start1Min] = slot1.start.split(':').map(Number);
    const [end1Hour, end1Min] = slot1.end.split(':').map(Number);
    const [start2Hour, start2Min] = slot2.start.split(':').map(Number);
    const [end2Hour, end2Min] = slot2.end.split(':').map(Number);
    
    const start1Minutes = start1Hour * 60 + start1Min;
    const end1Minutes = end1Hour * 60 + end1Min;
    const start2Minutes = start2Hour * 60 + start2Min;
    const end2Minutes = end2Hour * 60 + end2Min;
    
    // Two intervals overlap if: start1 < end2 AND end1 > start2
    return (start1Minutes < end2Minutes) && (end1Minutes > start2Minutes);
  };

  const handleSlotToggle = (slot: { start: string; end: string; available: boolean }) => {
    // Restrict selection - only allow available slots
    if (!slot.available) {
      Alert.alert(
        'Slot Not Available',
        'This time slot is already taken and cannot be selected.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setSelectedSlots(prev => {
      const isSelected = prev.some(s => s.start === slot.start && s.end === slot.end);
      if (isSelected) {
        // Remove slot if already selected
        return prev.filter(s => !(s.start === slot.start && s.end === slot.end));
      } else {
        // Check for overlaps with already selected slots
        const hasOverlap = prev.some(selectedSlot => doSlotsOverlap(selectedSlot, slot));
        if (hasOverlap) {
          Alert.alert(
            'Time Overlap',
            'This time slot overlaps with another selected slot. Please select non-overlapping time slots.',
            [{ text: 'OK' }]
          );
          return prev; // Don't add the overlapping slot
        }
        
        // Allow unlimited selections - but only for available and non-overlapping slots
        return [...prev, slot];
      }
    });
  };

  const handleConfirm = () => {
    if (selectedDate && selectedSlots.length > 0) {
      // Validate attendees for catering services
      if (serviceDetails?.category.toLowerCase() === 'catering') {
        const numAttendees = parseInt(attendees);
        if (!attendees || isNaN(numAttendees) || numAttendees < 1) {
          Alert.alert('Invalid Input', 'Please enter a valid number of attendees (minimum 1).');
          return;
        }
      }
      
      // Sort slots by start time
      const sortedSlots = [...selectedSlots].sort((a, b) => {
        const timeA = a.start.split(':').map(Number);
        const timeB = b.start.split(':').map(Number);
        return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
      });
      
      // Get earliest start time and latest end time
      const earliestStart = sortedSlots[0].start;
      const latestEnd = sortedSlots[sortedSlots.length - 1].end;
      
      // For catering, pass attendees; for others, pass undefined
      const numAttendees = serviceDetails?.category.toLowerCase() === 'catering' ? parseInt(attendees) : undefined;
      onConfirm(selectedDate, earliestStart, latestEnd, numAttendees);
    }
  };


  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={styles.modalOverlay}>
        {/* Background with gradient and decorative elements */}
        {Platform.OS === 'web' && (
          <View style={styles.backgroundContainer}>
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
          </View>
        )}
        
        <View style={styles.modalContent}>
          {/* Modern Header with Gradient */}
          <View style={styles.modalHeader}>
            <View style={styles.headerContent}>
              <Text style={styles.modalTitle}>Book {serviceName}</Text>
              <Text style={styles.modalSubtitle}>Select your preferred date and time</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.calendarContainer}>
            {loadingDates || loadingSlots ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#4a55e1" />
              </View>
            ) : serviceDetails?.category.toLowerCase() === 'catering' ? (
              // For catering: Show date picker and time picker only
              <>
                <BookingWeekCalendar
                  currentWeek={currentWeek}
                  onWeekChange={setCurrentWeek}
                  availableSlots={[]}
                  selectedSlots={[]}
                  onSlotToggle={() => {}}
                  selectedDate={selectedDate}
                  noSlotsDates={noSlotsDates}
                  onDateSelect={(dateStr) => {
                    if (isDateAvailable(dateStr)) {
                      setSelectedDate(dateStr);
                    }
                  }}
                  onTimeSlotClick={() => {}}
                />
                {/* Time Selection for Catering - Only Time Picker */}
                {selectedDate && !loadingSlots && (
                  <View style={styles.timeSelectionSection}>
                    <View style={styles.timeSelectionHeader}>
                      <Text style={styles.timeSelectionTitle}>Select Pickup Time</Text>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <Text style={styles.timePickerButtonText}>Use Time Picker</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            ) : (
              // For other services: Show full calendar with time slots
              <>
                <BookingWeekCalendar
                  currentWeek={currentWeek}
                  onWeekChange={setCurrentWeek}
                  availableSlots={availableSlots}
                  selectedSlots={selectedSlots}
                  onSlotToggle={handleSlotToggle}
                  selectedDate={selectedDate}
                  noSlotsDates={noSlotsDates}
                  onDateSelect={(dateStr) => {
                    // Check if date has no available slots before selecting
                    if (isDateNoSlots(dateStr)) {
                      Alert.alert(
                        'No Available Slots',
                        'This date has no available time slots. Please select another date.',
                        [{ text: 'OK' }]
                      );
                      return;
                    }
                    if (isDateAvailable(dateStr)) {
                      setSelectedDate(dateStr);
                      // Don't clear selected slots when date changes - allow user to keep selections
                    }
                  }}
                  onTimeSlotClick={(dateStr, hour, minute) => {
                    // Create a 1-hour slot when user clicks on a time cell
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
                {/* Time Selection Buttons */}
                {selectedDate && !loadingSlots && (
                  <View style={styles.timeSelectionSection}>
                    <View style={styles.timeSelectionHeader}>
                      <Text style={styles.timeSelectionTitle}>Select Time</Text>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <Text style={styles.timePickerButtonText}>Use Time Picker</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}
            
            {/* Attendees Input (for catering services) */}
            {serviceDetails?.category.toLowerCase() === 'catering' && (
              <View style={styles.attendeesContainer}>
                <Text style={styles.attendeesLabel}>Per Pax *</Text>
                <View style={styles.attendeesInputContainer}>
                  <TextInput
                    style={styles.attendeesInput}
                    value={attendees}
                    onChangeText={(text) => {
                      // Only allow numbers, allow empty string for deletion
                      const numericValue = text.replace(/[^0-9]/g, '');
                      setAttendees(numericValue);
                    }}
                    onBlur={() => {
                      // If empty or 0, set to minimum of 1
                      if (!attendees || parseInt(attendees) < 1) {
                        setAttendees('1');
                      }
                    }}
                    keyboardType="numeric"
                    placeholder="Enter number of pax"
                    placeholderTextColor="#999"
                  />
                </View>
                <Text style={styles.attendeesHint}>
                  Cost will be calculated per pax
                </Text>
              </View>
            )}
            
            {/* Modern Booking Summary Card */}
            {selectedDate && selectedSlots.length > 0 && (
              <View style={styles.bookingSummaryCard}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryTitle}>Booking Summary</Text>
                  <View style={styles.summaryBadge}>
                    <Text style={styles.summaryBadgeText}>
                      {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.summaryDetails}>
                  {serviceDetails?.category.toLowerCase() !== 'catering' && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Duration:</Text>
                      <Text style={styles.summaryValue}>
                        {formatDuration(calculateTotalDuration(selectedSlots))}
                      </Text>
                    </View>
                  )}
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
                      ₱{estimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                )}
                
                {serviceDetails?.category.toLowerCase() !== 'catering' && (
                  <Text style={styles.summaryHint}>
                    💡 Click on any time slot in the calendar to add more bookings
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Time Picker Modal */}
          <TimePickerModal
            visible={showTimePicker}
            selectedDate={selectedDate}
            availableSlots={availableSlots}
            existingBookings={availableSlots
              .filter(slot => !slot.available)
              .map(slot => ({ start: slot.start, end: slot.end }))}
            hideDuration={serviceDetails?.category.toLowerCase() === 'catering'}
            onClose={() => setShowTimePicker(false)}
            onConfirm={(startTime, endTime) => {
              const newSlot: { start: string; end: string; available: boolean } = {
                start: startTime,
                end: endTime,
                available: true,
              };
              // Clear existing selections and add new one
              setSelectedSlots([newSlot]);
              
              // Calculate estimated cost
              if (serviceDetails) {
                calculateEstimatedCost([newSlot]);
              }
              
              setShowTimePicker(false);
            }}
          />

          {/* Modern Confirm Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!selectedDate || selectedSlots.length === 0 || (serviceDetails?.category.toLowerCase() === 'catering' && (!attendees || parseInt(attendees) < 1))) && styles.confirmButtonDisabled
              ]}
              onPress={handleConfirm}
              disabled={!selectedDate || selectedSlots.length === 0 || (serviceDetails?.category.toLowerCase() === 'catering' && (!attendees || parseInt(attendees) < 1))}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonIcon}>✓</Text>
              <Text style={[
                styles.confirmButtonText,
                (!selectedDate || selectedSlots.length === 0) && styles.confirmButtonTextDisabled
              ]}>
                Confirm Booking
              </Text>
            </TouchableOpacity>
            {selectedSlots.length > 0 && estimatedCost > 0 && (
              <View style={styles.footerInfo}>
                <Text style={styles.footerInfoText}>
                  {selectedSlots.length} time slot{selectedSlots.length !== 1 ? 's' : ''} • 
                  {' '}₱{estimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#F8FAFC' : '#FFFFFF',
    position: 'relative',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    top: -100,
    right: -100,
    ...(Platform.OS === 'web' ? {
      filter: 'blur(60px)',
    } : {}),
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(66, 133, 244, 0.06)',
    bottom: -50,
    left: -50,
    ...(Platform.OS === 'web' ? {
      filter: 'blur(50px)',
    } : {}),
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: isMobile ? 16 : 20,
    paddingVertical: isMobile ? 12 : 16,
    paddingTop: Platform.OS === 'ios' ? (isMobile ? 44 : 50) : (isMobile ? 12 : 20),
    backgroundColor: '#4f46e5',
    borderBottomWidth: 0,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 12px rgba(79, 70, 229, 0.2)',
    } : {
      shadowColor: '#4f46e5',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    }),
  },
  headerContent: {
    flex: 1,
    marginRight: 10,
  },
  modalTitle: {
    fontSize: isMobile ? 20 : 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: -0.3,
    ...(Platform.OS === 'web' ? {
      textShadow: '0 1px 4px rgba(0, 0, 0, 0.15)',
    } : {}),
  },
  modalSubtitle: {
    fontSize: isMobile ? 11 : 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 0,
  },
  closeButton: {
    width: isMobile ? 32 : 36,
    height: isMobile ? 32 : 36,
    borderRadius: isMobile ? 16 : 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {}),
  },
  closeButtonText: {
    fontSize: isMobile ? 18 : 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  calendarContainer: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? 400 : 250,
    paddingHorizontal: isMobile ? 12 : 16,
    paddingTop: isMobile ? 12 : 16,
  },
  timeSelectionSection: {
    paddingHorizontal: isMobile ? 12 : 16,
    paddingVertical: isMobile ? 10 : 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginTop: 6,
    borderRadius: 10,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 2,
    }),
  },
  timeSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  timeSelectionTitle: {
    fontSize: isMobile ? 14 : 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: Platform.OS === 'web' ? 0 : 6,
    letterSpacing: -0.1,
  },
  timePickerButton: {
    paddingVertical: isMobile ? 8 : 10,
    paddingHorizontal: isMobile ? 12 : 14,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    minHeight: 36,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {
      shadowColor: '#4f46e5',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 3,
    }),
  },
  timePickerButtonText: {
    color: '#FFFFFF',
    fontSize: isMobile ? 12 : 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 15,
  },
  loadingContainer: {
    padding: isMobile ? 30 : 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  monthNavButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNavText: {
    fontSize: 24,
    color: '#4a55e1',
    fontWeight: 'bold',
  },
  monthName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3436',
  },
  calendar: {
    marginBottom: 15,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636E72',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: (screenWidth - 60) / 7,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 8,
  },
  dayCellOtherMonth: {
    opacity: 0.3,
  },
  dayCellAvailable: {
    backgroundColor: '#f0f2f5',
  },
  dayCellNoSlots: {
    backgroundColor: '#f44336',
    opacity: 0.8,
  },
  dayCellSelected: {
    backgroundColor: '#4a55e1',
  },
  dayText: {
    fontSize: 14,
    color: '#2D3436',
  },
  dayTextOtherMonth: {
    color: '#999',
  },
  dayTextAvailable: {
    color: '#4a55e1',
    fontWeight: '600',
  },
  dayTextNoSlots: {
    color: '#ffffff',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  selectedDateContainer: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#E8F0FE',
    borderRadius: 8,
  },
  selectedDateText: {
    fontSize: 14,
    color: '#4a55e1',
    fontWeight: '600',
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f0f2f5',
    marginBottom: 10,
    marginRight: 10,
    minWidth: 120,
  },
  timeSlotSelected: {
    backgroundColor: '#4a55e1',
  },
  timeSlotBooked: {
    backgroundColor: '#f44336', // Red color for booked slots
    borderWidth: 1,
    borderColor: '#d32f2f',
    opacity: 1, // Full opacity for better visibility
  },
  timeSlotText: {
    fontSize: 14,
    color: '#2D3436',
    fontWeight: '500',
    textAlign: 'center',
  },
  timeSlotTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  timeSlotTextBooked: {
    color: '#ffffff',
    fontWeight: '600',
  },
  noSlotsContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginVertical: 10,
  },
  noSlotsIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noSlotsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 8,
    textAlign: 'center',
  },
  noSlotsSubtext: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 20,
  },
  bookingSummaryCard: {
    marginTop: 12,
    marginHorizontal: isMobile ? 12 : 16,
    padding: isMobile ? 14 : 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    }),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: isMobile ? 15 : 16,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
  },
  summaryBadge: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  summaryDetails: {
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  priceCard: {
    backgroundColor: '#F3F4F6',
    padding: isMobile ? 12 : 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4f46e5',
    marginTop: 6,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  priceValue: {
    fontSize: isMobile ? 22 : 24,
    fontWeight: '800',
    color: '#4f46e5',
    letterSpacing: -0.3,
  },
  summaryHint: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 16,
  },
  attendeesContainer: {
    marginHorizontal: isMobile ? 12 : 16,
    marginTop: 12,
    marginBottom: 8,
    padding: isMobile ? 12 : 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 2,
    }),
  },
  attendeesLabel: {
    fontSize: isMobile ? 13 : 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  attendeesInputContainer: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    ...(Platform.OS === 'web' ? {
      transition: 'border-color 0.2s ease',
    } : {}),
  },
  attendeesInput: {
    paddingHorizontal: isMobile ? 12 : 14,
    paddingVertical: isMobile ? 12 : 14,
    fontSize: isMobile ? 15 : 16,
    color: '#111827',
    minHeight: isMobile ? 44 : 48,
    fontWeight: '600',
  },
  attendeesHint: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 16,
  },
  timeSlotDisabled: {
    opacity: 0.5,
    backgroundColor: '#f0f2f5',
  },
  timeSlotTextDisabled: {
    color: '#A4B0BE',
  },
  modalFooter: {
    paddingHorizontal: isMobile ? 16 : 20,
    paddingVertical: isMobile ? 14 : 16,
    paddingBottom: Platform.OS === 'ios' ? (isMobile ? 28 : 32) : (isMobile ? 14 : 20),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 6,
    }),
  },
  confirmButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: isMobile ? 14 : 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: isMobile ? 48 : 52,
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(79, 70, 229, 0.3), 0 2px 4px rgba(79, 70, 229, 0.2)',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {
      shadowColor: '#4f46e5',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    }),
  },
  confirmButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
    ...(Platform.OS === 'web' ? {
      boxShadow: 'none',
      cursor: 'not-allowed',
    } : {
      shadowOpacity: 0,
      elevation: 0,
    }),
  },
  confirmButtonIcon: {
    fontSize: isMobile ? 16 : 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: isMobile ? 15 : 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  confirmButtonTextDisabled: {
    color: '#9CA3AF',
  },
  footerInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  footerInfoText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});

