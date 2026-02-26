import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { JobApplication } from '../../types/hiring';
import { createStyles } from '../../views/provider/HiringView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

interface HireRejectModalsProps {
  // Hire modal
  showHireModal: boolean;
  hireNote: string;
  setHireNote: (value: string) => void;
  onSubmitHire: () => void;
  onCloseHire: () => void;
  // Reject modal
  showRejectModal: boolean;
  rejectionNote: string;
  setRejectionNote: (value: string) => void;
  onSubmitReject: () => void;
  onCloseReject: () => void;
  // Shared
  selectedApplication: JobApplication | null;
}

export const HireRejectModals: React.FC<HireRejectModalsProps> = ({
  showHireModal,
  hireNote,
  setHireNote,
  onSubmitHire,
  onCloseHire,
  showRejectModal,
  rejectionNote,
  setRejectionNote,
  onSubmitReject,
  onCloseReject,
  selectedApplication,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);

  return (
    <>
      {/* Hire Application Modal */}
      <Modal
        visible={showHireModal}
        transparent={true}
        animationType="slide"
        onRequestClose={onCloseHire}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hire Applicant</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onCloseHire}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedApplication && (
              <View style={styles.jobInfoContainer}>
                <Text style={styles.jobInfoTitle}>{selectedApplication.jobTitle}</Text>
                <Text style={styles.jobInfoDescription}>
                  Applicant:{' '}
                  {selectedApplication.applicantFirstName && selectedApplication.applicantLastName
                    ? `${selectedApplication.applicantFirstName} ${selectedApplication.applicantLastName}`
                    : selectedApplication.applicantEmail}
                </Text>
              </View>
            )}

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Hiring Note *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Please provide a note for hiring this applicant..."
                  value={hireNote}
                  onChangeText={setHireNote}
                  multiline={true}
                  numberOfLines={5}
                  maxLength={500}
                />
                <Text style={styles.helperText}>{hireNote.length}/500 characters</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={onCloseHire}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.hireButtonModal]}
                onPress={onSubmitHire}
              >
                <Text style={[styles.submitButtonText, { color: '#FFFFFF' }]}>Hire Applicant</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Application Modal */}
      <Modal
        visible={showRejectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={onCloseReject}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Application</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onCloseReject}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedApplication && (
              <View style={styles.jobInfoContainer}>
                <Text style={styles.jobInfoTitle}>{selectedApplication.jobTitle}</Text>
                <Text style={styles.jobInfoDescription}>
                  Applicant:{' '}
                  {selectedApplication.applicantFirstName && selectedApplication.applicantLastName
                    ? `${selectedApplication.applicantFirstName} ${selectedApplication.applicantLastName}`
                    : selectedApplication.applicantEmail}
                </Text>
              </View>
            )}

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Rejection Note *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Please provide a reason for rejection..."
                  value={rejectionNote}
                  onChangeText={setRejectionNote}
                  multiline={true}
                  numberOfLines={5}
                  maxLength={500}
                />
                <Text style={styles.helperText}>{rejectionNote.length}/500 characters</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={onCloseReject}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectButtonModal]}
                onPress={onSubmitReject}
              >
                <Text style={[styles.submitButtonText, { color: '#FFFFFF' }]}>
                  Reject Application
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
