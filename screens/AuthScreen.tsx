import { useNavigation, CommonActions } from '@react-navigation/native';
import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../theme/ThemeContext';

// Theme colors
const getColors = (isDark: boolean) => ({
  background: isDark ? '#000' : '#fff',
  text: isDark ? '#fff' : '#111',
  textSecondary: isDark ? '#999' : '#666',
  primary: isDark ? '#2563eb' : '#3b82f6',
});

export default function AuthScreen() {
  const { signIn, signUp, user } = useAuth();
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const navigation = useNavigation();

  // Navigate to Main when user becomes authenticated
  useEffect(() => {
    if (user) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        })
      );
    }
  }, [user, navigation]);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(signInError.message);
        }
      } else {
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) {
          setError(signUpError.message);
        } else {
          setSuccessMessage(
            'Account created! Please check your email to confirm your account.'
          );
          setIsLogin(true);
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-8 py-12">
          {/* Logo/Title */}
          <View className="items-center mb-12">
            <Text className="text-5xl mb-2">💪</Text>
            <Text className="text-3xl font-bold" style={{ color: colors.text }}>
              Rhythm
            </Text>
            <Text
              className="text-base mt-2"
              style={{ color: colors.textSecondary }}
            >
              Track your fitness journey
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <View>
              <Text
                className="text-sm font-medium mb-2"
                style={{ color: colors.text }}
              >
                Email
              </Text>
              <TextInput
                className="rounded-xl px-4 py-4 text-base"
                style={{
                  backgroundColor: isDark ? '#1f1f1f' : '#f5f5f5',
                  color: colors.text,
                }}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View className="mt-4">
              <Text
                className="text-sm font-medium mb-2"
                style={{ color: colors.text }}
              >
                Password
              </Text>
              <TextInput
                className="rounded-xl px-4 py-4 text-base"
                style={{
                  backgroundColor: isDark ? '#1f1f1f' : '#f5f5f5',
                  color: colors.text,
                }}
                placeholder="Enter your password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </View>

            {!isLogin && (
              <View className="mt-4">
                <Text
                  className="text-sm font-medium mb-2"
                  style={{ color: colors.text }}
                >
                  Confirm Password
                </Text>
                <TextInput
                  className="rounded-xl px-4 py-4 text-base"
                  style={{
                    backgroundColor: isDark ? '#1f1f1f' : '#f5f5f5',
                    color: colors.text,
                  }}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoComplete="new-password"
                />
              </View>
            )}

            {/* Error Message */}
            {error && (
              <View className="mt-4 p-3 rounded-lg bg-red-500/10">
                <Text className="text-red-500 text-center">{error}</Text>
              </View>
            )}

            {/* Success Message */}
            {successMessage && (
              <View className="mt-4 p-3 rounded-lg bg-green-500/10">
                <Text className="text-green-500 text-center">
                  {successMessage}
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              className="mt-6 rounded-xl py-4 items-center"
              style={{ backgroundColor: colors.primary }}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Mode */}
            <TouchableOpacity
              className="mt-4 items-center py-2"
              onPress={toggleMode}
            >
              <Text style={{ color: colors.textSecondary }}>
                {isLogin
                  ? "Don't have an account? "
                  : 'Already have an account? '}
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Skip for now */}
          <TouchableOpacity
            className="mt-8 items-center py-2"
            onPress={() => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Main' }],
                })
              );
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              Continue without account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
