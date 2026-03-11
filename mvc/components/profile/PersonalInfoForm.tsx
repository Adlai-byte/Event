import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TextInput, Platform, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { createStyles } from '../../views/user/PersonalInfoView.styles';

export interface PersonalInfoFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface PersonalInfoFormProps {
  formData: PersonalInfoFormData;
  isEditing: boolean;
  onChangeField: (key: keyof PersonalInfoFormData, value: string) => void;
}

// ── Helpers ──────────────────────────────────────────────

/** Convert stored date string (MM/DD/YYYY or YYYY-MM-DD) to HTML date input value (YYYY-MM-DD) */
function toISODate(value: string): string {
  if (!value) return '';
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // MM/DD/YYYY
  const parts = value.split('/');
  if (parts.length === 3) {
    const [mm, dd, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return value;
}

/** Convert HTML date value (YYYY-MM-DD) to display format (MM/DD/YYYY) */
function toDisplayDate(iso: string): string {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${m}/${d}/${y}`;
  }
  return iso;
}

// ── Date of Birth Field ──────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DateOfBirthFieldProps {
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  styles: ReturnType<typeof createStyles>;
}

const DateOfBirthField: React.FC<DateOfBirthFieldProps> = ({ value, isEditing, onChange, styles }) => {
  const [showPicker, setShowPicker] = useState(false);

  // Parse current value into month/day/year
  const parsed = useMemo(() => {
    const iso = toISODate(value);
    if (iso) {
      const [y, m, d] = iso.split('-').map(Number);
      return { month: m, day: d, year: y };
    }
    return { month: 1, day: 1, year: 2000 };
  }, [value]);

  const [selMonth, setSelMonth] = useState(parsed.month);
  const [selDay, setSelDay] = useState(parsed.day);
  const [selYear, setSelYear] = useState(parsed.year);

  const openPicker = useCallback(() => {
    const iso = toISODate(value);
    if (iso) {
      const [y, m, d] = iso.split('-').map(Number);
      setSelMonth(m); setSelDay(d); setSelYear(y);
    }
    setShowPicker(true);
  }, [value]);

  const confirmPicker = useCallback(() => {
    const mm = String(selMonth).padStart(2, '0');
    const dd = String(selDay).padStart(2, '0');
    onChange(`${mm}/${dd}/${selYear}`);
    setShowPicker(false);
  }, [selMonth, selDay, selYear, onChange]);

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear; y >= currentYear - 100; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  const daysInMonth = useMemo(() => {
    return new Date(selYear, selMonth, 0).getDate();
  }, [selYear, selMonth]);

  // On web, use the native HTML date input for the best UX
  if (Platform.OS === 'web') {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Date of Birth</Text>
        {isEditing ? (
          <input
            type="date"
            value={toISODate(value)}
            onChange={(e: any) => onChange(toDisplayDate(e.target.value))}
            max={`${currentYear}-12-31`}
            min={`${currentYear - 100}-01-01`}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 10,
              paddingLeft: 16,
              paddingRight: 16,
              paddingTop: 12,
              paddingBottom: 12,
              fontSize: 16,
              color: '#0F172A',
              borderWidth: 1,
              borderStyle: 'solid' as const,
              borderColor: '#E2E8F0',
              width: '100%',
              boxSizing: 'border-box' as const,
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        ) : (
          <TextInput
            style={styles.fieldInput}
            value={value}
            editable={false}
            placeholder="MM/DD/YYYY"
            placeholderTextColor="#A4B0BE"
          />
        )}
      </View>
    );
  }

  // On mobile, use a touchable that opens a scroll picker modal
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>Date of Birth</Text>
      <TouchableOpacity
        onPress={isEditing ? openPicker : undefined}
        disabled={!isEditing}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Select date of birth"
      >
        <View style={[styles.fieldInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <Text style={{ fontSize: 16, color: value ? '#0F172A' : '#A4B0BE' }}>
            {value || 'MM/DD/YYYY'}
          </Text>
          {isEditing && <Feather name="calendar" size={18} color="#64748B" />}
        </View>
      </TouchableOpacity>

      {/* Picker Modal */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={pickerStyles.overlay}>
          <View style={pickerStyles.container}>
            {/* Header */}
            <View style={pickerStyles.header}>
              <TouchableOpacity onPress={() => setShowPicker(false)} accessibilityRole="button" accessibilityLabel="Cancel date selection">
                <Text style={pickerStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={pickerStyles.title}>Date of Birth</Text>
              <TouchableOpacity onPress={confirmPicker} accessibilityRole="button" accessibilityLabel="Confirm date selection">
                <Text style={pickerStyles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Columns */}
            <View style={pickerStyles.columns}>
              {/* Month */}
              <ScrollView style={pickerStyles.column} showsVerticalScrollIndicator={false}>
                {MONTHS.map((m, i) => (
                  <TouchableOpacity
                    key={m}
                    style={[pickerStyles.item, selMonth === i + 1 && pickerStyles.itemSelected]}
                    onPress={() => setSelMonth(i + 1)}
                  >
                    <Text style={[pickerStyles.itemText, selMonth === i + 1 && pickerStyles.itemTextSelected]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Day */}
              <ScrollView style={pickerStyles.column} showsVerticalScrollIndicator={false}>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[pickerStyles.item, selDay === d && pickerStyles.itemSelected]}
                    onPress={() => setSelDay(d)}
                  >
                    <Text style={[pickerStyles.itemText, selDay === d && pickerStyles.itemTextSelected]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Year */}
              <ScrollView style={pickerStyles.column} showsVerticalScrollIndicator={false}>
                {years.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[pickerStyles.item, selYear === y && pickerStyles.itemSelected]}
                    onPress={() => setSelYear(y)}
                  >
                    <Text style={[pickerStyles.itemText, selYear === y && pickerStyles.itemTextSelected]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  cancelText: { fontSize: 16, color: '#64748B' },
  doneText: { fontSize: 16, fontWeight: '600', color: '#2563EB' },
  columns: { flexDirection: 'row', height: 220 },
  column: { flex: 1 },
  item: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  itemSelected: {
    backgroundColor: '#EFF6FF',
  },
  itemText: { fontSize: 16, color: '#334155' },
  itemTextSelected: { color: '#2563EB', fontWeight: '600' },
});

// ── Main Form ────────────────────────────────────────────

export const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({
  formData,
  isEditing,
  onChangeField,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = useMemo(() => createStyles(isMobile, screenWidth), [isMobile, screenWidth]);

  const renderField = (
    label: string,
    value: string,
    key: keyof PersonalInfoFormData,
    placeholder: string,
    fieldIsEditing: boolean,
    fieldOnChangeField: (k: keyof PersonalInfoFormData, v: string) => void,
    keyboardType: 'default' | 'email-address' | 'phone-pad' | 'numeric' = 'default',
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={(text) => fieldOnChangeField(key, text)}
        placeholder={placeholder}
        keyboardType={keyboardType}
        editable={fieldIsEditing}
        placeholderTextColor="#A4B0BE"
      />
    </View>
  );

  return (
    <>
      {/* Personal Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Details</Text>

        {renderField(
          'First Name',
          formData.firstName,
          'firstName',
          'Enter your first name',
          isEditing,
          onChangeField,
        )}
        {renderField(
          'Middle Name (Optional)',
          formData.middleName,
          'middleName',
          'Enter your middle name (optional)',
          isEditing,
          onChangeField,
        )}
        {renderField(
          'Last Name',
          formData.lastName,
          'lastName',
          'Enter your last name',
          isEditing,
          onChangeField,
        )}
        {renderField(
          'Suffix (Optional)',
          formData.suffix,
          'suffix',
          'Enter suffix (e.g., Jr., Sr., III) - optional',
          isEditing,
          onChangeField,
        )}
        {/* Email Field - Not Editable */}
        <View style={styles.fieldContainer}>
          <View style={styles.emailFieldHeader}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.readOnlyBadge}>
              <Text style={styles.readOnlyBadgeText}>Read Only</Text>
            </View>
          </View>
          <View style={styles.emailInputContainer}>
            <TextInput
              style={[styles.fieldInput, styles.emailInputDisabled]}
              value={formData.email}
              placeholder="Enter your email"
              keyboardType="email-address"
              editable={false}
              placeholderTextColor="#A4B0BE"
            />
            <View style={styles.emailInfoIcon}>
              <Text style={styles.emailInfoText}>ℹ️</Text>
            </View>
          </View>
          <Text style={styles.emailHelperText}>
            Email cannot be changed. Contact support if you need to update your email address.
          </Text>
        </View>
        {renderField(
          'Phone',
          formData.phone,
          'phone',
          'Enter your phone number',
          isEditing,
          onChangeField,
          'phone-pad',
        )}
        {/* Date of Birth — date picker */}
        <DateOfBirthField
          value={formData.dateOfBirth}
          isEditing={isEditing}
          onChange={(v) => onChangeField('dateOfBirth', v)}
          styles={styles}
        />
      </View>

      {/* Address Information */}
      <View style={[styles.section, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
        <Text style={styles.sectionTitle}>Address Information</Text>

        {renderField(
          'Address',
          formData.address,
          'address',
          'Enter your address',
          isEditing,
          onChangeField,
        )}
        {renderField('City', formData.city, 'city', 'Enter your city', isEditing, onChangeField)}
        {renderField(
          'State',
          formData.state,
          'state',
          'Enter your state',
          isEditing,
          onChangeField,
        )}
        {renderField(
          'ZIP Code',
          formData.zipCode,
          'zipCode',
          'Enter your ZIP code',
          isEditing,
          onChangeField,
          'numeric',
        )}
      </View>
    </>
  );
};
