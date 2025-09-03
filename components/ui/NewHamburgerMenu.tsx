import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface NewHamburgerMenuProps {
  currentRoute?: string;
}

interface MenuItem {
  name: string;
  route: string;
  icon: string;
}

export const NewHamburgerMenu: React.FC<NewHamburgerMenuProps> = ({ currentRoute }) => {
  const [isVisible, setIsVisible] = useState(false);

  const menuItems: MenuItem[] = [
    { name: 'Home', route: '/(tabs)/home', icon: 'home-outline' },
    { name: 'Explore', route: '/(tabs)/explore', icon: 'compass-outline' },
    { name: 'Map', route: '/(tabs)/map', icon: 'map-outline' },
    { name: 'Add Donation', route: '/(tabs)/add', icon: 'add-circle-outline' },
    { name: 'All Items', route: '/(tabs)/all', icon: 'list-outline' },
    { name: 'Notifications', route: '/(tabs)/notifications', icon: 'notifications-outline' },
    { name: 'Profile', route: '/(tabs)/profile', icon: 'person-outline' },
  ];

  const openMenu = () => {
    setIsVisible(true);
  };

  const closeMenu = () => {
    setIsVisible(false);
  };

  const navigateTo = (route: string) => {
    console.log('🚀 Navigating to:', route);
    
    // Close menu first
    setIsVisible(false);
    
    // Navigate after a brief delay to allow menu to close
    setTimeout(() => {
      try {
        router.push(route as any);
        console.log('✅ Navigation successful to:', route);
      } catch (error) {
        console.error('❌ Navigation failed:', error);
        // Try replace as fallback
        try {
          router.replace(route as any);
          console.log('✅ Fallback navigation successful to:', route);
        } catch (fallbackError) {
          console.error('❌ All navigation methods failed:', fallbackError);
        }
      }
    }, 100);
  };

  return (
    <>
      {/* Hamburger Button */}
      <View style={styles.hamburgerContainer}>
        <Pressable 
          style={styles.hamburgerButton} 
          onPress={openMenu}
          android_ripple={{ color: 'rgba(255,255,255,0.3)', radius: 24 }}
        >
          <LinearGradient
            colors={['#22c55e', '#16a34a']}
            style={styles.hamburgerGradient}
          >
            <Ionicons name="menu" size={24} color="#ffffff" />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Navigation Modal */}
      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={closeMenu}
      >
        <View style={styles.modalContainer}>
          {/* Background Overlay */}
          <Pressable style={styles.overlay} onPress={closeMenu} />
          
          {/* Menu Content */}
          <View style={styles.menuContainer}>
            <LinearGradient
              colors={['#ffffff', '#f8fafc']}
              style={styles.menuGradient}
            >
              <SafeAreaView style={styles.menuContent}>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.title}>Navigation</Text>
                  <Pressable style={styles.closeButton} onPress={closeMenu}>
                    <Ionicons name="close" size={24} color="#64748b" />
                  </Pressable>
                </View>

                {/* Menu Items */}
                <View style={styles.menuList}>
                  {menuItems.map((item, index) => {
                    const isActive = currentRoute === item.route;
                    
                    return (
                      <Pressable
                        key={index}
                        style={[
                          styles.menuItem,
                          isActive && styles.activeMenuItem,
                        ]}
                        onPress={() => navigateTo(item.route)}
                        android_ripple={{ color: 'rgba(34, 197, 94, 0.1)' }}
                      >
                        <View style={[
                          styles.iconContainer,
                          isActive && styles.activeIconContainer,
                        ]}>
                          <Ionicons
                            name={item.icon as any}
                            size={20}
                            color={isActive ? '#ffffff' : '#22c55e'}
                          />
                        </View>
                        <Text style={[
                          styles.menuText,
                          isActive && styles.activeMenuText,
                        ]}>
                          {item.name}
                        </Text>
                        {isActive && <View style={styles.activeIndicator} />}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>Appify 2025</Text>
                </View>
              </SafeAreaView>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </>
  );
};

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
    borderRadius: 24,
    overflow: 'hidden',
  },
  hamburgerGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlay: {
    flex: 1,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.75,
    maxWidth: 300,
  },
  menuGradient: {
    flex: 1,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  menuList: {
    flex: 1,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 12,
  },
  activeMenuItem: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    marginRight: 14,
  },
  activeIconContainer: {
    backgroundColor: '#22c55e',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#475569',
  },
  activeMenuText: {
    color: '#1e293b',
    fontWeight: '600',
  },
  activeIndicator: {
    width: 3,
    height: 16,
    backgroundColor: '#22c55e',
    borderRadius: 1.5,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
