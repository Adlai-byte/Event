import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { colors, semantic } from '../../theme';
import { getShadowStyle } from '../../utils/shadowStyles';
import type { EventItem } from '../../hooks/useEventData';

interface CreateEventModalProps {
  visible: boolean;
  isEdit: boolean;
  initialData?: Partial<EventItem>;
  isSubmitting: boolean;
  onSubmit: (data: {
    name: string;
    date: string;
    endDate?: string | null;
    location?: string;
    budget?: number;
    guestCount?: number;
    description?: string;
  }) => void;
  onClose: () => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  visible,
  isEdit,
  initialData,
  isSubmitting,
  onSubmit,
  onClose,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);

  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initialData?.name || '');
      setDate(initialData?.date ? String(initialData.date).split('T')[0] : '');
      setEndDate(initialData?.endDate ? String(initialData.endDate).split('T')[0] : '');
      setLocation(initialData?.location || '');
      setBudget(initialData?.budget ? String(initialData.budget) : '');
      setGuestCount(initialData?.guestCount ? String(initialData.guestCount) : '');
      setDescription(initialData?.description || '');
      setError(null);
    }
  }, [visible, initialData]);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Event name is required');
      return;
    }
    if (!date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setError('Valid date required (YYYY-MM-DD)');
      return;
    }
    if (endDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(endDate.trim())) {
      setError('Valid end date required (YYYY-MM-DD)');
      return;
    }
    setError(null);
    onSubmit({
      name: name.trim(),
      date: date.trim(),
      endDate: endDate.trim() || null,
      location: location.trim() || undefined,
      budget: budget ? parseFloat(budget) : undefined,
      guestCount: guestCount ? parseInt(guestCount, 10) : undefined,
      description: description.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{isEdit ? 'Edit Event' : 'Create Event'}</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <Feather name="x" size={24} color={semantic.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {error && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={16} color={colors.error[500]} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.label}>Event Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Wedding Reception"
              placeholderTextColor={semantic.textMuted}
              accessibilityLabel="Event name"
              maxLength={255}
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Start Date *</Text>
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={semantic.textMuted}
                  accessibilityLabel="Event start date"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>End Date</Text>
                <TextInput
                  style={styles.input}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={semantic.textMuted}
                  accessibilityLabel="Event end date"
                />
              </View>
            </View>

            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Grand Ballroom, Manila"
              placeholderTextColor={semantic.textMuted}
              accessibilityLabel="Event location"
              maxLength={500}
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Budget</Text>
                <TextInput
                  style={styles.input}
                  value={budget}
                  onChangeText={setBudget}
                  placeholder="0.00"
                  placeholderTextColor={semantic.textMuted}
                  keyboardType="numeric"
                  accessibilityLabel="Event budget"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Guest Count</Text>
                <TextInput
                  style={styles.input}
                  value={guestCount}
                  onChangeText={setGuestCount}
                  placeholder="0"
                  placeholderTextColor={semantic.textMuted}
                  keyboardType="numeric"
                  accessibilityLabel="Guest count"
                />
              </View>
            </View>

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your event..."
              placeholderTextColor={semantic.textMuted}
              multiline
              numberOfLines={4}
              accessibilityLabel="Event description"
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={isEdit ? 'Save changes' : 'Create event'}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.neutral[0]} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEdit ? 'Save Changes' : 'Create Event'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (isMobile: boolean, screenWidth: number) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isMobile ? 16 : 24,
    },
    container: {
      backgroundColor: semantic.surface,
      borderRadius: 16,
      width: isMobile ? '100%' : Math.min(560, screenWidth - 48),
      maxHeight: '90%',
      ...getShadowStyle(0.15, 8, 4),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
    body: {
      padding: 20,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.error[50],
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      gap: 8,
    },
    errorText: {
      color: colors.error[600],
      fontSize: 14,
      flex: 1,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 6,
      marginTop: 12,
    },
    input: {
      backgroundColor: semantic.background,
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: semantic.textPrimary,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    row: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 0 : 12,
    },
    halfField: {
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
      gap: 12,
    },
    cancelButton: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: semantic.textSecondary,
    },
    submitButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.primary[500],
      minWidth: 120,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.neutral[0],
    },
  });
