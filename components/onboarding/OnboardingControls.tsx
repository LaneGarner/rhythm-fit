import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const HIT_SLOP = { top: 14, bottom: 14, left: 14, right: 14 };

// Progress header: back affordance, step dots, "n/total".
export function StepHeader({
  step,
  total,
  onBack,
}: {
  step: number;
  total: number;
  onBack: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
      }}
    >
      <TouchableOpacity
        onPress={onBack}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}
      >
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </TouchableOpacity>
      <View
        style={{ flexDirection: 'row', gap: 5 }}
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${step} of ${total}`}
      >
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={{
              width: 18,
              height: 4,
              borderRadius: 2,
              backgroundColor: i < step ? colors.text : colors.borderSecondary,
            }}
          />
        ))}
      </View>
      <Text style={{ color: colors.textTertiary, fontSize: 13, minWidth: 32 }}>
        {step}/{total}
      </Text>
    </View>
  );
}

export function StepTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text
        accessibilityRole="header"
        style={{
          color: colors.text,
          fontSize: 22,
          fontWeight: '600',
          marginBottom: 6,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

// A full-width selectable row/card with a non-color selection cue (checkmark).
export function SelectCard({
  label,
  description,
  icon,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        minHeight: 56,
        borderRadius: 12,
        backgroundColor: selected ? colors.primary.background : colors.surface,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.primary.main : colors.border,
        marginBottom: 12,
      }}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={22}
          color={selected ? colors.primary.main : colors.textSecondary}
        />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: 16,
            fontWeight: selected ? '600' : '400',
          }}
        >
          {label}
        </Text>
        {description ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              marginTop: 2,
              lineHeight: 18,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {selected ? (
        <Ionicons
          name="checkmark-circle"
          size={22}
          color={colors.primary.main}
        />
      ) : null}
    </TouchableOpacity>
  );
}

// A compact selectable chip with a checkmark when selected.
export function SelectChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 9,
        paddingHorizontal: 14,
        minHeight: 40,
        borderRadius: 20,
        backgroundColor: selected ? colors.primary.background : colors.surface,
        borderWidth: 1,
        borderColor: selected ? colors.primary.main : colors.border,
      }}
    >
      {selected ? (
        <Ionicons name="checkmark" size={15} color={colors.primary.main} />
      ) : null}
      <Text
        style={{
          color: selected ? colors.primary.main : colors.text,
          fontSize: 14,
          fontWeight: selected ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Primary CTA. Disabled state is visually distinct and announced.
export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 15,
        minHeight: 50,
        borderRadius: 12,
        backgroundColor: disabled
          ? colors.borderSecondary
          : colors.primary.main,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={disabled ? colors.textTertiary : colors.textInverse}
        />
      ) : null}
      <Text
        style={{
          color: disabled ? colors.textTertiary : colors.textInverse,
          fontSize: 16,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// A clearly visible skip link (≥44pt target), not a hidden gesture.
export function SkipLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ alignItems: 'center', justifyContent: 'center', minHeight: 44 }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 15,
          textDecorationLine: 'underline',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function OnboardingTextArea({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
}) {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      multiline
      accessibilityLabel={placeholder}
      style={{
        minHeight: 88,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.inputBackground,
        color: colors.text,
        fontSize: 15,
        textAlignVertical: 'top',
      }}
    />
  );
}
