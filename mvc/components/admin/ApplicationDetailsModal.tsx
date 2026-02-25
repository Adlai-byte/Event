import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Image, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { getApiBaseUrl } from '../../services/api';
import { styles } from '../../views/admin/ProviderApplicationsView.styles';

interface ProviderApplication {
  id: number;
  name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  role: string;
  businessDocument?: string | null;
  validIdDocument?: string | null;
}

interface ResponsiveStyles {
  modalTitle: any;
  modalBody: any;
  approveModalDescription: any;
  approveConfirmButton: any;
  approveConfirmButtonText: any;
  rejectModalDescription: any;
  rejectModalLabel: any;
  rejectReasonInputFontSize: any;
  rejectModalNote: any;
  rejectConfirmButton: any;
  rejectConfirmButtonText: any;
  cancelButton: any;
  cancelButtonText: any;
}

interface ApplicationDetailsModalProps {
  /** The application selected for document viewing */
  selectedApplication: ProviderApplication | null;
  /** Whether the document modal is visible */
  showDocumentModal: boolean;
  /** Close the document modal */
  onCloseDocumentModal: () => void;
  /** Whether the approve confirmation modal is visible */
  showApproveModal: boolean;
  /** Close the approve modal */
  onCloseApproveModal: () => void;
  /** Confirm approve action */
  onConfirmApprove: () => void;
  /** Whether the reject modal is visible */
  showRejectModal: boolean;
  /** Close the reject modal */
  onCloseRejectModal: () => void;
  /** Confirm reject action */
  onConfirmReject: () => void;
  /** Current rejection reason text */
  rejectionReason: string;
  /** Update rejection reason text */
  onRejectionReasonChange: (text: string) => void;
  /** ID of the application currently being processed (for loading state) */
  processingId: number | null;
  /** Whether the device is mobile */
  isMobile: boolean;
  /** Responsive styles from getResponsiveStyles() */
  responsiveStyles: ResponsiveStyles;
}

export const ApplicationDetailsModal: React.FC<ApplicationDetailsModalProps> = ({
  selectedApplication,
  showDocumentModal,
  onCloseDocumentModal,
  showApproveModal,
  onCloseApproveModal,
  onConfirmApprove,
  showRejectModal,
  onCloseRejectModal,
  onConfirmReject,
  rejectionReason,
  onRejectionReasonChange,
  processingId,
  isMobile,
  responsiveStyles,
}) => {
  return (
    <>
      {/* Document View Modal */}
      <Modal
        visible={showDocumentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={onCloseDocumentModal}
      >
        <View style={styles.documentModalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={responsiveStyles.modalTitle}>
                Documents - {selectedApplication?.name}
              </Text>
              <TouchableOpacity
                onPress={onCloseDocumentModal}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={responsiveStyles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Business Document */}
              {selectedApplication?.businessDocument && (
                <View style={styles.documentSection}>
                  <Text style={styles.documentLabel}>Business/Company Documents</Text>
                  <Image
                    source={{ uri: `${getApiBaseUrl()}${selectedApplication.businessDocument}` }}
                    style={styles.documentImage}
                    resizeMode="contain"
                  />
                </View>
              )}

              {/* Valid ID Document */}
              {selectedApplication?.validIdDocument && (
                <View style={styles.documentSection}>
                  <Text style={styles.documentLabel}>Valid ID</Text>
                  <Image
                    source={{ uri: `${getApiBaseUrl()}${selectedApplication.validIdDocument}` }}
                    style={styles.documentImage}
                    resizeMode="contain"
                  />
                </View>
              )}

              {!selectedApplication?.businessDocument && !selectedApplication?.validIdDocument && (
                <Text style={styles.noDocumentsText}>No documents available</Text>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={onCloseDocumentModal}
              >
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Approve Confirmation Modal */}
      <Modal
        visible={showApproveModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          if (!processingId) {
            onCloseApproveModal();
          }
        }}
      >
        <View style={styles.documentModalOverlay}>
          <View style={styles.approveModalContent}>
            <View style={styles.modalHeader}>
              <Text style={responsiveStyles.modalTitle}>Approve Provider Application</Text>
              <TouchableOpacity
                onPress={() => {
                  if (!processingId) {
                    onCloseApproveModal();
                  }
                }}
                style={styles.closeButton}
                disabled={!!processingId}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.approveModalBody}>
              <Text style={responsiveStyles.approveModalDescription}>
                Are you sure you want to approve this provider application? This will grant provider access to the user.
              </Text>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[responsiveStyles.cancelButton, processingId && styles.buttonDisabled]}
                onPress={() => {
                  if (!processingId) {
                    onCloseApproveModal();
                  }
                }}
                disabled={!!processingId}
              >
                <Text style={responsiveStyles.cancelButtonText} allowFontScaling={true} numberOfLines={1}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[responsiveStyles.approveConfirmButton, processingId && styles.submitButtonDisabled]}
                onPress={onConfirmApprove}
                disabled={!!processingId}
                activeOpacity={0.7}
              >
                {processingId ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={responsiveStyles.approveConfirmButtonText} allowFontScaling={true} numberOfLines={1}>Approve</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Application Modal */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!processingId) {
            onCloseRejectModal();
          }
        }}
      >
        <View style={styles.documentModalOverlay}>
          <View style={styles.rejectModalContent}>
            <View style={styles.modalHeader}>
              <Text style={responsiveStyles.modalTitle}>Reject Provider Application</Text>
              <TouchableOpacity
                onPress={() => {
                  if (!processingId) {
                    onCloseRejectModal();
                  }
                }}
                style={styles.closeButton}
                disabled={!!processingId}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rejectModalBody}>
              <Text style={responsiveStyles.rejectModalDescription}>
                Please provide a reason for rejecting this provider application. This reason will be sent to the user as a notification.
              </Text>

              <Text style={responsiveStyles.rejectModalLabel}>Rejection Reason *</Text>
              <TextInput
                style={[styles.rejectReasonInput, responsiveStyles.rejectReasonInputFontSize]}
                placeholder="Enter the reason for rejection..."
                placeholderTextColor={isMobile ? "#64748B" : "#A4B0BE"}
                multiline
                numberOfLines={6}
                value={rejectionReason}
                onChangeText={onRejectionReasonChange}
                editable={!processingId}
                textAlignVertical="top"
              />
              <Text style={responsiveStyles.rejectModalNote}>
                This message will be visible to the user in their notifications.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[responsiveStyles.cancelButton, processingId && styles.buttonDisabled]}
                onPress={() => {
                  if (!processingId) {
                    onCloseRejectModal();
                  }
                }}
                disabled={!!processingId}
              >
                <Text style={responsiveStyles.cancelButtonText} allowFontScaling={true} numberOfLines={1}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  responsiveStyles.rejectConfirmButton,
                  (!rejectionReason.trim() || processingId) && styles.submitButtonDisabled
                ]}
                onPress={onConfirmReject}
                disabled={!rejectionReason.trim() || !!processingId}
                activeOpacity={0.7}
              >
                {processingId ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={responsiveStyles.rejectConfirmButtonText} allowFontScaling={true} numberOfLines={1}>Confirm Rejection</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ApplicationDetailsModal;
