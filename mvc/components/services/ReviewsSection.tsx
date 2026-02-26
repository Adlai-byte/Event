import React from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getApiBaseUrl } from '../../services/api';
import { createStyles } from '../../views/user/ServiceDetailsView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

interface ReviewsSectionProps {
  reviews: any[];
  loadingReviews: boolean;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ reviews, loadingReviews }) => {
  const { isMobile, screenWidth, screenHeight } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth, screenHeight);

  return (
    <View style={styles.reviewsCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Feather name="star" size={16} color="#f59e0b" />
        <Text style={styles.cardTitle}>
          Reviews & Feedback {reviews.length > 0 ? `(${reviews.length})` : ''}
        </Text>
      </View>
      {loadingReviews ? (
        <View style={styles.reviewsLoading}>
          <ActivityIndicator size="small" color="#4a55e1" />
          <Text style={styles.reviewsLoadingText}>Loading reviews...</Text>
        </View>
      ) : reviews.length > 0 ? (
        <View style={styles.reviewsList}>
          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewUserInfo}>
                  {review.userProfilePicture ? (
                    <Image
                      source={{
                        uri: review.userProfilePicture.startsWith('/uploads/')
                          ? `${getApiBaseUrl()}${review.userProfilePicture}`
                          : review.userProfilePicture,
                      }}
                      style={styles.reviewAvatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.reviewAvatarPlaceholder}>
                      <Text style={styles.reviewAvatarText}>
                        {review.userName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.reviewUserDetails}>
                    <Text style={styles.reviewUserName}>{review.userName}</Text>
                    <Text style={styles.reviewDate}>
                      {new Date(review.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
                <View style={[styles.reviewRating, { flexDirection: 'row', alignItems: 'center' }]}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Feather
                      key={i}
                      name="star"
                      size={14}
                      color={i < review.rating ? '#f59e0b' : '#d1d5db'}
                    />
                  ))}
                </View>
              </View>
              {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.reviewsEmpty}>
          <Feather name="message-circle" size={32} color="#94a3b8" />
          <Text style={styles.reviewsEmptyText}>
            No reviews yet. Be the first to review this service!
          </Text>
        </View>
      )}
    </View>
  );
};
