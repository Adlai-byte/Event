import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { getApiBaseUrl } from '../services/api';
import { getShadowStyle } from '../utils/shadowStyles';
import { BookingWeekCalendar } from './BookingWeekCalendar';
import { TimePickerModal } from './TimePickerModal';

interface EditBookingModalProps {
  visible: boolean;
  booking: {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    dateStr?: string; // YYYY-MM-DD format
    startTime: string; // HH:MM:SS
    endTime: string; // HH:MM:SS
    location: string;
    attendees: number;
    description?: string;
  };
  userEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  visible,
  booking,
  userEmail,
  onClose,
  onSuccess,
}) => {
  const [eventName, setEventName] = useState(booking.title);
  const [selectedDate, setSelectedDate] = useState<string | null>(booking.dateStr || booking.date);
  const [startTime, setStartTime] = useState(booking.startTime.substring(0, 5)); // HH:MM
  const [endTime, setEndTime] = useState(booking.endTime.substring(0, 5)); // HH:MM
  const [location, setLocation] = useState(booking.location);
  const [notes, setNotes] = useState(booking.description || '');
  const [saving, setSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'start' | 'end'>('start');
  const [currentWeek, setCurrentWeek] = useState<Date>(() => {
    // Initialize with selected date or today
    if (booking.dateStr || booking.date) {
      return new Date(booking.dateStr || booking.date);
    }
    return new Date();
  });

  useEffect(() => {
    if (visible) {
      setEventName(booking.title);
      const bookingDate = booking.dateStr || booking.date;
      setSelectedDate(bookingDate);
      setStartTime(booking.startTime.substring(0, 5));
      setEndTime(booking.endTime.substring(0, 5));
      setLocation(booking.location);
      setNotes(booking.description || '');
      // Set current week to the booking date
      if (bookingDate) {
        setCurrentWeek(new Date(bookingDate));
      }
    }
  }, [visible, booking]);

  const handleSave = async () => {
    if (!eventName.trim()) {
      Alert.alert('Error', 'Event name is required');
      return;
    }
    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }
    if (!startTime || !endTime) {
      Alert.alert('Error', 'Please select start and end times');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Error', 'Location is required');
      return;
    }

    // Validate time
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    if (end <= start) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    try {
      setSaving(true);
      const resp = await fetch(`${getApiBaseUrl()}/api/bookings/${booking.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail,
          eventName: eventName.trim(),
          eventDate: selectedDate,
          startTime: `${startTime}:00`,
          endTime: `${endTime}:00`,
          location: location.trim(),
          attendees: null,
          notes: notes.trim() || null,
        }),
      });

      const data = await resp.json();

      if (resp.ok && data.ok) {
        Alert.alert('Success', 'Booking updated successfully');
        onSuccess();
        onClose();
      } else {
        Alert.alert('Error', data.error || 'Failed to update booking');
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      Alert.alert('Error', 'Failed to update booking. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const calculateDuration = (start: string, end: string): number => {
    const startParts = start.split(':').map(Number);
    const endParts = end.split(':').map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];
    return endMinutes - startMinutes;
  };

  const handleTimeSelect = (selectedStartTime: string, selectedEndTime: string) => {
    const startTimeStr = selectedStartTime.substring(0, 5); // Extract HH:MM from HH:MM:SS
    const endTimeStr = selectedEndTime.substring(0, 5); // Extract HH:MM from HH:MM:SS
    
    if (timePickerMode === 'start') {
      setStartTime(startTimeStr);
      // Auto-adjust end time if it's before the new start time
      const newStart = new Date(`2000-01-01T${startTimeStr}:00`);
      const currentEnd = new Date(`2000-01-01T${endTime}:00`);
      if (currentEnd <= newStart) {
        // Use the end time from the picker
        setEndTime(endTimeStr);
      }
    } else {
      setEndTime(endTimeStr);
      // Ensure end time is after start time
      const newEnd = new Date(`2000-01-01T${endTimeStr}:00`);
      const currentStart = new Date(`2000-01-01T${startTime}:00`);
      if (newEnd <= currentStart) {
        Alert.alert('Error', 'End time must be after start time');
        return;
      }
    }
    setShowTimePicker(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Booking</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Event Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Name *</Text>
            <TextInput
              style={styles.input}
              value={eventName}
              onChangeText={setEventName}
              placeholder="Enter event name"
              placeholderTextColor="#95A5A6"
            />
          </View>

          {/* Date Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date *</Text>
            {selectedDate && (
              <View style={styles.dateDisplay}>
                <Text style={styles.dateText}>
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            )}
            <BookingWeekCalendar
              currentWeek={currentWeek}
              onWeekChange={setCurrentWeek}
              availableSlots={[]}
              selectedSlots={[]}
              onSlotToggle={() => {}}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              noSlotsDates={[]}
            />
          </View>

          {/* Time Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Time *</Text>
            <View style={styles.timeRow}>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => {
                  setTimePickerMode('start');
                  setShowTimePicker(true);
                }}
              >
                <Text style={styles.timeButtonText}>Start: {startTime || 'Select'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => {
                  setTimePickerMode('end');
                  setShowTimePicker(true);
                }}
              >
                <Text style={styles.timeButtonText}>End: {endTime || 'Select'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Enter location"
              placeholderTextColor="#95A5A6"
            />
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any additional notes..."
              placeholderTextColor="#95A5A6"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Time Picker Modal */}
        <TimePickerModal
          visible={showTimePicker}
          selectedDate={selectedDate}
          availableSlots={[]}
          initialStartTime={timePickerMode === 'start' ? `${startTime}:00` : startTime}
          initialDuration={timePickerMode === 'end' ? calculateDuration(startTime, endTime) : 60}
          onClose={() => setShowTimePicker(false)}
          onConfirm={handleTimeSelect}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#636E72',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2C3E50',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  dateDisplay: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    gap: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    }),
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#636E72',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6C63FF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

