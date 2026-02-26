import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createStyles } from '../../views/provider/HiringView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

interface PostJobModalProps {
  visible: boolean;
  isEdit: boolean;
  jobTitle: string;
  setJobTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  deadlineDate: string;
  setDeadlineDate: (value: string) => void;
  jobType: 'full_time' | 'part_time';
  setJobType: (value: 'full_time' | 'part_time') => void;
  isPostingJob: boolean;
  postJobError: string | null;
  setPostJobError: (value: string | null) => void;
  showSuccessToast: boolean;
  showErrorToast: boolean;
  errorToastMessage: string;
  toastOpacity: Animated.Value;
  errorToastOpacity: Animated.Value;
  showDeadlineDatePicker: boolean;
  setShowDeadlineDatePicker: (value: boolean) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const PostJobModal: React.FC<PostJobModalProps> = ({
  visible,
  isEdit,
  jobTitle,
  setJobTitle,
  description,
  setDescription,
  deadlineDate,
  setDeadlineDate,
  jobType,
  setJobType,
  isPostingJob,
  postJobError,
  setPostJobError,
  showSuccessToast,
  showErrorToast,
  errorToastMessage,
  toastOpacity,
  errorToastOpacity,
  showDeadlineDatePicker,
  setShowDeadlineDatePicker,
  onSubmit,
  onClose,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);

  return (
    <>
      <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          {/* Success Toast Notification */}
          {showSuccessToast && (
            <Animated.View
              style={[
                styles.successToast,
                {
                  opacity: toastOpacity,
                  transform: [
                    {
                      translateY: toastOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.successToastContent}>
                <Feather name="check-circle" size={16} color="#10b981" />
                <Text style={styles.successToastText}>Successfully Added</Text>
              </View>
            </Animated.View>
          )}

          {/* Error Toast Notification */}
          {showErrorToast && (
            <Animated.View
              style={[
                styles.errorToast,
                {
                  opacity: errorToastOpacity,
                  transform: [
                    {
                      translateY: errorToastOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.errorToastContent}>
                <Feather name="alert-triangle" size={16} color="#ef4444" />
                <Text style={styles.errorToastText}>{errorToastMessage}</Text>
              </View>
            </Animated.View>
          )}

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEdit ? 'Edit Job Posting' : 'Post New Job'}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Job Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter job title"
                  value={jobTitle}
                  onChangeText={(text) => {
                    setJobTitle(text);
                    if (!isEdit) setPostJobError(null);
                  }}
                  maxLength={200}
                  editable={!isPostingJob}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter job description"
                  value={description}
                  onChangeText={(text) => {
                    setDescription(text);
                    if (!isEdit) setPostJobError(null);
                  }}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  editable={!isPostingJob}
                />
              </View>

              {!isEdit && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Job Type *</Text>
                  <View style={styles.jobTypeContainer}>
                    <TouchableOpacity
                      style={[
                        styles.jobTypeOption,
                        jobType === 'full_time' && styles.jobTypeOptionSelected,
                      ]}
                      onPress={() => {
                        setJobType('full_time');
                        setPostJobError(null);
                      }}
                      disabled={isPostingJob}
                    >
                      <View
                        style={[
                          styles.jobTypeRadio,
                          jobType === 'full_time' && styles.jobTypeRadioSelected,
                        ]}
                      >
                        {jobType === 'full_time' && <View style={styles.jobTypeRadioInner} />}
                      </View>
                      <Text
                        style={[
                          styles.jobTypeLabel,
                          jobType === 'full_time' && styles.jobTypeLabelSelected,
                        ]}
                      >
                        Full Time
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.jobTypeOption,
                        jobType === 'part_time' && styles.jobTypeOptionSelected,
                      ]}
                      onPress={() => {
                        setJobType('part_time');
                        setPostJobError(null);
                      }}
                      disabled={isPostingJob}
                    >
                      <View
                        style={[
                          styles.jobTypeRadio,
                          jobType === 'part_time' && styles.jobTypeRadioSelected,
                        ]}
                      >
                        {jobType === 'part_time' && <View style={styles.jobTypeRadioInner} />}
                      </View>
                      <Text
                        style={[
                          styles.jobTypeLabel,
                          jobType === 'part_time' && styles.jobTypeLabelSelected,
                        ]}
                      >
                        Part Time
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Deadline Date *</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.deadlineInputWrapper}>
                    {/* @ts-expect-error - HTML input for web date picker */}
                    <input
                      type="date"
                      value={deadlineDate || ''}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e: any) => {
                        setDeadlineDate(e.target.value || '');
                        if (!isEdit) setPostJobError(null);
                      }}
                      disabled={isPostingJob}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: 16,
                        border: '2px solid #E2E8F0',
                        borderRadius: 12,
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                        cursor: isPostingJob ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.deadlinePickerButton,
                      isPostingJob && styles.deadlinePickerButtonDisabled,
                    ]}
                    onPress={() => !isPostingJob && setShowDeadlineDatePicker(true)}
                    disabled={isPostingJob}
                    activeOpacity={0.7}
                  >
                    <View style={styles.deadlinePickerButtonLeft}>
                      <Feather name="calendar" size={16} color="#64748B" />
                      <Text
                        style={
                          deadlineDate
                            ? styles.deadlinePickerText
                            : styles.deadlinePickerPlaceholder
                        }
                      >
                        {deadlineDate
                          ? (() => {
                              const d = new Date(deadlineDate);
                              return d.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              });
                            })()
                          : 'Select deadline date'}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Error Message Display */}
              {postJobError && (
                <View style={styles.errorContainer}>
                  <Feather name="alert-triangle" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{postJobError}</Text>
                  <TouchableOpacity
                    onPress={() => setPostJobError(null)}
                    style={styles.errorCloseButton}
                  >
                    <Feather name="x" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={onClose}
                disabled={isPostingJob}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.submitButton,
                  isEdit
                    ? (!jobTitle.trim() || !description.trim() || !deadlineDate) &&
                      styles.submitButtonDisabled
                    : (isPostingJob ||
                        !jobTitle.trim() ||
                        !description.trim() ||
                        !deadlineDate ||
                        !jobType) &&
                      styles.submitButtonDisabled,
                ]}
                onPress={onSubmit}
                disabled={
                  isEdit
                    ? !jobTitle.trim() || !description.trim() || !deadlineDate
                    : isPostingJob ||
                      !jobTitle.trim() ||
                      !description.trim() ||
                      !deadlineDate ||
                      !jobType
                }
              >
                {isPostingJob ? (
                  <View style={styles.submitButtonContent}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitButtonText}>Posting...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>{isEdit ? 'Update Job' : 'Post Job'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Deadline Date Picker Modal (Mobile) */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={showDeadlineDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDeadlineDatePicker(false)}
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>Select Deadline Date</Text>
                <TouchableOpacity
                  onPress={() => setShowDeadlineDatePicker(false)}
                  style={styles.pickerModalCloseButton}
                >
                  <Feather name="x" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerModalBody}>
                {(() => {
                  const dates: string[] = [];
                  const today = new Date();
                  for (let i = 1; i <= 90; i++) {
                    const date = new Date(today);
                    date.setDate(today.getDate() + i);
                    dates.push(date.toISOString().split('T')[0]);
                  }
                  return dates.map((date) => {
                    const dateObj = new Date(date);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const day = dateObj.getDate();
                    const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
                    const year = dateObj.getFullYear();
                    const isSelected = deadlineDate === date;
                    return (
                      <TouchableOpacity
                        key={date}
                        style={[
                          styles.pickerModalItem,
                          isSelected && styles.pickerModalItemSelected,
                        ]}
                        onPress={() => {
                          setDeadlineDate(date);
                          setShowDeadlineDatePicker(false);
                          setPostJobError(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerModalItemText,
                            isSelected && styles.pickerModalItemTextSelected,
                          ]}
                        >
                          {dayName}, {month} {day}, {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
};
