import React from 'react';
import { View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { getActivityTypes } from '../services/activityTypeService';
import { getExerciseNames } from '../services/exerciseService';
import { useTheme } from '../theme/ThemeContext';
import {
  generateYouTubeSearchQuery,
  openYouTubeSearch,
} from '../utils/youtube';

interface WorkoutContentWithLinksProps {
  text: string;
  isDark?: boolean; // Kept for backward compatibility but not used
}

export const WorkoutContentWithLinks = (
  props: WorkoutContentWithLinksProps
) => {
  const { text } = props;
  const { colors } = useTheme();

  // Extract exercise names for matching
  const exerciseNames = getExerciseNames();
  const activityTypeLabels = getActivityTypes().map(type => type.label);

  // Custom link handler for YouTube links
  const handleLinkPress = (url: string) => {
    // Check if this is an exercise name
    const isExercise = exerciseNames.some(
      name => name.toLowerCase() === url.toLowerCase()
    );
    const isActivityType = activityTypeLabels.some(
      label => label.toLowerCase() === url.toLowerCase()
    );

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

    // Track which terms have already been processed to avoid duplicates
    const processedTerms = new Set<string>();

    sortedTerms.forEach(term => {
      const termLower = term.toLowerCase();

      // Skip if this term was already processed
      if (processedTerms.has(termLower)) {
        return;
      }

      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let hasMatches = false;

      // Handle backticks `Exercise` - only first occurrence
      const backtickPattern = '`' + escapedTerm + '`';
      const backtickRegex = new RegExp(backtickPattern, 'i'); // Remove 'g' flag for single match
      if (backtickRegex.test(processedText)) {
        processedText = processedText.replace(backtickRegex, match => {
          const exerciseName = match.slice(1, -1);
          hasMatches = true;
          return `[${exerciseName}](${exerciseName})`;
        });
      }

      // Handle bold **Exercise** - only first occurrence
      if (!hasMatches) {
        const boldPattern = '\\*\\*' + escapedTerm + '\\*\\*';
        const boldRegex = new RegExp(boldPattern, 'i'); // Remove 'g' flag for single match
        if (boldRegex.test(processedText)) {
          processedText = processedText.replace(boldRegex, match => {
            const exerciseName = match.slice(2, -2);
            hasMatches = true;
            return `**[${exerciseName}](${exerciseName})**`;
          });
        }
      }

      // Handle brackets [Exercise] - only first occurrence
      if (!hasMatches) {
        const bracketPattern = '\\[' + escapedTerm + '\\](?!\\()'; // Negative lookahead to avoid existing links
        const bracketRegex = new RegExp(bracketPattern, 'i'); // Remove 'g' flag for single match
        if (bracketRegex.test(processedText)) {
          processedText = processedText.replace(bracketRegex, match => {
            const exerciseName = match.slice(1, -1);
            hasMatches = true;
            return `[${exerciseName}](${exerciseName})`;
          });
        }
      }

      // Handle plain text - only first occurrence
      if (!hasMatches) {
        const plainPattern = '\\b' + escapedTerm + '\\b(?![\\]\\)])'; // Negative lookahead to avoid existing links
        const plainRegex = new RegExp(plainPattern, 'i'); // Remove 'g' flag for single match
        if (plainRegex.test(processedText)) {
          processedText = processedText.replace(plainRegex, match => {
            // Double-check we're not inside a link
            const beforeMatch = processedText.substring(
              0,
              processedText.indexOf(match)
            );
            const lastOpenBracket = beforeMatch.lastIndexOf('[');
            const lastCloseBracket = beforeMatch.lastIndexOf(']');

            // If we're inside unclosed brackets, skip
            if (lastOpenBracket > lastCloseBracket) {
              return match;
            }

            hasMatches = true;
            return `[${match}](${match})`;
          });
        }
      }

      // Mark this term as processed if we found matches
      if (hasMatches) {
        processedTerms.add(termLower);
      }
    });

    return processedText;
  };

  const markdownStyles = {
    body: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 22,
    },
    heading1: {
      color: colors.text,
      fontSize: 20,
      fontWeight: 'bold' as const,
      marginTop: 8,
      marginBottom: 4,
    },
    heading2: {
      color: colors.text,
      fontSize: 18,
      fontWeight: 'bold' as const,
      marginTop: 6,
      marginBottom: 3,
    },
    heading3: {
      color: colors.text,
      fontSize: 16,
      fontWeight: 'bold' as const,
      marginTop: 4,
      marginBottom: 2,
    },
    paragraph: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 22,
      marginBottom: 8,
    },
    list_item: {
      color: colors.text,
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
      backgroundColor: colors.backgroundTertiary,
      color: colors.primary.main,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 3,
      fontFamily: 'monospace',
    },
    code_block: {
      backgroundColor: colors.backgroundTertiary,
      color: colors.primary.main,
      padding: 12,
      borderRadius: 6,
      fontFamily: 'monospace',
      marginVertical: 8,
    },
    blockquote: {
      borderLeftWidth: 4,
      borderLeftColor: colors.primary.main,
      paddingLeft: 12,
      marginVertical: 8,
      backgroundColor: colors.backgroundSecondary,
      paddingVertical: 8,
      paddingRight: 8,
    },
    strong: {
      fontWeight: 'bold' as const,
      color: colors.text,
    },
    em: {
      fontStyle: 'italic' as const,
      color: colors.text,
    },
    link: {
      color: colors.primary.main,
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
