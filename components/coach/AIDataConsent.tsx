import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AI_DATA_DISCLOSURE,
  grantAIDataConsent,
} from '../../services/aiConsentService';
import {
  PRIVACY_POLICY_URL,
  TERMS_OF_USE_URL,
} from '../../services/legalLinks';
import { useTheme } from '../../theme/ThemeContext';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

interface Props {
  userId: string;
  onAllowed: () => void;
  onNotNow: () => void;
}

export default function AIDataConsent({ userId, onAllowed, onNotNow }: Props) {
  const { colors } = useTheme();
  const { insets } = useResponsiveLayout();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allow = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await grantAIDataConsent(userId);
      onAllowed();
    } catch {
      setError('Your choice could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setError('This link could not be opened. Please try again.');
    }
  };

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingTop: 24,
        paddingBottom: Math.max(24, insets.bottom + 24),
        paddingLeft: Math.max(24, insets.left + 16),
        paddingRight: Math.max(24, insets.right + 16),
      }}
      accessibilityLabel="AI Coach data sharing permission"
    >
      <View
        style={{
          borderRadius: 16,
          padding: 24,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={36}
          color={colors.primary.main}
          style={{ alignSelf: 'center', marginBottom: 16 }}
        />
        <Text
          accessibilityRole="header"
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          Allow AI coach data sharing?
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 14,
            lineHeight: 21,
            textAlign: 'center',
          }}
        >
          {AI_DATA_DISCLOSURE}
        </Text>

        <TouchableOpacity
          onPress={allow}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel="Allow and continue to AI Coach"
          accessibilityState={{ disabled: isSaving }}
          style={{
            minHeight: 48,
            marginTop: 24,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary.main,
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          <Text
            style={{
              color: colors.textInverse,
              fontSize: 16,
              fontWeight: '600',
            }}
          >
            {isSaving ? 'Saving…' : 'Allow & Continue'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onNotNow}
          accessibilityRole="button"
          style={{
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 6,
          }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            Not Now
          </Text>
        </TouchableOpacity>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => openLink(PRIVACY_POLICY_URL)}
            accessibilityRole="link"
            style={{ minHeight: 44, justifyContent: 'center', padding: 8 }}
          >
            <Text style={{ color: colors.primary.main }}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openLink(TERMS_OF_USE_URL)}
            accessibilityRole="link"
            style={{ minHeight: 44, justifyContent: 'center', padding: 8 }}
          >
            <Text style={{ color: colors.primary.main }}>Terms of Use</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <Text
            accessibilityLiveRegion="polite"
            style={{
              color: colors.error.main,
              fontSize: 13,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            {error}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
