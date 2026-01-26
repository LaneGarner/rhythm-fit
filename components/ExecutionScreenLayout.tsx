import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemeContext } from '../theme/ThemeContext';

interface ExecutionScreenLayoutProps {
  title: string;
  onBack: () => void;
  onEdit?: () => void;
  children: React.ReactNode;
}

export default function ExecutionScreenLayout({
  title,
  onBack,
  onEdit,
  children,
}: ExecutionScreenLayoutProps) {
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      'keyboardWillShow',
      e => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      'keyboardWillHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#F9FAFB' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 72,
          paddingBottom: 16,
          paddingHorizontal: 16,
          backgroundColor: isDark ? '#111' : '#fff',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#222' : '#e5e7eb',
        }}
      >
        <TouchableOpacity
          hitSlop={14}
          onPress={onBack}
          style={{ paddingVertical: 4, paddingHorizontal: 8, marginRight: 8 }}
        >
          <Text style={{ color: '#2563eb', fontSize: 18, fontWeight: '500' }}>
            Back
          </Text>
        </TouchableOpacity>
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 66,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: isDark ? '#fff' : '#111',
              textAlign: 'center',
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        {onEdit && (
          <TouchableOpacity
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            onPress={onEdit}
            style={{
              position: 'absolute',
              right: 16,
              top: 66,
              padding: 8,
            }}
          >
            <Text
              style={{
                color: isDark ? '#60A5FA' : '#2563EB',
                fontSize: 16,
                fontWeight: '600',
              }}
            >
              Edit
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: isKeyboardVisible ? keyboardHeight + 100 : 200,
        }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <View className="p-4" style={{ gap: 24 }}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

// Reusable section spacing wrapper
export function ExecutionSection({ children }: { children: React.ReactNode }) {
  return <View>{children}</View>;
}
