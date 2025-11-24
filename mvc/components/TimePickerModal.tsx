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
  onClose: () => void;
  onConfirm: (startTime: string, endTime: string) => void;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  selectedDate,
  availableSlots = [],
  existingBookings = [],
  initialStartTime,
  initialDuration = 60,
  onClose,
  onConfirm,
}) => {
  // Generate time options (every 30 minutes from 9 AM to 6 PM)
  const generateTimeOptions = (): string[] => {
    const options: string[] = [];
    for (let hour = 9; hour < 18; hour++) {
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
  const getAvailableStartTimes = (): string[] => {
    if (!availableSlots || availableSlots.length === 0) return timeOptions;
    
    const availableTimes = new Set<string>();
    availableSlots.forEach(slot => {
      if (slot.available) {
        // Add all 30-minute intervals within this slot
        const startParts = slot.start.split(':').map(Number);
        const endParts = slot.end.split(':').map(Number);
        const startMinutes = startParts[0] * 60 + startParts[1];
        const endMinutes = endParts[0] * 60 + endParts[1];
        
        for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
          const hour = Math.floor(minutes / 60);
          const min = minutes % 60;
          const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
          if (timeOptions.includes(timeStr)) {
            availableTimes.add(timeStr);
          }
        }
      }
    });
    
    return availableTimes.size > 0 ? Array.from(availableTimes).sort() : timeOptions;
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
    if (startTime && duration) {
      const startParts = startTime.split(':').map(Number);
      const startHour = startParts[0];
      const startMin = startParts[1];
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = startMinutes + duration;
      
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
  }, [startTime, duration, existingBookings]);

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
      if ((startMinutes < bookingEndMinutes) && (endMinutes > bookingStartMinutes)) {
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
      Alert.alert(
        'Time Conflict',
        conflict.message,
        [{ text: 'OK' }]
      );
      return;
    }

    if (startTime && endTime) {
      onConfirm(startTime, endTime);
      onClose();
    }
  };

  const availableStartTimes = getAvailableStartTimes();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Time</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Start Time Dropdown */}
            <View style={styles.section}>
              <Text style={styles.label}>Start Time</Text>
              <View style={styles.pickerContainer}>
                <ScrollView style={styles.pickerScrollView} nestedScrollEnabled>
                  {availableStartTimes.map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.pickerItem,
                        startTime === time && styles.pickerItemSelected
                      ]}
                      onPress={() => setStartTime(time)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        startTime === time && styles.pickerItemTextSelected
                      ]}>
                        {formatTime(time)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Duration Dropdown */}
            <View style={styles.section}>
              <Text style={styles.label}>Duration</Text>
              <View style={styles.pickerContainer}>
                <ScrollView style={styles.pickerScrollView} nestedScrollEnabled>
                  {durationOptions.map((option) => (
                    <TouchableOpacity
                      key={option.minutes}
                      style={[
                        styles.pickerItem,
                        duration === option.minutes && styles.pickerItemSelected
                      ]}
                      onPress={() => setDuration(option.minutes)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        duration === option.minutes && styles.pickerItemTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* End Time Display */}
            <View style={styles.section}>
              <Text style={styles.label}>End Time</Text>
              <View style={styles.endTimeDisplay}>
                <Text style={styles.endTimeText}>
                  {endTime ? `${formatTime(endTime)}${endTimeIsNextDay ? ' (next day)' : ''}` : '--:-- --'}
                </Text>
              </View>
            </View>

            {/* Conflict Indicator */}
            {conflict && (
              <View style={styles.conflictContainer}>
                <Text style={styles.conflictIcon}>⚠️</Text>
                <Text style={styles.conflictText}>{conflict.message}</Text>
              </View>
            )}

            {/* Info Message */}
            {!conflict && endTime && (
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  ✓ This time slot is available
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Confirm Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                conflict && styles.confirmButtonDisabled
              ]}
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
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
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    overflow: 'hidden',
    maxHeight: 200,
  },
  pickerScrollView: {
    maxHeight: 200,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  pickerItemSelected: {
    backgroundColor: '#4285F4',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#2D3436',
  },
  pickerItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  endTimeDisplay: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  endTimeText: {
    fontSize: 18,
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
    borderTopColor: '#E9ECEF',
  },
  confirmButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

