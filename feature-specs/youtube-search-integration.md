# YouTube Search Integration Feature

## Overview

Add YouTube search links for exercise names in AI Coach chat messages. Any word matching an exercise name from exercises.ts database becomes a clickable blue link that opens YouTube search for exercise tutorials.

## Implementation Steps

### Step 1: Create YouTube Utility Functions

Create `utils/youtube.ts`:

```typescript
import { Linking, Alert } from 'react-native';

export const generateYouTubeSearchQuery = (props: {
  searchTerm: string;
  searchType: 'routine' | 'exercise';
}) => {
  const { searchTerm, searchType } = props;

  if (searchType === 'routine') {
    return `${searchTerm} routine`;
  } else {
    return `${searchTerm} exercise tutorial`;
  }
};

export const openYouTubeSearch = async (searchQuery: string) => {
  try {
    const encodedQuery = encodeURIComponent(searchQuery);

    // Try YouTube app first
    const youtubeAppUrl = `youtube://www.youtube.com/results?search_query=${encodedQuery}`;
    const canOpenYouTube = await Linking.canOpenURL(youtubeAppUrl);

    if (canOpenYouTube) {
      await Linking.openURL(youtubeAppUrl);
    } else {
      // Fallback to browser
      const browserUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`;
      await Linking.openURL(browserUrl);
    }

    console.log('Opening YouTube search for:', searchQuery);
  } catch (error) {
    console.error('Error opening YouTube search:', error);
    Alert.alert('Error', 'Could not open YouTube search');
  }
};
```

### Step 2: Create WorkoutContentWithLinks Component

Create `components/WorkoutContentWithLinks.tsx`:

```typescript
import React from 'react';
import { View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { ACTIVITY_TYPES } from '../constants';
import { EXERCISE_DATABASE } from '../constants/exercises';
import {
  generateYouTubeSearchQuery,
  openYouTubeSearch,
} from '../utils/youtube';

interface WorkoutContentWithLinksProps {
  text: string;
  isDark: boolean;
}

export const WorkoutContentWithLinks = (props: WorkoutContentWithLinksProps) => {
  const { text, isDark } = props;

  // Extract exercise names for matching
  const exerciseNames = EXERCISE_DATABASE.map(exercise => exercise.name);
  const activityTypeLabels = ACTIVITY_TYPES.map(type => type.label);

  // Custom link handler for YouTube links
  const handleLinkPress = (url: string) => {
    // Check if this is an exercise name
    const isExercise = exerciseNames.some(name => name.toLowerCase() === url.toLowerCase());
    const isActivityType = activityTypeLabels.some(label => label.toLowerCase() === url.toLowerCase());

    if (isExercise || isActivityType) {
      const searchQuery = generateYouTubeSearchQuery({
        searchTerm: url,
        searchType: isActivityType ? 'routine' : 'exercise',
      });
      openYouTubeSearch(searchQuery);
      return false; // Prevent default link handling
    }
    return true; // Allow default handling for other links
  };

  // Preprocess text to convert exercise names into markdown links
  const preprocessText = (inputText: string): string => {
    let processedText = inputText;

    // Combined terms for linking (exercises + activity types)
    const allTerms = [...exerciseNames, ...activityTypeLabels];

    // Sort by length (longest first) to avoid partial matches
    const sortedTerms = allTerms.sort((a, b) => b.length - a.length);

    sortedTerms.forEach(term => {
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Handle backticks `Exercise`
      const backtickPattern = '`' + escapedTerm + '`';
      const backtickRegex = new RegExp(backtickPattern, 'gi');
      processedText = processedText.replace(backtickRegex, match => {
        const exerciseName = match.slice(1, -1);
        return `[${exerciseName}](${exerciseName})`;
      });

      // Handle bold **Exercise**
      const boldPattern = '\\*\\*' + escapedTerm + '\\*\\*';
      const boldRegex = new RegExp(boldPattern, 'gi');
      processedText = processedText.replace(boldRegex, match => {
        const exerciseName = match.slice(2, -2);
        return `**[${exerciseName}](${exerciseName})**`;
      });

      // Handle brackets [Exercise]
      const bracketPattern = '\\[' + escapedTerm + '\\]';
      const bracketRegex = new RegExp(bracketPattern, 'gi');
      processedText = processedText.replace(bracketRegex, match => {
        // Check if already a link
        const matchIndex = processedText.indexOf(match);
        const afterMatch = processedText.substring(matchIndex + match.length, matchIndex + match.length + 2);
        if (afterMatch === '](') {
          return match; // Already a link
        }
        const exerciseName = match.slice(1, -1);
        return `[${exerciseName}](${exerciseName})`;
      });

      // Handle plain text
      const plainPattern = '\\b' + escapedTerm + '\\b';
      const plainRegex = new RegExp(plainPattern, 'gi');
      processedText = processedText.replace(plainRegex, match => {
        // Check if inside existing formatting
        const matchIndex = processedText.indexOf(match);
        const before = processedText.substring(Math.max(0, matchIndex - 3), matchIndex);
        const after = processedText.substring(matchIndex + match.length, matchIndex + match.length + 3);

        if (before.includes('[') || before.includes('`') || before.includes('**') ||
            after.includes('](') || after.includes('`') || after.includes('**')) {
          return match;
        }

        return `[${match}](${match})`;
      });
    });

    return processedText;
  };

  const markdownStyles = {
    body: {
      color: isDark ? '#fff' : '#111',
      fontSize: 16,
      lineHeight: 22,
    },
    heading1: {
      color: isDark ? '#fff' : '#111',
      fontSize: 20,
      fontWeight: 'bold' as const,
      marginTop: 8,
      marginBottom: 4,
    },
    heading2: {
      color: isDark ? '#fff' : '#111',
      fontSize: 18,
      fontWeight: 'bold' as const,
      marginTop: 6,
      marginBottom: 3,
    },
    heading3: {
      color: isDark ? '#fff' : '#111',
      fontSize: 16,
      fontWeight: 'bold' as const,
      marginTop: 4,
      marginBottom: 2,
    },
    paragraph: {
      color: isDark ? '#fff' : '#111',
      fontSize: 16,
      lineHeight: 22,
      marginBottom: 8,
    },
    list_item: {
      color: isDark ? '#fff' : '#111',
      fontSize: 16,
      lineHeight: 22,
      marginBottom: 4,
    },
    bullet_list: {
      marginBottom: 8,
    },
    ordered_list: {
      marginBottom: 8,
    },
    code_inline: {
      backgroundColor: isDark ? '#333' : '#f0f0f0',
      color: isDark ? '#00ff00' : '#d63384',
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 3,
      fontFamily: 'monospace',
    },
    code_block: {
      backgroundColor: isDark ? '#333' : '#f0f0f0',
      color: isDark ? '#00ff00' : '#d63384',
      padding: 12,
      borderRadius: 6,
      fontFamily: 'monospace',
      marginVertical: 8,
    },
    blockquote: {
      borderLeftWidth: 4,
      borderLeftColor: isDark ? '#3b82f6' : '#3b82f6',
      paddingLeft: 12,
      marginVertical: 8,
      backgroundColor: isDark ? '#1a1a1a' : '#f8f9fa',
      paddingVertical: 8,
      paddingRight: 8,
    },
    strong: {
      fontWeight: 'bold' as const,
      color: isDark ? '#fff' : '#111',
    },
    em: {
      fontStyle: 'italic' as const,
      color: isDark ? '#fff' : '#111',
    },
    link: {
      color: isDark ? '#3b82f6' : '#2563eb',
      textDecorationLine: 'underline' as const,
    },
  };

  return (
    <View>
      <Markdown style={markdownStyles} onLinkPress={handleLinkPress}>
        {preprocessText(text)}
      </Markdown>
    </View>
  );
};
```

### Step 3: Update CoachScreen to Use New Component

In `screens/CoachScreen.tsx`, find the AI message rendering section and replace the existing markdown component with `WorkoutContentWithLinks`:

1. Add import at top:

```typescript
import { WorkoutContentWithLinks } from '../components/WorkoutContentWithLinks';
```

2. Find the AI message rendering (around line 60-70) and replace:

```typescript
// OLD: Direct Markdown component
<Markdown style={markdownStyles}>{aiMessage.text}</Markdown>

// NEW: WorkoutContentWithLinks component
<WorkoutContentWithLinks text={aiMessage.text} isDark={isDark} />
```

3. Remove the old markdownStyles definition since it's now handled in WorkoutContentWithLinks

## Expected Behavior

- Exercise names in AI chat responses become blue underlined links
- Clicking a link opens YouTube search for "[Exercise Name] exercise tutorial"
- Activity types link to "[Activity] routine" searches
- Supports exercises in various formats: plain text, **bold**, `backticks`, [brackets]
- Links open in YouTube app if installed, otherwise browser
- All existing markdown formatting (headers, lists, quotes) preserved

## Testing

Test with AI prompts like:

- "Show me a leg workout" (should link Squat, Deadlift, etc.)
- "How to do a Push-Up?" (should link Push-Up)
- "Design a pull workout" (should link Pull-Up, Bent Over Row, etc.)

Click links to verify YouTube searches open correctly.
