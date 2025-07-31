# Feature Implementation Instructions

### General

- Create a new markdown file in rhythm/feature-specs with detailed instructions for how to implement the feature. Include code examples and each and every step to implement the feature described.
- Follow all step-by-step guidance in this document
- Only change what is explicitly specified in the instructions
- Do not regenerate files or majorly change UI beyond the exact changes described
- After creating the markdown file, proceed to read the instructions in the file and implement them step by step.

---

## Rules for Parsing and Following Instructions

- **Do not change anything else in the app except what is explicitly specified in the instructions.**
- **Take no liberties.**
- **Do not regenerate any files or majorly change any UI beyond the exact changes described.**
- **Follow the instructions to the letter without adding any additional features, UI changes, or modifications not explicitly mentioned.**
- **If a step is unclear, clarify before proceeding.**
- **If a file or feature is not mentioned, do not modify it.**
- **Always check for and follow any critical instructions or warnings at the top of the instruction files.**

---

# Rhythm App Development Standards & Patterns

## ⚠️ CRITICAL DEVELOPMENT PRINCIPLES

**PRIMARY RULE:** "DO NOT CHANGE ANYTHING ELSE IN THE APP EXCEPT WHAT IS EXPLICITLY SPECIFIED" - This suggests maintaining consistency and not making unnecessary changes when implementing features.

**FOLLOW EXISTING PATTERNS:** Always examine existing implementations in the codebase before creating new features. Consistency is paramount.

---

## 🏗️ Component Architecture Patterns

### Component Interface Standards

```typescript
// Always use descriptive prop interfaces
interface ComponentNameProps {
  mode: 'create' | 'edit';
  onSave: (data: Type) => void;
  onCancel: () => void;
  visible?: boolean; // Optional props with defaults
}

// PREFERRED: Named export with arrow function and props destructuring
export const ComponentName = (props: ComponentNameProps) => {
  const { mode, onSave, onCancel, visible } = props;
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  // Component logic
};

// Alternative pattern (still acceptable for screens and complex components)
export default function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  // Component logic
}
```

### Shared Component Approach

- Create reusable components (like `ActivityForm`) rather than duplicating code
- Use props for `mode: 'create' | 'edit'` patterns
- Implement consistent `onSave` and `onCancel` callback patterns

### Import/Export Preferences

**PREFER Named Exports and Destructured Imports:**

```typescript
// PREFERRED: Named exports
export const ComponentName = (props: Props) => { ... };
export const utilityFunction = () => { ... };
export const CONSTANTS = { ... };

// PREFERRED: Destructured imports
import { ComponentName, utilityFunction, CONSTANTS } from './module';
import { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

// Acceptable for screens and main app components
export default function ScreenName() { ... }
```

**Component Function Style:**

```typescript
// PREFERRED: Arrow functions with props destructuring
const ComponentName = (props: ComponentNameProps) => {
  const { prop1, prop2, prop3 } = props;
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  // Component logic
  return (
    <View>
      {/* JSX */}
    </View>
  );
};
```

### Header Layout Standard

```typescript
// Consistent header structure across screens
<View
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 72, // Consistent top padding
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: isDark ? '#111' : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#222' : '#e5e7eb',
  }}
>
  {/* Left action (Back button) */}
  <TouchableOpacity
    hitSlop={14} // Always include hitSlop for better touch targets
    onPress={onBack}
    style={{ paddingVertical: 4, paddingHorizontal: 8, marginRight: 8 }}
  >
    <Text style={{ color: '#2563eb', fontSize: 18, fontWeight: '500' }}>
      Back
    </Text>
  </TouchableOpacity>

  {/* Centered title - absolutely positioned */}
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
    <Text style={{ fontSize: 22, fontWeight: 'bold', color: isDark ? '#fff' : '#111' }}>
      {title}
    </Text>
  </View>
</View>
```

---

## 🎨 Theme Integration & Styling

### Theme Context Usage

```typescript
const { colorScheme } = useContext(ThemeContext);
const isDark = colorScheme === 'dark';
```

- Always use theme context for dark/light mode
- Consistent conditional styling based on `isDark`

### Standard Color Values

```typescript
const colors = {
  primary: '#2563eb',
  blue: {
    500: '#3b82f6',
    600: '#2563eb',
  },
  backgrounds: {
    light: '#F9FAFB',
    dark: '#000',
    cardLight: '#fff',
    cardDark: '#111',
  },
  borders: {
    light: '#e5e7eb',
    dark: '#222',
  },
  text: {
    light: '#111',
    dark: '#fff',
    secondary: '#666',
    darkSecondary: '#e5e5e5',
  },
};
```

### Button Styling Patterns

```typescript
className={`py-3 px-6 rounded-lg ${
  isSaveDisabled ? 'bg-gray-400' : 'bg-blue-500 active:bg-blue-600'
}`}
```

### Floating Action Button Pattern

```typescript
// Consistent FAB positioning and styling
<TouchableOpacity
  onPress={onPress}
  style={{
    position: 'absolute',
    bottom: 102, // Consistent bottom position
    right: 34,   // Consistent right position
    backgroundColor: '#2563eb',
    borderRadius: 32,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  }}
  activeOpacity={0.85}
  accessibilityLabel="Add Activity"
>
  <Ionicons name="add" size={32} color="#fff" />
</TouchableOpacity>
```

---

## 📱 React Native Best Practices

### TouchableOpacity Standards

```typescript
// Always include hitSlop for better UX
<TouchableOpacity
  hitSlop={14}
  onPress={onPress}
  activeOpacity={0.7} // or 0.85 for buttons
  accessibilityLabel="Descriptive label"
>
```

### Modal Presentation

```typescript
<Modal
  visible={visible}
  animationType="slide"
  presentationStyle="pageSheet" // iOS native feel
>
```

### Keyboard Handling Pattern

```typescript
// Standard keyboard listener setup
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
```

### ScrollView with Keyboard Adjustment

```typescript
<ScrollView
  ref={scrollViewRef}
  contentContainerStyle={{
    paddingBottom: isKeyboardVisible ? keyboardHeight + 100 : 200,
  }}
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={true}
>
```

### Auto-scroll to Input Functionality

```typescript
const scrollToInput = (inputRef: React.RefObject<TextInput | null>) => {
  if (inputRef.current && scrollViewRef.current) {
    inputRef.current.measureLayout(
      scrollViewRef.current as any,
      (x, y) => {
        scrollViewRef.current?.scrollTo({
          y: y - 100,
          animated: true,
        });
      },
      () => {
        console.log('Failed to measure input position');
      }
    );
  }
};
```

---

## 🗃️ Redux State Management

### Redux Action Pattern

```typescript
// All actions auto-save to storage
export const actionName = (state, action: PayloadAction<Type>) => {
  // Update state
  state.data = newData;

  // Log for debugging
  console.log('Action description:', action.payload);

  // Auto-save to storage
  saveToStorage(state.data)
    .then(() => console.log('Data saved successfully'))
    .catch(error => console.error('Error saving:', error));
};
```

### Redux Integration

```typescript
const dispatch = useDispatch();
const activities = useSelector((state: RootState) => state.activities.data);
```

### Component State Management

```typescript
// Always use descriptive state names
const [selectedActivities, setSelectedActivities] = useState<Set<string>>(
  new Set()
);
const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
const [errors, setErrors] = useState<{ [key: string]: string }>({});
```

---

## 💾 Storage Patterns

### Consistent Storage Functions

```typescript
// Pattern for all storage functions
export const saveDataType = async (data: Type[]): Promise<void> => {
  try {
    await AsyncStorage.setItem('storageKey', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving data:', error);
  }
};

export const loadDataType = async (): Promise<Type[]> => {
  try {
    const data = await AsyncStorage.getItem('storageKey');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading data:', error);
    return [];
  }
};
```

### Error Handling in Storage

- Always use try-catch blocks
- Log errors with descriptive messages
- Return sensible defaults on failure

---

## 📝 TypeScript Standards

### Strict Type Definitions

```typescript
// Use union types for known values
export type ActivityType =
  | 'weight-training'
  | 'calisthenics'
  | 'cardio'
  | 'mobility'
  | 'recovery'
  | 'sports'
  | 'other';

// Interface definitions with optional properties
export interface ComponentProps {
  required: string;
  optional?: boolean;
  callback: (data: Type) => void;
}

// Use 'as const' for immutable objects
export const CONSTANTS = {
  values: ['a', 'b', 'c'],
} as const;
```

### Error Handling & Validation

```typescript
// Validate required fields
const newErrors: { [key: string]: string } = {};

if (!activityName.trim()) {
  newErrors.name = 'Required field';
}

if (Object.keys(newErrors).length > 0) {
  setErrors(newErrors);
  return;
}
```

---

## 🕒 Date Handling Standards

### dayjs Usage

```typescript
// Always use dayjs consistently
import dayjs from 'dayjs';

// Standard date formats
const DATE_FORMATS = {
  storage: 'YYYY-MM-DD',
  display: 'dddd, MMMM D, YYYY',
  short: 'MMM D',
} as const;

// Date calculations
const startOfWeek = dayjs().startOf('week').add(1, 'day'); // Monday
const weekRange = `${monday.format('MMM D')}-${sunday.format('MMM D, YYYY')}`;
```

### Activity Date Handling

- Use `dayjs(selectedDate).format('YYYY-MM-DD')` for storage
- Use `dayjs(date).format('dddd, MMMM D, YYYY')` for display

---

## 🧭 Navigation Patterns

### Screen Navigation

```typescript
// Consistent navigation prop typing
export default function ScreenName({ navigation, route }: any) {
  // Use navigation.navigate with proper params
  navigation.navigate('ScreenName', { param: value });

  // Use navigation.goBack() consistently
  const handleCancel = () => navigation.goBack();
}
```

### Tab Navigator Setup

```typescript
// Custom tab bar buttons with consistent styling
const CustomTabBarButton = ({ children, onPress, accessibilityState }: any) => {
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';
  const isFocused = accessibilityState?.selected;

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={14}
      style={{ /* consistent styling */ }}
      accessibilityState={accessibilityState}
    >
      {children}
      {isFocused && <ActiveIndicator />}
    </TouchableOpacity>
  );
};
```

---

## 🐛 Error Handling & Logging

### Consistent Error Handling

```typescript
// Consistent error handling in async functions
try {
  const result = await operation();
  console.log('Operation successful:', result);
  return result;
} catch (error) {
  console.error('Error in operation:', error);
  // Don't re-throw unless necessary
  return fallbackValue;
}
```

### Console Logging Patterns

```typescript
// Descriptive logging for debugging
console.log('Adding activity to Redux:', activity.name);
console.log('Generated 15 random activities for current week');
console.log('Week range: Jul 14 - Jul 20, 2025');
```

---

## 📱 Platform-Specific Patterns

### iOS vs Android Handling

```typescript
// iOS vs Android handling
if (Platform.OS === 'ios') {
  ActionSheetIOS.showActionSheetWithOptions(/* iOS specific */);
} else {
  Alert.alert(/* Android fallback */);
}

// Keyboard behavior
behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
display={Platform.OS === 'ios' ? 'spinner' : 'default'}
```

---

## 🔧 Development Patterns

### Dev Mode Integration

```typescript
// DEV_MODE flags for development features
const DEV_MODE_ENABLED = __DEV__; // or process.env.NODE_ENV === 'development'

// Dev buttons and functions
{DEV_MODE_ENABLED && <DevModeButton visible={true} />}
```

### Dependencies Used

- `@react-native-community/datetimepicker` for date selection
- `dayjs` for all date operations
- `@expo/vector-icons` for icons
- Redux Toolkit for state management
- Tailwind/NativeWind for styling
- AsyncStorage for persistence

---

## 📋 Implementation Checklist

When implementing new features:

- [ ] Follow existing component patterns
- [ ] Implement proper theme integration (dark/light mode)
- [ ] Add keyboard handling if forms are involved
- [ ] Use consistent header layout
- [ ] Implement proper error handling and validation
- [ ] Add appropriate TypeScript types
- [ ] Use dayjs for date operations
- [ ] Follow Redux patterns for state management
- [ ] Add proper storage functions if persistence is needed
- [ ] Include proper logging for debugging
- [ ] Add accessibility labels
- [ ] Test on both iOS and Android if platform-specific code is used
- [ ] Ensure consistent styling with existing components
- [ ] Follow navigation patterns
- [ ] Add hitSlop to touchable components

---

## 🚫 What NOT to Do

- **Never** make changes beyond what's explicitly specified
- **Never** regenerate entire files unless specifically instructed
- **Never** add features not mentioned in the requirements
- **Never** change existing UI patterns without explicit instruction
- **Never** create files unless absolutely necessary for the feature
- **Never** use different styling patterns than what exists
- **Never** implement different date handling than dayjs
- **Never** skip error handling in async operations
- **Never** forget to include theme context in new components
- **Never** omit TypeScript types for new interfaces

---

## 🚀 Implementation Process

**Next Step:** Parse this markdown file and implement the feature according to the instructions provided. Follow the patterns and standards outlined above to ensure consistency with the existing codebase.

**Key Implementation Steps:**

1. Read and understand the specific feature requirements
2. Identify which existing patterns apply to your feature
3. Follow the component architecture and styling standards
4. Implement proper error handling and logging
5. Test thoroughly on both platforms if applicable
6. Ensure all checklist items are completed

---

These patterns ensure **consistency**, **maintainability**, and **user experience quality** across the entire app. Always refer to existing implementations in the codebase when in doubt about how to structure new features.
