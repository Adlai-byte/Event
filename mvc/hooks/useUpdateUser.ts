// mvc/hooks/useUpdateUser.ts
import { useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { getApiBaseUrl } from '../services/api';
import { User } from '../models/User';
import AuthService from '../services/AuthService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook that extracts the shared user-update logic used by PersonalInfoView
 * for both user and provider roles. Replaces the ~100-line duplicated onSave
 * callbacks that were previously inline in App.tsx.
 */
export function useUpdateUser() {
  const { authState, setAuthState, updateUserEmail, checkEmailVerification } = useAuth();

  const saveUser = useCallback(async (updatedUser: any): Promise<boolean | { success: boolean; error?: string }> => {
    try {
      if (!authState.user?.email) {
        if (Platform.OS === 'web') return { success: false, error: 'User email not found' };
        Alert.alert('Error', 'User email not found');
        return false;
      }

      const emailChanged = updatedUser.email && updatedUser.email.trim() !== authState.user.email.trim();

      // If email is being changed, update in Firebase first
      if (emailChanged) {
        const result = await updateUserEmail(updatedUser.email.trim());
        if (!result.success) {
          if (Platform.OS === 'web') {
            return { success: false, error: result.error || 'Failed to update email in Firebase. Please try again.' };
          }
          Alert.alert('Error', result.error || 'Failed to update email in Firebase. Please try again.');
          return false;
        }
        if (result.message?.includes('verification email')) {
          if (Platform.OS !== 'web') {
            Alert.alert('Verification Email Sent', result.message);
          }
        }
      }

      // Fetch user ID from email
      const emailQuery = encodeURIComponent(emailChanged ? updatedUser.email.trim() : authState.user.email);
      const userResp = await fetch(`${getApiBaseUrl()}/api/users/by-email?email=${emailQuery}`);
      if (!userResp.ok) throw new Error('Failed to fetch user ID');
      const userData = await userResp.json();
      if (!userData.ok || !userData.exists || !userData.id) throw new Error('User not found in database');

      // Update user in database
      const updateResp = await fetch(`${getApiBaseUrl()}/api/users/${userData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: updatedUser.firstName || authState.user.firstName || '',
          middleName: updatedUser.middleName || authState.user.middleName || '',
          lastName: updatedUser.lastName || authState.user.lastName || '',
          suffix: (updatedUser as any).suffix || '',
          email: updatedUser.email || authState.user.email || '',
          phone: updatedUser.phone || authState.user.phone || '',
          dateOfBirth: updatedUser.dateOfBirth || authState.user.dateOfBirth || '',
          address: updatedUser.address || authState.user.address || '',
          city: updatedUser.city || authState.user.city || '',
          state: updatedUser.state || authState.user.state || '',
          zipCode: updatedUser.zipCode || authState.user.zipCode || '',
          profilePicture: updatedUser.profilePicture || undefined,
        }),
      });

      if (!updateResp.ok) {
        const errData = await updateResp.json();
        throw new Error(errData.error || 'Failed to update user');
      }

      const updateData = await updateResp.json();

      // Refresh auth state with updated user data
      if (emailChanged) {
        await checkEmailVerification();
      }

      const refreshEmail = emailChanged ? updatedUser.email.trim() : authState.user.email;
      const refreshResp = await fetch(
        `${getApiBaseUrl()}/api/users/by-email?email=${encodeURIComponent(refreshEmail)}`
      );
      if (refreshResp.ok) {
        const refreshData = await refreshResp.json();
        if (refreshData.ok && refreshData.exists) {
          const firebaseUser = AuthService.getCurrentUser();
          const finalEmail = firebaseUser?.email || refreshEmail;
          const profilePic =
            refreshData.profilePicture ||
            updateData.profilePicture ||
            (updatedUser.profilePicture && updatedUser.profilePicture.startsWith('/uploads/')
              ? updatedUser.profilePicture
              : undefined);
          const updatedObj = new User(
            authState.user!.uid,
            finalEmail,
            authState.user!.displayName,
            firebaseUser?.emailVerified ?? authState.user!.emailVerified,
            authState.user!.createdAt,
            authState.user!.lastLoginAt,
            refreshData.firstName || updatedUser.firstName,
            refreshData.middleName || updatedUser.middleName,
            refreshData.lastName || updatedUser.lastName,
            refreshData.suffix || (updatedUser as any).suffix,
            updatedUser.phone || refreshData.phone,
            updatedUser.dateOfBirth || refreshData.dateOfBirth,
            updatedUser.address || refreshData.address,
            updatedUser.city || refreshData.city,
            updatedUser.state || refreshData.state,
            updatedUser.zipCode || refreshData.zipCode,
            refreshData.role || authState.user!.role,
            profilePic
          );
          setAuthState(prev => prev.setUser(updatedObj));
        }
      }

      return true;
    } catch (error: any) {
      console.error('Error updating user:', error);
      const msg = error.message || 'Failed to update personal information';
      if (Platform.OS === 'web') return { success: false, error: msg };
      Alert.alert('Error', msg);
      return false;
    }
  }, [authState.user, updateUserEmail, checkEmailVerification, setAuthState]);

  return { saveUser };
}
