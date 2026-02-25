import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { styles } from '../BookingModal.styles';

export interface ProfileCompleteModalProps {
  visible: boolean;
  missingFields: string[];
  onCancel: () => void;
  onGoToProfile: () => void;
}

export const ProfileCompleteModal: React.FC<ProfileCompleteModalProps> = ({
  visible,
  missingFields,
  onCancel,
  onGoToProfile,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.profileModalOverlay}>
        <View style={styles.profileModalContent}>
          {/* Icon */}
          <View style={styles.profileModalIconContainer}>
            <Text style={styles.profileModalIcon}>📝</Text>
          </View>

          {/* Title */}
          <Text style={styles.profileModalTitle}>Complete Your Profile</Text>

          {/* Message */}
          <Text style={styles.profileModalMessage}>
            Please complete your profile information before making a booking.
          </Text>

          {/* Missing Fields List */}
          <View style={styles.profileModalFieldsContainer}>
            {missingFields.map((field, index) => (
              <View key={index} style={styles.profileModalFieldItem}>
                <Text style={styles.profileModalFieldIcon}>⚠️</Text>
                <Text style={styles.profileModalFieldText}>{field}</Text>
              </View>
            ))}
          </View>

          {/* Note */}
          <View style={styles.profileModalNoteContainer}>
            <Text style={styles.profileModalNoteIcon}>ℹ️</Text>
            <Text style={styles.profileModalNoteText}>
              You will be redirected to your profile page to complete this information.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.profileModalActions}>
            <TouchableOpacity
              style={styles.profileModalCancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.profileModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileModalConfirmButton}
              onPress={onGoToProfile}
              activeOpacity={0.8}
            >
              <Text style={styles.profileModalConfirmText}>Go to Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
