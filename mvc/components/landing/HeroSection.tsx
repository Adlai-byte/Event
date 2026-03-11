import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface HeroSectionProps {
  styles: any;
  onRegister: () => void;
  searchQuery?: string;
  onSearchChange?: (text: string) => void;
  onSearchSubmit?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  styles,
  onRegister,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
}) => {
  return (
    <View style={styles.heroSection}>
      <View style={styles.heroContent}>
        <View style={styles.heroTextContainer}>
          <Text style={styles.heroTitle}>Find Perfect Event Services</Text>
          <Text style={styles.heroDescription}>
            Your one-stop platform for booking venues, catering, photography, and more for your
            special occasions.
          </Text>

          {/* Prominent search bar */}
          <View style={styles.heroSearchBar}>
            <Feather name="search" size={20} color="#94A3B8" style={{ marginRight: 12 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search venues, photographers, catering..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={onSearchChange}
              onSubmitEditing={onSearchSubmit}
              returnKeyType="search"
            />
          </View>

          <TouchableOpacity
            style={[styles.heroCTA, { marginTop: 24 }]}
            onPress={onRegister}
          >
            <Text style={styles.heroCTAText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
