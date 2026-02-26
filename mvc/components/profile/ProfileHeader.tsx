import React from 'react';
import { View, Text, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { createStyles } from '../../views/user/ProfileView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

interface ProfileHeaderProps {
  user: User;
}

const getProfileImageUri = (user: User): string | null => {
  if (!user.profilePicture) return null;
  // If it's a base64 string, return it as is
  if (user.profilePicture.startsWith('data:image')) {
    return user.profilePicture;
  }
  // If it's a URL path, prepend the API base URL
  if (user.profilePicture.startsWith('/uploads/')) {
    return `${getApiBaseUrl()}${user.profilePicture}`;
  }
  // If it's already a full URL or local file URI, return as is
  return user.profilePicture;
};

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
  const { isMobile, screenWidth, screenHeight } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth, screenHeight);
  const imageUri = getProfileImageUri(user);

  return (
    <View style={styles.modernProfileSection}>
      <View style={styles.modernAvatarContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.modernAvatarImage} resizeMode="cover" />
        ) : (
          <View style={styles.modernAvatarPlaceholder}>
            <Text style={styles.modernAvatarText}>{user.getInitials()}</Text>
          </View>
        )}
        {user.emailVerified && (
          <View style={styles.modernVerifiedBadge}>
            <Feather name="check-circle" size={14} color="#10b981" />
          </View>
        )}
      </View>
      <View style={styles.modernUserInfo}>
        <Text style={styles.modernUserName}>{user.getFullName()}</Text>
        <View style={styles.modernUserEmailContainer}>
          <Feather name="mail" size={14} color="#64748B" />
          <Text style={styles.modernUserEmail}>{user.email}</Text>
        </View>
      </View>
    </View>
  );
};
