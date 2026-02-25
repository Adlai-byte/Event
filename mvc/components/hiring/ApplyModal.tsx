import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { styles } from '../../views/user/HiringView.styles';

interface ApplyModalProps {
  visible: boolean;
  selectedJobPosting: any;
  resumeFile: any;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onPickResume: () => void;
  onRemoveFile: () => void;
  onSubmit: () => void;
  onClearError: () => void;
}

export const ApplyModal: React.FC<ApplyModalProps> = ({
  visible,
  selectedJobPosting,
  resumeFile,
  isSubmitting,
  errorMessage,
  onClose,
  onPickResume,
  onRemoveFile,
  onSubmit,
  onClearError,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Apply to Job</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          {selectedJobPosting && (
            <View style={styles.jobInfoContainer}>
              <Text style={styles.jobInfoTitle}>{selectedJobPosting.jobTitle}</Text>
              <Text style={styles.jobInfoDescription}>{selectedJobPosting.description}</Text>
              <Text style={styles.jobInfoDeadline}>
                Deadline: {new Date(selectedJobPosting.deadlineDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </Text>
            </View>
          )}

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Resume (PDF File) *</Text>
              <Text style={styles.helperText}>Please upload your resume in PDF format</Text>
              <TouchableOpacity
                style={styles.filePickerButton}
                onPress={onPickResume}
                disabled={isSubmitting}
              >
                <Text style={styles.filePickerButtonText}>
                  {resumeFile ? `\uD83D\uDCC4 ${resumeFile.name}` : '\uD83D\uDCCE Select PDF Resume'}
                </Text>
              </TouchableOpacity>
              {resumeFile && (
                <TouchableOpacity
                  style={styles.removeFileButton}
                  onPress={onRemoveFile}
                >
                  <Text style={styles.removeFileButtonText}>Remove File</Text>
                </TouchableOpacity>
              )}
            </View>

            {errorMessage && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>{'\u26A0\uFE0F'}</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>
                <TouchableOpacity
                  onPress={onClearError}
                  style={styles.errorCloseButton}
                >
                  <Text style={styles.errorCloseText}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={onSubmit}
              disabled={isSubmitting || !resumeFile}
            >
              {isSubmitting ? (
                <View style={styles.submitButtonContent}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Submitting...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Submit Application</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
