import React from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput } from 'react-native';
import { styles } from '../../views/user/BookingView.styles';
import type { Booking } from './types';

export interface CancelBookingModalProps {
  visible: boolean;
  bookingToCancel: Booking | null;
  cancelReason: string;
  onCancelReasonChange: (text: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  visible,
  bookingToCancel,
  cancelReason,
  onCancelReasonChange,
  onConfirm,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.cancelModalOverlay}>
        <View style={styles.cancelModalContent}>
          <View style={styles.cancelModalHeader}>
            <Text style={styles.cancelModalTitle}>Cancel Booking</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelModalCloseButton}
            >
              <Text style={styles.cancelModalCloseIcon}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.cancelModalBody}>
            <Text style={styles.cancelModalMessage}>
              Are you sure you want to cancel "{bookingToCancel?.title}"?
            </Text>
            <Text style={styles.cancelModalSubMessage}>
              (Optional) Please provide a reason for cancellation:
            </Text>
            <TextInput
              style={styles.cancelReasonInput}
              placeholder="Enter cancellation reason (optional)..."
              placeholderTextColor="#94a3b8"
              value={cancelReason}
              onChangeText={onCancelReasonChange}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          <View style={styles.cancelModalFooter}>
            <TouchableOpacity
              style={[styles.cancelModalButton, styles.cancelModalBackButton]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelModalBackButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelModalButton, styles.cancelModalConfirmButton]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelModalConfirmButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
