import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
  onRegisterPress?: () => void;
}

export interface MobileMenuProps {
  styles: any;
  activeNav: NavItem;
  onNavClick: (nav: NavItem) => void;
  onClose: () => void;
}

const NAV_ITEMS: readonly NavItem[] = ['home', 'services', 'events', 'about', 'contact'] as const;

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

export const NavBar: React.FC<NavBarProps> = ({
  styles,
  screenWidth,
  activeNav,
  searchQuery: _searchQuery,
  onSearchChange: _onSearchChange,
  onSearchSubmit: _onSearchSubmit,
  onNavClick,
  onMenuOpen,
  onLoginPress,
  onRegisterPress,
}) => {
  const showFullNav = screenWidth >= 900;

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        {/* Logo — left */}
        <View style={styles.logoSection}>
          <View style={styles.logoDot} />
          <Text style={styles.logo}>E-VENT</Text>
        </View>

        {/* Nav links — center (desktop only) */}
        {showFullNav && (
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

        {/* Actions — right */}
        {showFullNav ? (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.loginOutlineButton} onPress={onLoginPress}>
              <Text style={styles.loginOutlineText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={onRegisterPress || onLoginPress}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
        )}
      </View>
    </View>
  );
};
