import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

interface KeyboardAwareViewProps {
  children: React.ReactNode;
  className?: string;
}

export default function KeyboardAwareView({
  children,
  className = '',
}: KeyboardAwareViewProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={`flex-1 ${className}`}
    >
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
