import React, { useState, useEffect, useMemo } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { useBreakpoints } from '../hooks/useBreakpoints';
import { semantic } from '../theme';
import { getApiBaseUrl } from '../services/api';
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

  const { isMobile, screenWidth } = useBreakpoints();
  const styles = useMemo(() => createStyles(isMobile, screenWidth), [isMobile, screenWidth]);

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
            <Feather name="x" size={22} color={semantic.textSecondary} />
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
              placeholderTextColor={semantic.textMuted}
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
              placeholderTextColor={semantic.textMuted}
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
              placeholderTextColor={semantic.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={saving}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={semantic.surface} />
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

const createStyles = (isMobile: boolean, screenWidth: number) => {
  const isExtraSmall = screenWidth < 360;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: semantic.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: isMobile ? 16 : 20,
      paddingVertical: isMobile ? 12 : 16,
      backgroundColor: semantic.surface,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    closeButton: {
      padding: 8,
    },
    closeButtonText: {
      fontSize: 18,
      color: semantic.textSecondary,
      fontWeight: 'bold',
    },
    headerTitle: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: 'bold',
      color: semantic.textPrimary,
    },
    placeholder: {
      width: 40,
    },
    content: {
      flex: 1,
      padding: isMobile ? 16 : 20,
    },
    inputGroup: {
      marginBottom: isMobile ? 20 : 24,
    },
    label: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: semantic.surface,
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      padding: isMobile ? 10 : 12,
      fontSize: isMobile ? 14 : 16,
      color: semantic.textPrimary,
    },
    textArea: {
      height: isMobile ? 80 : 100,
      paddingTop: 12,
    },
    dateDisplay: {
      backgroundColor: semantic.surface,
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      padding: isMobile ? 10 : 12,
      marginBottom: 12,
    },
    dateText: {
      fontSize: isMobile ? 14 : 16,
      color: semantic.textPrimary,
      fontWeight: '500',
    },
    timeRow: {
      flexDirection: isExtraSmall ? 'column' : 'row',
      gap: 12,
    },
    timeButton: {
      flex: isExtraSmall ? undefined : 1,
      backgroundColor: semantic.surface,
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      padding: isMobile ? 10 : 12,
      alignItems: 'center',
    },
    timeButtonText: {
      fontSize: isMobile ? 14 : 16,
      color: semantic.textPrimary,
      fontWeight: '500',
    },
    footer: {
      flexDirection: 'row',
      padding: isMobile ? 16 : 20,
      backgroundColor: semantic.surface,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
      gap: 12,
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.1)' }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 5,
          }),
    },
    cancelButton: {
      flex: 1,
      backgroundColor: semantic.surface,
      borderWidth: 1,
      borderColor: semantic.border,
      paddingVertical: isMobile ? 12 : 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: semantic.textSecondary,
    },
    saveButton: {
      flex: 1,
      backgroundColor: semantic.primary,
      paddingVertical: isMobile ? 12 : 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: 'bold',
      color: semantic.surface,
    },
  });
};
