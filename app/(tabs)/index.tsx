import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { borderRadius, shadows, spacing } from '../../constants/theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import { FeatureCard } from '../../components/FeatureCard';
import { RecentAnalysisCard } from '../../components/RecentAnalysisCard';
import { EmptyState } from '../../components/EmptyState';
import { useApp } from '../../context/AppContext';

export default function HomeScreen() {
  const router = useRouter();
  const { history, deleteHistoryItem, restoreHistoryItem } = useApp();

  const handleUploadPress = () => {
    router.push('/upload');
  };

  const handleCameraPress = () => {
    router.push({ pathname: '/upload', params: { source: 'camera' } });
  };

  const handleCategoryPress = (categoryName: string) => {
    router.push({ pathname: '/upload', params: { category: categoryName } });
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.greeting}>Hello, Welcome to ScreenWise AI</Text>
          <Text style={styles.subtitle}>What would you like to understand today?</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBadge}
          onPress={() => router.push('/(tabs)/settings')}
          activeOpacity={0.8}
        >
          <Ionicons name="person-circle" size={38} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Main Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroContent}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={14} color={colors.primary} style={{ marginRight: 5 }} />
            <Text style={styles.heroBadgeText}>AI Screen Vision</Text>
          </View>
          <Text style={styles.heroHeading}>Understand Any Screen</Text>
          <Text style={styles.heroDescription}>
            Upload a screenshot and get an instant AI explanation with simple steps and voice guidance.
          </Text>

          <View style={styles.heroButtons}>
            <PrimaryButton
              title="Upload Screenshot"
              onPress={handleUploadPress}
              icon="cloud-upload-outline"
              size="lg"
              style={{ marginBottom: spacing.sm }}
            />
            <SecondaryButton
              title="Take a Photo"
              onPress={handleCameraPress}
              icon="camera-outline"
              variant="outline"
              size="md"
            />
          </View>
        </View>
      </View>

      {/* Quick Categories Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Common Screen Types</Text>
        <Text style={styles.sectionSubtitle}>Select what you need help interpreting</Text>
      </View>

      <View style={styles.categoriesGrid}>
        <FeatureCard
          title="Error Messages"
          description="Fix confusing 404s, app crashes, and failed transaction alerts."
          icon="alert-circle-outline"
          iconColor={colors.error}
          iconBgColor={colors.errorBg}
          onPress={() => handleCategoryPress('Error Messages')}
          style={styles.gridItem}
        />
        <FeatureCard
          title="Banking Screens"
          description="Decode transaction statuses, IFSC fields, and timeout warnings safely."
          icon="card-outline"
          iconColor={colors.primary}
          iconBgColor={colors.primarySoft}
          onPress={() => handleCategoryPress('Banking Screens')}
          style={styles.gridItem}
        />
        <FeatureCard
          title="Government Forms"
          description="Clarify eligibility, document upload limits, and portal instructions."
          icon="business-outline"
          iconColor="#D97706"
          iconBgColor="#FEF3C7"
          onPress={() => handleCategoryPress('Government Forms')}
          style={styles.gridItem}
        />
        <FeatureCard
          title="College Portals"
          description="Understand grade sheets, hall tickets, fee deadlines, and seat allocations."
          icon="school-outline"
          iconColor="#7C3AED"
          iconBgColor="#F5F3FF"
          onPress={() => handleCategoryPress('College Portals')}
          style={styles.gridItem}
        />
        <FeatureCard
          title="Software Interfaces"
          description="Navigate complex settings, permissions, and technical developer panels."
          icon="settings-outline"
          iconColor="#059669"
          iconBgColor="#D1FAE5"
          onPress={() => handleCategoryPress('Software Interfaces')}
          style={styles.gridItemFull}
        />
      </View>

      {/* Recent Activity Section */}
      <View style={styles.sectionHeader}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Recent Analyses</Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
              <Text style={styles.viewAllText}>View All ({history.length})</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.sectionSubtitle}>Screens you analyzed recently</Text>
      </View>

      {history.length === 0 ? (
        <EmptyState
          icon="images-outline"
          title="No Recent Analyses"
          description="Screenshots you analyze will appear here for fast reference anytime."
          actionTitle="Analyze Your First Screen"
          onActionPress={handleUploadPress}
        />
      ) : (
        <View style={styles.recentList}>
          {history.slice(0, 3).map((item) => (
            <RecentAnalysisCard
              key={item.id}
              item={item}
              onPress={() => {
                restoreHistoryItem(item);
                router.push('/results');
              }}
              onDelete={() => deleteHistoryItem(item.id)}
            />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    paddingTop: spacing.xs,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  greeting: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 3,
  },
  profileBadge: {
    padding: 2,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: 'rgba(15, 82, 186, 0.15)',
    ...shadows.card,
  },
  heroContent: {
    width: '100%',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    marginBottom: spacing.md,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  heroHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  heroDescription: {
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  heroButtons: {
    width: '100%',
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  categoriesGrid: {
    marginBottom: spacing.xxl,
  },
  gridItem: {
    marginBottom: spacing.md,
  },
  gridItemFull: {
    marginBottom: spacing.md,
  },
  recentList: {
    marginBottom: spacing.xl,
  },
});

