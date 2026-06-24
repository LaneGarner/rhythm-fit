import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// Shown to users without Coach access. Today that's "not signed in"; when the
// paywall lands, this same surface (or its payment sibling) sits behind CoachGate.
export default function SignInPrompt() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background }}
      accessibilityLabel="Coach is available after signing in"
    >
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
        <View
          style={{
            alignItems: 'center',
            padding: 28,
            borderRadius: 16,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.primary.background,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Ionicons name="sparkles" size={24} color={colors.primary.main} />
          </View>
          <Text
            accessibilityRole="header"
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: '600',
              marginBottom: 6,
              textAlign: 'center',
            }}
          >
            Your AI coach
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              lineHeight: 20,
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            Sign in to build a personalized plan, get tips from your workouts,
            and reschedule on the fly.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Auth')}
            accessibilityRole="button"
            accessibilityLabel="Sign in to unlock the coach"
            style={{
              width: '100%',
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: colors.primary.main,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: colors.textInverse,
                fontSize: 16,
                fontWeight: '600',
              }}
            >
              Sign in to unlock
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 13,
              lineHeight: 18,
              textAlign: 'center',
              marginTop: 14,
            }}
          >
            The rest of the app keeps working without an account.
          </Text>
        </View>
      </View>
    </View>
  );
}
