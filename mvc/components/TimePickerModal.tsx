import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { semantic } from '../theme';
import { useBreakpoints } from '../hooks/useBreakpoints';

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

interface TimePickerModalProps {
  visible: boolean;
  selectedDate: string | null;
  availableSlots: TimeSlot[];
  existingBookings?: Array<{ start: string; end: string; title?: string }>;
  initialStartTime?: string; // Optional: initial start time (HH:MM or HH:MM:SS)
  initialDuration?: number; // Optional: initial duration in minutes
  hideDuration?: boolean; // Optional: hide duration selection (for catering services)
  onClose: () => void;
  onConfirm: (startTime: string, endTime: string) => void;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  selectedDate: _selectedDate,
  availableSlots: _availableSlots = [],
  existingBookings = [],
  initialStartTime,
  initialDuration = 60,
  hideDuration = false,
  onClose,
  onConfirm,
}) => {
  const { screenWidth, screenHeight, isTablet } = useBreakpoints();
  const isWeb = Platform.OS === 'web';

  const sheetHeight = isWeb ? undefined : Math.min(screenHeight * 0.92, screenHeight - 32);
  const pickerMaxHeight = isWeb
    ? isTablet
      ? 400
      : 320
    : Math.min(screenHeight * 0.4, isTablet ? 400 : 320);

  // Responsive font sizes - larger on web
  const _baseFontSize = isWeb
    ? isTablet
      ? 20
      : 18
    : isTablet
      ? 18
      : Math.max(16, screenWidth * 0.04);
  const labelFontSize = isWeb
    ? isTablet
      ? 20
      : 18
    : isTablet
      ? 18
      : Math.max(16, screenWidth * 0.042);
  const pickerItemFontSize = isWeb
    ? isTablet
      ? 20
      : 18
    : isTablet
      ? 18
      : Math.max(17, screenWidth * 0.045);
  const endTimeFontSize = isWeb
    ? isTablet
      ? 24
      : 22
    : isTablet
      ? 22
      : Math.max(20, screenWidth * 0.052);

  // Web-specific modal dimensions
  const modalWidth = isWeb ? (isTablet ? 600 : Math.min(500, screenWidth * 0.9)) : '100%';
  const modalMaxHeight = isWeb ? (isTablet ? 700 : Math.min(600, screenHeight * 0.9)) : undefined;

  // Generate time options (every 30 minutes from 8 AM to 7 PM)
  const generateTimeOptions = (): string[] => {
    const options: string[] = [];
    for (let hour = 8; hour < 19; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
        options.push(timeStr);
      }
    }
    return options;
  };

  // Generate duration options
  const generateDurationOptions = (): Array<{ label: string; minutes: number }> => {
    return [
      { label: '30 minutes', minutes: 30 },
      { label: '1 hour', minutes: 60 },
      { label: '1.5 hours', minutes: 90 },
      { label: '2 hours', minutes: 120 },
      { label: '2.5 hours', minutes: 150 },
      { label: '3 hours', minutes: 180 },
      { label: '3.5 hours', minutes: 210 },
      { label: '4 hours', minutes: 240 },
      { label: '4.5 hours', minutes: 270 },
      { label: '5 hours', minutes: 300 },
      { label: '5.5 hours', minutes: 330 },
      { label: '6 hours', minutes: 360 },
      { label: '7 hours', minutes: 420 },
      { label: '8 hours', minutes: 480 },
      { label: '9 hours', minutes: 540 },
    ];
  };

  const timeOptions = generateTimeOptions();
  const durationOptions = generateDurationOptions();

  // Filter available start times based on available slots
  // Always show all time options from 8 AM, but mark unavailable ones
  const getAvailableStartTimes = (): string[] => {
    // Always return all time options from 8 AM to 7 PM
    // The availability will be checked when user selects a time
    return timeOptions;
  };

  // Initialize start time from prop or default
  const getInitialStartTime = (): string => {
    if (initialStartTime) {
      // Convert HH:MM to HH:MM:00 if needed
      if (initialStartTime.length === 5) {
        return `${initialStartTime}:00`;
      }
      return initialStartTime;
    }
    return timeOptions[0];
  };

  const [startTime, setStartTime] = useState<string>(getInitialStartTime());
  const [duration, setDuration] = useState<number>(initialDuration);
  const [endTime, setEndTime] = useState<string>('');
  const [endTimeIsNextDay, setEndTimeIsNextDay] = useState<boolean>(false);
  const [conflict, setConflict] = useState<{ message: string; booking: any } | null>(null);

  // Update start time when modal opens or initialStartTime changes
  useEffect(() => {
    if (visible && initialStartTime) {
      const timeStr = initialStartTime.length === 5 ? `${initialStartTime}:00` : initialStartTime;
      if (timeOptions.includes(timeStr)) {
        setStartTime(timeStr);
      }
    }
  }, [visible, initialStartTime]);

  // Calculate end time whenever start time or duration changes
  useEffect(() => {
    if (startTime) {
      // For catering (hideDuration), use default 1 hour duration
      const effectiveDuration = hideDuration ? 60 : duration;

      if (effectiveDuration) {
        const startParts = startTime.split(':').map(Number);
        const startHour = startParts[0];
        const startMin = startParts[1];
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = startMinutes + effectiveDuration;

        // Handle times that go past midnight (24 hours = 1440 minutes)
        const totalMinutesInDay = 24 * 60;
        const endMinutesInDay = endMinutes % totalMinutesInDay;
        const isNextDay = endMinutes >= totalMinutesInDay;

        const endHour = Math.floor(endMinutesInDay / 60);
        const endMin = endMinutesInDay % 60;

        // Format end time (can be next day)
        const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}:00`;
        setEndTime(endTimeStr);

        // Store if it's next day for display purposes
        setEndTimeIsNextDay(isNextDay);

        // Check for conflicts
        checkConflict(startTime, endTimeStr);
      }
    }
  }, [startTime, duration, hideDuration, existingBookings]);

  // Check for conflicts with existing bookings
  const checkConflict = (start: string, end: string) => {
    const startParts = start.split(':').map(Number);
    const endParts = end.split(':').map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[2] || 0;

    for (const booking of existingBookings) {
      const bookingStartParts = booking.start.split(':').map(Number);
      const bookingEndParts = booking.end.split(':').map(Number);
      const bookingStartMinutes = bookingStartParts[0] * 60 + bookingStartParts[1];
      const bookingEndMinutes = bookingEndParts[0] * 60 + bookingEndParts[1];

      // Check for overlap
      if (startMinutes < bookingEndMinutes && endMinutes > bookingStartMinutes) {
        const formatTime = (timeStr: string): string => {
          const [hours, minutes] = timeStr.split(':');
          const hour = parseInt(hours);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 || 12;
          return `${displayHour}:${minutes} ${ampm}`;
        };

        setConflict({
          message: `This time conflicts with an event from ${formatTime(booking.start)} - ${formatTime(booking.end)}`,
          booking: booking,
        });
        return;
      }
    }
    setConflict(null);
  };

  // Format time for display
  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleConfirm = () => {
    if (conflict) {
      Alert.alert('Time Conflict', conflict.message, [{ text: 'OK' }]);
      return;
    }

    if (startTime && endTime) {
      onConfirm(startTime, endTime);
      onClose();
    }
  };

  const availableStartTimes = getAvailableStartTimes();

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            isWeb
              ? {
                  width: modalWidth,
                  maxHeight: modalMaxHeight,
                  borderRadius: 16,
                  alignSelf: 'center',
                }
              : { height: sheetHeight },
          ]}
        >
          {!isWeb && <View style={styles.dragHandle} />}
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {hideDuration ? 'Select Pickup Time' : 'Select Time'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={18} color={semantic.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Start Time Dropdown */}
            <View style={styles.section}>
              <Text style={[styles.label, { fontSize: labelFontSize }]}>
                {hideDuration ? 'Pickup Time' : 'Start Time'}
              </Text>
              <View style={[styles.pickerContainer, { maxHeight: pickerMaxHeight }]}>
                <ScrollView
                  style={[styles.pickerScrollView, { maxHeight: pickerMaxHeight }]}
                  nestedScrollEnabled
                >
                  {availableStartTimes.map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.pickerItem,
                        {
                          minHeight: isWeb ? (isTablet ? 60 : 52) : isTablet ? 64 : 56,
                        },
                        startTime === time && styles.pickerItemSelected,
                      ]}
                      onPress={() => setStartTime(time)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          { fontSize: pickerItemFontSize },
                          startTime === time && styles.pickerItemTextSelected,
                        ]}
                      >
                        {formatTime(time)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Duration Dropdown - Hidden for catering */}
            {!hideDuration && (
              <View style={styles.section}>
                <Text style={[styles.label, { fontSize: labelFontSize }]}>Duration</Text>
                <View style={[styles.pickerContainer, { maxHeight: pickerMaxHeight }]}>
                  <ScrollView
                    style={[styles.pickerScrollView, { maxHeight: pickerMaxHeight }]}
                    nestedScrollEnabled
                  >
                    {durationOptions.map((option) => (
                      <TouchableOpacity
                        key={option.minutes}
                        style={[
                          styles.pickerItem,
                          {
                            minHeight: isWeb ? (isTablet ? 60 : 52) : isTablet ? 64 : 56,
                          },
                          duration === option.minutes && styles.pickerItemSelected,
                        ]}
                        onPress={() => setDuration(option.minutes)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            { fontSize: pickerItemFontSize },
                            duration === option.minutes && styles.pickerItemTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}

            {/* End Time Display */}
            <View style={styles.section}>
              <Text style={[styles.label, { fontSize: labelFontSize }]}>End Time</Text>
              <View style={styles.endTimeDisplay}>
                <Text style={[styles.endTimeText, { fontSize: endTimeFontSize }]}>
                  {endTime
                    ? `${formatTime(endTime)}${endTimeIsNextDay ? ' (next day)' : ''}`
                    : '--:-- --'}
                </Text>
              </View>
            </View>

            {/* Conflict Indicator */}
            {conflict && (
              <View style={styles.conflictContainer}>
                <Feather
                  name="alert-triangle"
                  size={20}
                  color="#F44336"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.conflictText}>{conflict.message}</Text>
              </View>
            )}

            {/* Info Message */}
            {!conflict && endTime && (
              <View style={styles.infoContainer}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Feather name="check-circle" size={16} color="#2E7D32" />
                  <Text style={styles.infoText}>This time slot is available</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Confirm Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.confirmButton, conflict && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!!conflict}
            >
              <Text style={styles.confirmButtonText}>Confirm Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    padding: Platform.OS === 'web' ? 20 : 0,
  },
  modalContent: {
    backgroundColor: semantic.surface,
    borderTopLeftRadius: Platform.OS === 'web' ? 16 : 20,
    borderTopRightRadius: Platform.OS === 'web' ? 16 : 20,
    width: Platform.OS === 'web' ? 'auto' : '100%',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 10,
        }),
  },
  dragHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
    ...(Platform.OS === 'web' && {
      display: 'none',
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: semantic.textPrimary,
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
    color: semantic.textSecondary,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 8,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: semantic.textPrimary,
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: semantic.background,
    overflow: 'hidden',
    minHeight: Platform.OS === 'web' ? 240 : 240,
    ...(Platform.OS === 'web' && {
      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
    }),
  },
  pickerScrollView: {
    maxHeight: Platform.OS === 'web' ? 280 : 200,
    ...(Platform.OS === 'web' && {
      scrollbarWidth: 'thin',
      scrollbarColor: `#C1C1C1 ${semantic.background}`,
    }),
  },
  pickerItem: {
    paddingVertical: Platform.OS === 'web' ? 16 : 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
    minHeight: 56,
    justifyContent: 'center',
  },
  pickerItemSelected: {
    backgroundColor: '#4285F4',
  },
  pickerItemText: {
    fontSize: 17,
    color: semantic.textPrimary,
    fontWeight: '500',
  },
  pickerItemTextSelected: {
    color: semantic.surface,
    fontWeight: '600',
  },
  endTimeDisplay: {
    padding: 20,
    backgroundColor: semantic.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  endTimeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4285F4',
  },
  conflictContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
    marginTop: 8,
  },
  conflictIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  conflictText: {
    flex: 1,
    fontSize: 14,
    color: '#C62828',
    fontWeight: '500',
  },
  infoContainer: {
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: semantic.border,
  },
  confirmButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 20,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 60,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3)',
        }
      : {
          shadowColor: '#4285F4',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 4,
        }),
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  confirmButtonText: {
    color: semantic.surface,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
