import React from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import { getApiBaseUrl } from '../../services/api';
import { styles } from '../../views/user/ServiceDetailsView.styles';

interface ReviewsSectionProps {
  reviews: any[];
  loadingReviews: boolean;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  reviews,
  loadingReviews,
}) => {
  return (
    <View style={styles.reviewsCard}>
      <Text style={styles.cardTitle}>
        ⭐ Reviews & Feedback {reviews.length > 0 ? `(${reviews.length})` : ''}
      </Text>
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
                          : review.userProfilePicture
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
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>
                <View style={styles.reviewRating}>
                  <Text style={styles.reviewRatingText}>
                    {'⭐'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </Text>
                </View>
              </View>
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.reviewsEmpty}>
          <Text style={styles.reviewsEmptyIcon}>💬</Text>
          <Text style={styles.reviewsEmptyText}>
            No reviews yet. Be the first to review this service!
          </Text>
        </View>
      )}
    </View>
  );
};
