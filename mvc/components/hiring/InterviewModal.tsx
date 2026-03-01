import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { JobApplication } from '../../types/hiring';
import { createStyles } from '../../views/provider/HiringView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

interface InterviewModalProps {
  visible: boolean;
  selectedApplication: JobApplication | null;
  interviewDate: string;
  setInterviewDate: (value: string) => void;
  interviewTime: string;
  setInterviewTime: (value: string) => void;
  interviewDescription: string;
  setInterviewDescription: (value: string) => void;
  showDatePicker: boolean;
  setShowDatePicker: (value: boolean) => void;
  showTimePicker: boolean;
  setShowTimePicker: (value: boolean) => void;
  errorMessage: string | null;
  setErrorMessage: (value: string | null) => void;
  showErrorTooltip: boolean;
  setShowErrorTooltip: (value: boolean) => void;
  successMessage: string | null;
  setSuccessMessage: (value: string | null) => void;
  showSuccessTooltip: boolean;
  setShowSuccessTooltip: (value: boolean) => void;
  formatDate: (dateString: string) => string;
  onSubmit: () => void;
  onClose: () => void;
}

export const InterviewModal: React.FC<InterviewModalProps> = ({
  visible,
  selectedApplication,
  interviewDate,
  setInterviewDate,
  interviewTime,
  setInterviewTime,
  interviewDescription,
  setInterviewDescription,
  showDatePicker,
  setShowDatePicker,
  showTimePicker,
  setShowTimePicker,
  errorMessage,
  setErrorMessage,
  showErrorTooltip,
  setShowErrorTooltip,
  successMessage,
  setSuccessMessage,
  showSuccessTooltip,
  setShowSuccessTooltip,
  formatDate,
  onSubmit,
  onClose,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);

  return (
    <>
      {/* Schedule Interview Modal */}
      <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedApplication?.interviewDate ? 'Reschedule Interview' : 'Schedule Interview'}
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedApplication && (
              <View style={styles.modernJobInfoContainer}>
                <View style={styles.modernJobInfoHeader}>
                  <View style={styles.modernJobInfoIconContainer}>
                    <Feather name="briefcase" size={16} color="#2563EB" />
                  </View>
                  <View style={styles.modernJobInfoContent}>
                    <Text style={styles.modernJobInfoTitle}>{selectedApplication.jobTitle}</Text>
                    <Text style={styles.modernJobInfoDescription}>
                      Applicant:{' '}
                      {selectedApplication.applicantFirstName &&
                      selectedApplication.applicantLastName
                        ? `${selectedApplication.applicantFirstName} ${selectedApplication.applicantLastName}`
                        : selectedApplication.applicantEmail}
                    </Text>
                  </View>
                </View>
                {selectedApplication.interviewDate && selectedApplication.interviewTime && (
                  <View style={styles.modernCurrentInterviewContainer}>
                    <Text style={styles.modernCurrentInterviewLabel}>Current Interview</Text>
                    <Text style={styles.modernCurrentInterviewText}>
                      {formatDate(selectedApplication.interviewDate)} at{' '}
                      {selectedApplication.interviewTime}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <ScrollView style={styles.modalBody}>
              <View style={styles.modernFormGroup}>
                <Text style={styles.modernLabel}>
                  <Text style={styles.modernLabelText}>Interview Date</Text>
                  <Text style={styles.modernLabelRequired}> *</Text>
                </Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.modernWebInputContainer}>
                    <View style={styles.modernWebInputIconWrapper}>
                      <View style={styles.modernPickerIconContainer}>
                        <Feather name="calendar" size={16} color="#2563EB" />
                      </View>
                      <input
                        type="date"
                        value={interviewDate}
                        onChange={(e: any) => setInterviewDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        style={{
                          flex: 1,
                          padding: '14px 16px',
                          fontSize: '16px',
                          border: '2px solid #E2E8F0',
                          borderRadius: '12px',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          fontFamily: 'inherit',
                          backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)',
                        }}
                        onFocus={(e: any) => {
                          e.target.style.borderColor = '#8B5CF6';
                          e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                          e.target.style.backgroundImage =
                            'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)';
                        }}
                        onBlur={(e: any) => {
                          e.target.style.borderColor = '#E2E8F0';
                          e.target.style.boxShadow = 'none';
                          e.target.style.backgroundImage =
                            'linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)';
                        }}
                      />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.modernPickerButton}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modernPickerButtonLeft}>
                      <View style={styles.modernPickerIconContainer}>
                        <Feather name="calendar" size={16} color="#2563EB" />
                      </View>
                      <Text
                        style={
                          interviewDate
                            ? styles.modernPickerButtonText
                            : styles.modernPickerButtonPlaceholder
                        }
                      >
                        {interviewDate
                          ? (() => {
                              const date = new Date(interviewDate);
                              return date.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              });
                            })()
                          : 'Select Date'}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.modernFormGroup}>
                <Text style={styles.modernLabel}>
                  <Text style={styles.modernLabelText}>Interview Time</Text>
                  <Text style={styles.modernLabelRequired}> *</Text>
                </Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.modernWebInputContainer}>
                    <View style={styles.modernWebInputIconWrapper}>
                      <View style={styles.modernPickerIconContainer}>
                        <Feather name="clock" size={16} color="#2563EB" />
                      </View>
                      <input
                        type="time"
                        value={interviewTime}
                        onChange={(e: any) => setInterviewTime(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '14px 16px',
                          fontSize: '16px',
                          border: '2px solid #E2E8F0',
                          borderRadius: '12px',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          fontFamily: 'inherit',
                          backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)',
                        }}
                        onFocus={(e: any) => {
                          e.target.style.borderColor = '#8B5CF6';
                          e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                          e.target.style.backgroundImage =
                            'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)';
                        }}
                        onBlur={(e: any) => {
                          e.target.style.borderColor = '#E2E8F0';
                          e.target.style.boxShadow = 'none';
                          e.target.style.backgroundImage =
                            'linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)';
                        }}
                      />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.modernPickerButton}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modernPickerButtonLeft}>
                      <View style={styles.modernPickerIconContainer}>
                        <Feather name="clock" size={16} color="#2563EB" />
                      </View>
                      <Text
                        style={
                          interviewTime
                            ? styles.modernPickerButtonText
                            : styles.modernPickerButtonPlaceholder
                        }
                      >
                        {interviewTime
                          ? (() => {
                              const [hours, minutes] = interviewTime.split(':');
                              const hour = parseInt(hours);
                              const ampm = hour >= 12 ? 'PM' : 'AM';
                              const displayHour = hour % 12 || 12;
                              return `${displayHour}:${minutes} ${ampm}`;
                            })()
                          : 'Select Time'}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.modernFormGroup}>
                <Text style={styles.modernLabel}>
                  <Text style={styles.modernLabelText}>Description / Instructions</Text>
                  <Text style={styles.modernLabelRequired}> *</Text>
                </Text>
                {Platform.OS === 'web' ? (
                  <textarea
                    value={interviewDescription}
                    onChange={(e: any) => setInterviewDescription(e.target.value)}
                    placeholder="Enter what the applicant needs to do or prepare for the interview..."
                    style={
                      {
                        width: '100%',
                        minHeight: 120,
                        padding: '16px',
                        borderWidth: '2px',
                        borderStyle: 'solid',
                        borderColor: '#E2E8F0',
                        borderRadius: '12px',
                        fontSize: '16px',
                        color: '#1E293B',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      } as any
                    }
                    onFocus={(e: any) => {
                      e.target.style.borderColor = '#8B5CF6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                    }}
                    onBlur={(e: any) => {
                      e.target.style.borderColor = '#E2E8F0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                ) : (
                  <TextInput
                    style={[styles.modernInput, styles.modernTextArea]}
                    placeholder="Enter what the applicant needs to do or prepare for the interview..."
                    value={interviewDescription}
                    onChangeText={setInterviewDescription}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    placeholderTextColor="#94A3B8"
                  />
                )}
                <Text style={styles.modernHelperText}>
                  Describe what the applicant should prepare or what will happen during the
                  interview
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modernModalFooter}>
              <TouchableOpacity
                style={styles.modernCancelButton}
                onPress={() => {
                  onClose();
                  setErrorMessage(null);
                  setShowErrorTooltip(false);
                  setSuccessMessage(null);
                  setShowSuccessTooltip(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modernCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modernSubmitButton}
                onPress={onSubmit}
                activeOpacity={0.8}
              >
                <Text style={styles.modernSubmitButtonText}>
                  {selectedApplication?.interviewDate
                    ? 'Reschedule Interview'
                    : 'Schedule Interview'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {/* Success Tooltip (Web) */}
        {Platform.OS === 'web' && showSuccessTooltip && successMessage && (
          <View style={styles.successTooltip}>
            <View style={styles.successTooltipContent}>
              <Feather name="check-circle" size={16} color="#10b981" />
              <Text style={styles.successTooltipText}>{successMessage}</Text>
              <TouchableOpacity
                style={styles.successTooltipClose}
                onPress={() => {
                  setShowSuccessTooltip(false);
                  setSuccessMessage(null);
                }}
              >
                <Feather name="x" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Error Tooltip (Web) */}
        {Platform.OS === 'web' && showErrorTooltip && errorMessage && (
          <View style={styles.errorTooltip}>
            <View style={styles.errorTooltipContent}>
              <Feather name="alert-triangle" size={16} color="#f59e0b" />
              <Text style={styles.errorTooltipText}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.errorTooltipClose}
                onPress={() => {
                  setShowErrorTooltip(false);
                  setErrorMessage(null);
                }}
              >
                <Feather name="x" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* Date Picker Modal (Mobile) */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>Select Date</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={styles.pickerModalCloseButton}
                >
                  <Feather name="x" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerModalBody}>
                {(() => {
                  const dates: string[] = [];
                  const today = new Date();
                  for (let i = 0; i < 90; i++) {
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
                    const isSelected = interviewDate === date;
                    return (
                      <TouchableOpacity
                        key={date}
                        style={[
                          styles.pickerModalItem,
                          isSelected && styles.pickerModalItemSelected,
                        ]}
                        onPress={() => {
                          setInterviewDate(date);
                          setShowDatePicker(false);
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

      {/* Time Picker Modal (Mobile) */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={showTimePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>Select Time</Text>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(false)}
                  style={styles.pickerModalCloseButton}
                >
                  <Feather name="x" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerModalBody}>
                {(() => {
                  const times: string[] = [];
                  for (let hour = 8; hour < 20; hour++) {
                    for (let minute = 0; minute < 60; minute += 30) {
                      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                      times.push(timeStr);
                    }
                  }
                  return times.map((time) => {
                    const [hours, minutes] = time.split(':');
                    const hour = parseInt(hours);
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    const displayHour = hour % 12 || 12;
                    const displayTime = `${displayHour}:${minutes} ${ampm}`;
                    const isSelected = interviewTime === time;
                    return (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.pickerModalItem,
                          isSelected && styles.pickerModalItemSelected,
                        ]}
                        onPress={() => {
                          setInterviewTime(time);
                          setShowTimePicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerModalItemText,
                            isSelected && styles.pickerModalItemTextSelected,
                          ]}
                        >
                          {displayTime}
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
