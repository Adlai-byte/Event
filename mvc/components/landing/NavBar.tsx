import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';

type NavItem = 'home' | 'services' | 'events' | 'about' | 'contact';

export interface NavBarProps {
  styles: any;
  screenWidth: number;
  activeNav: NavItem;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onSearchSubmit: () => void;
  onNavClick: (nav: NavItem) => void;
  onMenuOpen: () => void;
  onLoginPress: () => void;
}

export interface MobileMenuProps {
  styles: any;
  activeNav: NavItem;
  onNavClick: (nav: NavItem) => void;
  onClose: () => void;
}

const NAV_ITEMS: readonly NavItem[] = ['home', 'services', 'events', 'about', 'contact'] as const;

/**
 * Mobile slide-out menu overlay.
 * Rendered outside the ScrollView at the wrapper level.
 */
export const MobileMenu: React.FC<MobileMenuProps> = ({
  styles,
  activeNav,
  onNavClick,
  onClose,
}) => {
  return (
    <>
      <TouchableOpacity style={styles.mobileMenuOverlay} onPress={onClose} activeOpacity={1} />
      <View style={styles.mobileMenu}>
        <TouchableOpacity style={styles.mobileMenuClose} onPress={onClose}>
          <Feather name="x" size={20} color="#334155" />
        </TouchableOpacity>
        {NAV_ITEMS.map((nav) => (
          <TouchableOpacity
            key={nav}
            style={[styles.mobileMenuItem, activeNav === nav && styles.mobileMenuItemActive]}
            onPress={() => {
              onNavClick(nav);
              onClose();
            }}
          >
            <Text style={[styles.mobileMenuText, activeNav === nav && styles.mobileMenuTextActive]}>
              {nav.charAt(0).toUpperCase() + nav.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
};

/**
 * Top bar + sticky header with search bar, logo, and navigation links.
 * Rendered inside the ScrollView.
 */
export const NavBar: React.FC<NavBarProps> = ({
  styles,
  screenWidth,
  activeNav,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onNavClick,
  onMenuOpen,
  onLoginPress,
}) => {
  return (
    <>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>Plan your perfect event with E-VENT</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity onPress={onLoginPress} style={styles.topBarLink}>
            <Text style={styles.topBarLinkText}>Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* Search Bar on Left */}
          <View style={styles.searchBarContainer}>
            <TouchableOpacity onPress={onSearchSubmit} style={styles.searchIconButton}>
              <Feather name="search" size={18} color="#94A3B8" />
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Search events, services..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={onSearchChange}
              onSubmitEditing={onSearchSubmit}
              returnKeyType="search"
            />
          </View>

          {/* Logo in Center */}
          <View style={styles.logoSection}>
            <Text style={styles.logo}>E-VENT</Text>
          </View>

          {/* Navigation on Right - hamburger on narrow widths */}
          {screenWidth < 900 ? (
            <TouchableOpacity
              style={styles.hamburgerButton}
              onPress={onMenuOpen}
              accessibilityRole="button"
              accessibilityLabel="Open menu"
            >
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerNav}>
              {NAV_ITEMS.map((nav) => (
                <TouchableOpacity
                  key={nav}
                  style={[styles.headerNavItem, activeNav === nav && styles.headerNavItemActive]}
                  onPress={() => onNavClick(nav)}
                >
                  <Text
                    style={[styles.headerNavText, activeNav === nav && styles.headerNavTextActive]}
                  >
                    {nav.charAt(0).toUpperCase() + nav.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </>
  );
};
