import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing } from '../constants/theme';

export interface BottomNavigationProps {
  activeTab?: 'home' | 'history' | 'settings';
  onTabPress?: (tab: 'home' | 'history' | 'settings') => void;
}

interface NavItem {
  key: 'home' | 'history' | 'settings';
  route: '/(tabs)' | '/(tabs)/history' | '/(tabs)/settings';
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'home',
    route: '/(tabs)',
    label: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  {
    key: 'history',
    route: '/(tabs)/history',
    label: 'History',
    activeIcon: 'time',
    inactiveIcon: 'time-outline',
  },
  {
    key: 'settings',
    route: '/(tabs)/settings',
    label: 'Settings',
    activeIcon: 'settings',
    inactiveIcon: 'settings-outline',
  },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabPress,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const getActiveState = (item: NavItem): boolean => {
    if (activeTab) {
      return activeTab === item.key;
    }
    if (item.key === 'home') {
      return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    }
    if (item.key === 'history') {
      return pathname.includes('history');
    }
    if (item.key === 'settings') {
      return pathname.includes('settings');
    }
    return false;
  };

  const handlePress = (item: NavItem) => {
    if (onTabPress) {
      onTabPress(item.key);
    } else {
      router.push(item.route);
    }
  };

  return (
    <View style={styles.container}>
      {NAV_ITEMS.map((item) => {
        const isActive = getActiveState(item);
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.tabItem}
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item.label}
          >
            <Ionicons
              name={isActive ? item.activeIcon : item.inactiveIcon}
              size={22}
              color={isActive ? colors.primary : colors.secondaryText}
            />
            <Text
              style={[
                styles.tabLabel,
                isActive ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: Platform.OS === 'android' ? 64 : 84,
    paddingBottom: Platform.OS === 'android' ? 8 : 24,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabLabelInactive: {
    color: colors.secondaryText,
  },
});

