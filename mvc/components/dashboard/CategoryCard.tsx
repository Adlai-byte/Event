import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createStyles } from '../../views/user/DashboardView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

interface CategoryCardProps {
  icon: string;
  label: string;
  count: number;
  categoryImage: string | null;
  onPress: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = React.memo(
  ({ icon, label, count, categoryImage, onPress }) => {
    const { isMobile, screenWidth, isMobileWeb } = useBreakpoints();
    const styles = createStyles(isMobile, screenWidth, isMobileWeb);

    return (
      <View style={styles.modernCategoryCard}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
          {/* Image with Badge */}
          <View style={styles.modernCategoryImageContainer}>
            {categoryImage &&
            (categoryImage.startsWith('http://') ||
              categoryImage.startsWith('https://') ||
              categoryImage.startsWith('data:image')) ? (
              <Image
                source={{ uri: categoryImage }}
                style={styles.modernCategoryImage as any}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.modernCategoryImagePlaceholder}>
                <Feather name={icon as any} size={32} color="#64748B" />
              </View>
            )}
            {count > 0 && (
              <View style={styles.categoryCountBadge}>
                <Text style={styles.categoryCountBadgeText}>{count}</Text>
              </View>
            )}
          </View>

          {/* Card Content */}
          <View style={styles.modernCategoryInfo}>
            <View style={styles.modernCategoryTitleRow}>
              <Text style={styles.modernCategoryTitle} numberOfLines={2}>
                {label}
              </Text>
              <View style={styles.categoryTag}>
                <Feather name={icon as any} size={12} color="#64748B" />
                <Text style={styles.categoryTagText}>{label}</Text>
              </View>
            </View>

            {/* Count Info */}
            <View style={styles.modernCategoryMeta}>
              <Text style={styles.modernCategoryCountText}>
                {count > 0 ? `${count} ${count === 1 ? 'service' : 'services'}` : 'No services yet'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Button */}
        <View style={styles.modernCategoryActions}>
          <TouchableOpacity
            style={styles.modernCategoryViewButton}
            onPress={onPress}
            activeOpacity={0.8}
          >
            <Text style={styles.modernCategoryViewButtonText}>View All</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);
