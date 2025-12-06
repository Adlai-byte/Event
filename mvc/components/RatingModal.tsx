import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { getApiBaseUrl } from '../services/api';

interface RatingModalProps {
  visible: boolean;
  serviceName: string;
  serviceId: number;
  bookingId: string;
  userEmail?: string;
  onClose: () => void;
  onSuccess: () => void;
  existingRating?: {
    rating: number;
    comment: string | null;
  } | null;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  serviceName,
  serviceId,
  bookingId,
  userEmail,
  onClose,
  onSuccess,
  existingRating,
}) => {
  const [rating, setRating] = useState<number>(existingRating?.rating || 0);
  const [comment, setComment] = useState<string>(existingRating?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const toastOpacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && existingRating) {
      setRating(existingRating.rating);
      setComment(existingRating.comment || '');
    } else if (visible && !existingRating) {
      setRating(0);
      setComment('');
    }
    // Reset toast when modal opens/closes
    if (!visible) {
      setShowSuccessToast(false);
      toastOpacity.setValue(0);
    }
  }, [visible, existingRating]);

  const handleStarPress = (starValue: number) => {
    setRating(starValue);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    if (!userEmail) {
      Alert.alert('Error', 'User email is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/bookings/${bookingId}/services/${serviceId}/rate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userEmail,
            rating,
            comment: comment.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (data.ok) {
        // Show success toast
        setShowSuccessToast(true);
        Animated.sequence([
          Animated.timing(toastOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(1500),
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowSuccessToast(false);
          onSuccess();
          onClose();
        });
      } else {
        Alert.alert('Error', data.error || 'Failed to submit rating. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= rating;
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleStarPress(i)}
          style={styles.starButton}
          activeOpacity={0.6}
        >
          <Text style={[styles.star, isFilled && styles.starFilled]}>
            {isFilled ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
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
              <Text style={styles.successToastIcon}>✓</Text>
              <Text style={styles.successToastText}>Successfully Submitted</Text>
            </View>
          </Animated.View>
        )}

        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rate Service</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{serviceName}</Text>
          </View>

          <View style={styles.ratingSection}>
            <Text style={styles.ratingLabel}>Your Rating:</Text>
            <View style={styles.starsContainer}>{renderStars()}</View>
            {rating > 0 && (
              <Text style={styles.ratingText}>
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </Text>
            )}
          </View>

          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>Your Review (Optional):</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your experience with this service..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
              maxLength={500}
            />
            <Text style={styles.characterCount}>{comment.length}/500</Text>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {existingRating ? 'Update Rating' : 'Submit Rating'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
  },
  serviceInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  ratingSection: {
    padding: 20,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 8,
  },
  star: {
    fontSize: 48,
    color: '#D1D5DB',
    lineHeight: 48,
  },
  starFilled: {
    color: '#FBBF24',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  commentSection: {
    padding: 20,
    paddingTop: 0,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 100,
    backgroundColor: '#F9FAFB',
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#6C63FF',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  successToast: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 40 : 60,
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      pointerEvents: 'none',
    } : {}),
  },
  successToastContent: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  successToastIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 12,
  },
  successToastText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

