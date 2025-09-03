import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface HamburgerMenuProps {
  currentRoute?: string;
}

export const HamburgerMenu = memo(function HamburgerMenu({ currentRoute }: HamburgerMenuProps) {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const navigatingRef = useRef(false);

  const menuItems = useMemo(() => [
    { name: 'Home', route: '/(tabs)/home', icon: 'home-outline' },
    { name: 'Dashboard', route: '/(tabs)/home', icon: 'analytics-outline' },
    { name: 'Explore', route: '/(tabs)/explore', icon: 'compass-outline' },
    { name: 'Map', route: '/(tabs)/map', icon: 'map-outline' },
    { name: 'Add Donation', route: '/(tabs)/add', icon: 'add-circle-outline' },
    { name: 'All Items', route: '/(tabs)/all', icon: 'list-outline' },
    { name: 'Notifications', route: '/(tabs)/notifications', icon: 'notifications-outline' },
    { name: 'Profile', route: '/(tabs)/profile', icon: 'person-outline' },
  ], []);

  const openMenu = useCallback(() => {
    setIsMenuVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [overlayAnim, slideAnim]);

  const closeMenu = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsMenuVisible(false);
    });
  }, [overlayAnim, slideAnim]);

  const navigateToRoute = useCallback((route: string) => {
    console.log('=== NAVIGATION ATTEMPT ===');
    console.log('Target route:', route);
    console.log('Current route:', currentRoute);
    
    // Immediate navigation - no delays or complex logic
    try {
      setIsMenuVisible(false);
      slideAnim.setValue(-width);
      overlayAnim.setValue(0);
      
      // Direct navigation
      router.push(route as any);
      console.log('Navigation successful to:', route);
    } catch (error) {
      console.error('Direct navigation failed:', error);
      // Try replace as fallback
      try {
        router.replace(route as any);
        console.log('Fallback navigation successful to:', route);
      } catch (replaceError) {
        console.error('Both navigation methods failed:', replaceError);
      }
    }
  }, [currentRoute, slideAnim, overlayAnim]);

  return (
    <View style={styles.hamburgerContainer}>
      {/* Hamburger Button */}
      <TouchableOpacity 
        style={styles.hamburgerButton} 
        onPress={openMenu}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#22c55e', '#16a34a']}
          style={styles.hamburgerGradient}
        >
          <Ionicons name="menu" size={24} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal
        visible={isMenuVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={() => closeMenu()}
      >
        <View style={styles.modalContainer}>
          {/* Overlay */}
          <Animated.View
            style={[
              styles.overlay,
              {
                opacity: overlayAnim,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.overlayTouchable}
              onPress={() => closeMenu()}
              activeOpacity={1}
            />
          </Animated.View>

          {/* Menu Panel */}
          <Animated.View
            style={[
              styles.menuPanel,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#ffffff', '#f9fafb']}
              style={styles.menuGradient}
            >
              <SafeAreaView style={styles.menuContent}>
                {/* Menu Header */}
                <View style={styles.menuHeader}>
                  <Text style={styles.menuTitle}>Menu</Text>
                    <TouchableOpacity onPress={() => closeMenu()} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* Menu Items */}
                <View style={styles.menuItems}>
                  {menuItems.map((item, index) => (
                    <Link
                      key={index}
                      href={item.route as any}
                      asChild
                      onPress={() => {
                        console.log(`=== MENU ITEM PRESSED ===`);
                        console.log(`Item: ${item.name}`);
                        console.log(`Route: ${item.route}`);
                        console.log(`Current: ${currentRoute}`);
                        closeMenu();
                      }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.menuItem,
                          currentRoute === item.route && styles.activeMenuItem,
                        ]}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.menuIconContainer,
                            currentRoute === item.route && styles.activeMenuIcon,
                          ]}
                        >
                          <Ionicons
                            name={item.icon as any}
                            size={22}
                            color={currentRoute === item.route ? '#ffffff' : '#22c55e'}
                          />
                        </View>
                        <Text
                          style={[
                            styles.menuItemText,
                            currentRoute === item.route && styles.activeMenuItemText,
                          ]}
                        >
                          {item.name}
                        </Text>
                        {currentRoute === item.route && (
                          <View style={styles.activeIndicator} />
                        )}
                      </TouchableOpacity>
                    </Link>
                  ))}
                </View>
              </SafeAreaView>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  hamburgerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  hamburgerButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 9999,
    elevation: 20,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 24,
  },
  hamburgerGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
  },
  menuPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.8,
    maxWidth: 320,
  },
  menuGradient: {
    flex: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  menuContent: {
    flex: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 8,
  },
  menuItems: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
  },
  activeMenuItem: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    marginRight: 16,
  },
  activeMenuIcon: {
    backgroundColor: '#22c55e',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  activeMenuItemText: {
    color: '#1f2937',
    fontWeight: '600',
  },
  activeIndicator: {
    width: 4,
    height: 20,
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
});
