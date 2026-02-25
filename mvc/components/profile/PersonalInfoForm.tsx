import React from 'react';
import {
  View,
  Text,
  TextInput,
} from 'react-native';
import { styles } from '../../views/user/PersonalInfoView.styles';

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

const renderField = (
  label: string,
  value: string,
  key: keyof PersonalInfoFormData,
  placeholder: string,
  isEditing: boolean,
  onChangeField: (key: keyof PersonalInfoFormData, value: string) => void,
  keyboardType: 'default' | 'email-address' | 'phone-pad' | 'numeric' = 'default'
) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.fieldInput}
      value={value}
      onChangeText={(text) => onChangeField(key, text)}
      placeholder={placeholder}
      keyboardType={keyboardType}
      editable={isEditing}
      placeholderTextColor="#A4B0BE"
    />
  </View>
);

export const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({
  formData,
  isEditing,
  onChangeField,
}) => {
  return (
    <>
      {/* Personal Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Details</Text>

        {renderField('First Name', formData.firstName, 'firstName', 'Enter your first name', isEditing, onChangeField)}
        {renderField('Middle Name (Optional)', formData.middleName, 'middleName', 'Enter your middle name (optional)', isEditing, onChangeField)}
        {renderField('Last Name', formData.lastName, 'lastName', 'Enter your last name', isEditing, onChangeField)}
        {renderField('Suffix (Optional)', formData.suffix, 'suffix', 'Enter suffix (e.g., Jr., Sr., III) - optional', isEditing, onChangeField)}
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
        {renderField('Phone', formData.phone, 'phone', 'Enter your phone number', isEditing, onChangeField, 'phone-pad')}
        {renderField('Date of Birth', formData.dateOfBirth, 'dateOfBirth', 'MM/DD/YYYY', isEditing, onChangeField)}
      </View>

      {/* Address Information */}
      <View style={[styles.section, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
        <Text style={styles.sectionTitle}>Address Information</Text>

        {renderField('Address', formData.address, 'address', 'Enter your address', isEditing, onChangeField)}
        {renderField('City', formData.city, 'city', 'Enter your city', isEditing, onChangeField)}
        {renderField('State', formData.state, 'state', 'Enter your state', isEditing, onChangeField)}
        {renderField('ZIP Code', formData.zipCode, 'zipCode', 'Enter your ZIP code', isEditing, onChangeField, 'numeric')}
      </View>
    </>
  );
};
