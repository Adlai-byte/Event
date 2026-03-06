import React, { useState, useEffect, useMemo } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { getApiBaseUrl } from '../services/api';
import { useBreakpoints } from '../hooks/useBreakpoints';
import { colors, semantic } from '../theme';

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
  const [_isLoading, _setIsLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const toastOpacity = React.useRef(new Animated.Value(0)).current;

  const { isMobile, screenWidth } = useBreakpoints();
  const styles = useMemo(() => createStyles(isMobile, screenWidth), [isMobile, screenWidth]);

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
        },
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
      if (__DEV__) console.error('Error submitting rating:', error);
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
          <Feather
            name="star"
            size={screenWidth < 360 ? 28 : isMobile ? 36 : 44}
            color={isFilled ? colors.warning[500] : semantic.border}
          />
        </TouchableOpacity>,
      );
    }
    return stars;
  };

  return (
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
              <Feather
                name="check-circle"
                size={24}
                color={semantic.surface}
                style={{ marginRight: 12 }}
              />
              <Text style={styles.successToastText}>Successfully Submitted</Text>
            </View>
          </Animated.View>
        )}

        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rate Service</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={18} color={semantic.textSecondary} />
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
              style={[
                styles.button,
                styles.submitButton,
                rating === 0 && styles.submitButtonDisabled,
              ]}
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

const createStyles = (isMobile: boolean, screenWidth: number) => {
  const isExtraSmall = screenWidth < 360;
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isMobile ? 16 : 20,
    },
    modalContent: {
      backgroundColor: semantic.surface,
      borderRadius: 16,
      width: '100%',
      maxWidth: isMobile ? screenWidth - 32 : 500,
      maxHeight: '90%',
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)' }
        : {
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
      padding: isMobile ? 16 : 20,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    modalTitle: {
      fontSize: isExtraSmall ? 16 : isMobile ? 18 : 20,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: semantic.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButtonText: {
      fontSize: 18,
      color: semantic.textSecondary,
      fontWeight: '600',
    },
    serviceInfo: {
      padding: isMobile ? 16 : 20,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    serviceName: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: semantic.textSecondary,
    },
    ratingSection: {
      padding: isMobile ? 16 : 20,
      alignItems: 'center',
    },
    ratingLabel: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: semantic.textSecondary,
      marginBottom: 16,
    },
    starsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 12,
    },
    starButton: {
      padding: isExtraSmall ? 4 : 6,
    },
    star: {
      fontSize: 48,
      color: semantic.border,
      lineHeight: 48,
    },
    starFilled: {
      color: colors.warning[500],
    },
    ratingText: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: semantic.textSecondary,
      marginTop: 8,
    },
    commentSection: {
      padding: isMobile ? 16 : 20,
      paddingTop: 0,
    },
    commentLabel: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: semantic.textSecondary,
      marginBottom: 12,
    },
    commentInput: {
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      padding: isMobile ? 10 : 12,
      fontSize: isMobile ? 13 : 14,
      color: semantic.textPrimary,
      textAlignVertical: 'top',
      minHeight: isMobile ? 80 : 100,
      backgroundColor: semantic.background,
    },
    characterCount: {
      fontSize: 12,
      color: semantic.textMuted,
      textAlign: 'right',
      marginTop: 4,
    },
    modalActions: {
      flexDirection: 'row',
      padding: isMobile ? 16 : 20,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
      gap: 12,
    },
    button: {
      flex: 1,
      padding: isMobile ? 12 : 14,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: semantic.background,
    },
    cancelButtonText: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: semantic.textSecondary,
    },
    submitButton: {
      backgroundColor: semantic.primary,
    },
    submitButtonDisabled: {
      backgroundColor: semantic.border,
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: semantic.surface,
    },
    successToast: {
      position: 'absolute',
      top: Platform.OS === 'web' ? 40 : 60,
      left: 20,
      right: 20,
      zIndex: 1000,
      alignItems: 'center',
      ...(Platform.OS === 'web' ? { pointerEvents: 'none' } : {}),
    },
    successToastContent: {
      backgroundColor: semantic.success,
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
      color: semantic.surface,
      fontWeight: 'bold',
      marginRight: 12,
    },
    successToastText: {
      fontSize: 16,
      fontWeight: '600',
      color: semantic.surface,
    },
  });
};
