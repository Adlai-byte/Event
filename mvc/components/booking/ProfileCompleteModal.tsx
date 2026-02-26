import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createStyles } from '../BookingModal.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

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
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.profileModalOverlay}>
        <View style={styles.profileModalContent}>
          {/* Icon */}
          <View style={styles.profileModalIconContainer}>
            <Feather name="edit" size={32} color="#6C63FF" />
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
                <Feather name="alert-triangle" size={16} color="#f59e0b" />
                <Text style={styles.profileModalFieldText}>{field}</Text>
              </View>
            ))}
          </View>

          {/* Note */}
          <View style={styles.profileModalNoteContainer}>
            <Feather name="info" size={16} color="#3b82f6" />
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
