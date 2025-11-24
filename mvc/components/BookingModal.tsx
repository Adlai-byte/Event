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
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Book {serviceName}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.calendarContainer}>
            {loadingDates || loadingSlots ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#4a55e1" />
              </View>
            ) : (
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
            )}
            
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
                {(() => {
                  // Filter to get only available slots (exclude booked/taken slots)
                  const availableOnly = availableSlots.filter(slot => slot.available === true);
                  
                  return availableOnly.length > 0 ? (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.timeButtonsContainer}
                      contentContainerStyle={styles.timeButtonsContent}
                    >
                      {availableOnly.map((slot, index) => {
                        const isSelected = selectedSlots.some(s => s.start === slot.start && s.end === slot.end);
                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.timeButton,
                              isSelected && styles.timeButtonSelected
                            ]}
                            onPress={() => {
                              handleSlotToggle(slot);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.timeButtonText,
                              isSelected && styles.timeButtonTextSelected
                            ]}>
                              {formatTime(slot.start)} - {formatTime(slot.end)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <View style={styles.noSlotsContainer}>
                      <Text style={styles.noSlotsIcon}>📅</Text>
                      <Text style={styles.noSlotsText}>No Available Time Slots</Text>
                      <Text style={styles.noSlotsSubtext}>
                        This date is fully booked. Please select another date.
                      </Text>
                    </View>
                  );
                })()}
              </View>
            )}
            
            {/* Attendees Input (for catering services) */}
            {serviceDetails?.category.toLowerCase() === 'catering' && (
              <View style={styles.attendeesContainer}>
                <Text style={styles.attendeesLabel}>Number of Attendees (Pax) *</Text>
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
                    placeholder="Enter number of attendees"
                    placeholderTextColor="#999"
                  />
                </View>
                <Text style={styles.attendeesHint}>
                  Cost will be calculated per person
                </Text>
              </View>
            )}

            {/* Selected Slots Info */}
            {selectedDate && selectedSlots.length > 0 && (
              <View style={styles.selectedSlotsInfo}>
                <Text style={styles.selectedSlotsText}>
                  {selectedSlots.length} time slot{selectedSlots.length !== 1 ? 's' : ''} selected
                </Text>
                {serviceDetails?.category.toLowerCase() !== 'catering' && (
                  <Text style={styles.selectedSlotsSubtext}>
                    Total duration: {formatDuration(calculateTotalDuration(selectedSlots))}
                  </Text>
                )}
                {serviceDetails?.category.toLowerCase() === 'catering' && (
                  <Text style={styles.selectedSlotsSubtext}>
                    {attendees} {parseInt(attendees) === 1 ? 'person' : 'people'}
                  </Text>
                )}
                {estimatedCost > 0 && (
                  <View style={styles.costEstimationContainer}>
                    <Text style={styles.costEstimationLabel}>Estimated Cost:</Text>
                    <Text style={styles.costEstimationValue}>₱{estimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  </View>
                )}
                <Text style={styles.selectedSlotsHint}>
                  Click on any time slot in the calendar to add more bookings
                </Text>
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

          {/* Confirm Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!selectedDate || selectedSlots.length === 0 || (serviceDetails?.category.toLowerCase() === 'catering' && (!attendees || parseInt(attendees) < 1))) && styles.confirmButtonDisabled
              ]}
              onPress={handleConfirm}
              disabled={!selectedDate || selectedSlots.length === 0 || (serviceDetails?.category.toLowerCase() === 'catering' && (!attendees || parseInt(attendees) < 1))}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.confirmButtonText,
                (!selectedDate || selectedSlots.length === 0) && styles.confirmButtonTextDisabled
              ]}>
                Confirm Booking
              </Text>
            </TouchableOpacity>
            {selectedSlots.length > 0 && (
              <Text style={styles.confirmButtonHint}>
                {selectedSlots.length} time slot{selectedSlots.length !== 1 ? 's' : ''} selected
              </Text>
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
    backgroundColor: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16, // Account for status bar on iOS
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    flex: 1,
    marginRight: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#636E72',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  calendarContainer: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? 500 : 300,
  },
  timeSelectionSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    backgroundColor: '#FFFFFF',
  },
  timeSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  timeSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: Platform.OS === 'web' ? 0 : 8,
  },
  timePickerButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#4285F4',
    borderRadius: 8,
    minHeight: 40, // Better touch target
  },
  timePickerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  timeButtonsContainer: {
    flexDirection: 'row',
  },
  timeButtonsContent: {
    paddingRight: 20,
  },
  timeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F3F4',
    marginRight: 8,
    marginBottom: 8,
    minWidth: 110,
    minHeight: 44, // Better touch target for mobile
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeButtonSelected: {
    backgroundColor: '#4285F4',
  },
  timeButtonDisabled: {
    backgroundColor: '#E0E0E0',
    opacity: 0.5,
  },
  timeButtonText: {
    fontSize: 14,
    color: '#2D3436',
    fontWeight: '500',
  },
  timeButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timeButtonTextDisabled: {
    color: '#A4B0BE',
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
    padding: 20,
    alignItems: 'center',
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
  selectedSlotsInfo: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: '#E8F0FE',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedSlotsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a55e1',
    marginBottom: 4,
  },
  costEstimationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  costEstimationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
  },
  costEstimationValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4a55e1',
  },
  selectedSlotsSubtext: {
    fontSize: 12,
    color: '#636E72',
  },
  selectedSlotsHint: {
    fontSize: 11,
    color: '#4a55e1',
    marginTop: 4,
    fontStyle: 'italic',
  },
  attendeesContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  attendeesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 8,
  },
  attendeesInputContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  attendeesInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2D3436',
    minHeight: 48,
  },
  attendeesHint: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 4,
    fontStyle: 'italic',
  },
  timeSlotDisabled: {
    opacity: 0.5,
    backgroundColor: '#f0f2f5',
  },
  timeSlotTextDisabled: {
    color: '#A4B0BE',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16, // Account for safe area on iOS
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    backgroundColor: '#FFFFFF',
  },
  confirmButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 56, // Better touch target for mobile
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(66, 133, 244, 0.3)',
    } : {
      shadowColor: '#4285F4',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    }),
  },
  confirmButtonDisabled: {
    backgroundColor: '#E0E0E0',
    opacity: 0.6,
    ...(Platform.OS === 'web' ? {
      boxShadow: 'none',
    } : {
      shadowOpacity: 0,
      elevation: 0,
    }),
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  confirmButtonTextDisabled: {
    color: '#9E9E9E',
  },
  confirmButtonHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#636E72',
    textAlign: 'center',
  },
});

