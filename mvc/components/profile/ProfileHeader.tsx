import React from 'react';
import { View, Text, Image } from 'react-native';
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { styles } from '../../views/user/ProfileView.styles';

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
  const imageUri = getProfileImageUri(user);

  return (
    <View style={styles.modernProfileSection}>
      <View style={styles.modernAvatarContainer}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.modernAvatarImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.modernAvatarPlaceholder}>
            <Text style={styles.modernAvatarText}>{user.getInitials()}</Text>
          </View>
        )}
        {user.emailVerified && (
          <View style={styles.modernVerifiedBadge}>
            <Text style={styles.modernVerifiedIcon}>{'\u2713'}</Text>
          </View>
        )}
      </View>
      <View style={styles.modernUserInfo}>
        <Text style={styles.modernUserName}>{user.getFullName()}</Text>
        <View style={styles.modernUserEmailContainer}>
          <Text style={styles.modernUserEmailIcon}>{'\u{1F4E7}'}</Text>
          <Text style={styles.modernUserEmail}>{user.email}</Text>
        </View>
      </View>
    </View>
  );
};
