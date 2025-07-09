import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import OpenAI from 'openai';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AppHeader, { AppHeaderTitle } from '../components/AppHeader';
import { OPENAI_CONFIG } from '../config/api';
import { ACTIVITY_EMOJIS, ACTIVITY_TYPES } from '../constants';
import {
  EXERCISE_DATABASE,
  ExerciseCategory,
  ExerciseDefinition,
  findExerciseByName,
  MuscleGroup,
  searchExercises,
} from '../constants/exercises';
import { addActivity } from '../redux/activitySlice';
import { RootState } from '../redux/store';
import { ThemeContext } from '../theme/ThemeContext';
import { Activity, ActivityType } from '../types/activity';
import { addCustomExercise, toTitleCase } from '../utils/storage';

const GLOW_COLOR_LIGHT = '#3b82f6';
const GLOW_COLOR_DARK = '#2563eb';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const openai = new OpenAI(OPENAI_CONFIG);

interface ChatSession {
  id: string;
  title: string;
  messages: any[];
  timestamp: Date;
}

export default function CoachScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [messages, setMessages] = useState([
    {
      id: '1',
      type: 'bot',
      text: "Hi! I'm your AI fitness coach powered by ChatGPT. I can help you create workout plans, suggest exercises, and provide motivation. What are your fitness goals?",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  // Add ref for ScrollView, last bot message, and last user message
  const scrollViewRef = useRef<ScrollView>(null);
  const lastBotMessageRef = useRef<View>(null);
  const lastUserMessageRef = useRef<View>(null);
  const [lastUserMessageY, setLastUserMessageY] = useState<number | null>(null);

  const dispatch = useDispatch();
  const activities = useSelector((state: RootState) => state.activities.data);
  const { colorScheme } = useContext(ThemeContext);
  const isDark = colorScheme === 'dark';

  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      glowAnim.stopAnimation();
      glowAnim.setValue(0);
    }
  }, [isProcessing]);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
    // Create a new session ID for current chat
    setCurrentSessionId(Date.now().toString());
  }, []);

  // Auto-scroll when messages change or processing state changes
  useEffect(() => {
    if (scrollViewRef.current && (messages.length > 0 || isProcessing)) {
      setTimeout(
        () => {
          const lastMessage = messages[messages.length - 1];
          const secondLastMessage = messages[messages.length - 2];
          if (
            lastMessage &&
            lastMessage.type === 'bot' &&
            lastUserMessageY !== null &&
            secondLastMessage &&
            secondLastMessage.type === 'user'
          ) {
            scrollViewRef.current?.scrollTo({
              y: lastUserMessageY - 8,
              animated: true,
            }); // 8px padding
          } else {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }
        },
        isProcessing ? 100 : 350
      );
    }
  }, [messages, isProcessing, lastUserMessageY]);

  // Immediate scroll when processing starts
  useEffect(() => {
    if (isProcessing && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [isProcessing]);

  // Scroll to bottom when keyboard dismisses
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        if (scrollViewRef.current && messages.length > 0) {
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    );

    return () => {
      keyboardDidHideListener?.remove();
    };
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('chat_history');
      if (history) {
        setChatHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const saveChatHistory = async (newHistory: ChatSession[]) => {
    try {
      await AsyncStorage.setItem('chat_history', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  const saveCurrentSession = async () => {
    if (messages.length <= 1) return; // Don't save if only initial message

    const sessionTitle =
      messages[1]?.text?.substring(0, 50) + '...' || 'Chat Session';

    const newSession: ChatSession = {
      id: currentSessionId,
      title: sessionTitle,
      messages: messages,
      timestamp: new Date(),
    };

    const updatedHistory = [
      newSession,
      ...chatHistory.filter(s => s.id !== currentSessionId),
    ];
    setChatHistory(updatedHistory);
    await saveChatHistory(updatedHistory);
  };

  const loadSession = async (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setActiveTab('chat');
  };

  const deleteSession = async (sessionId: string) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedHistory = chatHistory.filter(s => s.id !== sessionId);
            setChatHistory(updatedHistory);
            await saveChatHistory(updatedHistory);
          },
        },
      ]
    );
  };

  // Parse workout creation requests from ChatGPT response
  const parseActivityFromResponse = async (
    response: string,
    userInput: string
  ): Promise<any[]> => {
    console.log('Parsing workout from response:', response);
    console.log('User input:', userInput);

    const workoutRequests = [];

    // Look for workout creation patterns in the response
    const workoutPatterns = [
      /(?:I've scheduled|I've created|I've added|Scheduled|Created|Added)\s+(.+?)\s+(?:for|on)\s+(.+?)(?:\n|\.|$)/gi,
      /(?:Workout|Exercise):\s*(.+?)\s+(?:on|for)\s+(.+?)(?:\n|\.|$)/gi,
      /(?:Recurring|Weekly|Every week):\s*(.+?)\s+(?:on|for)\s+(.+?)(?:\n|\.|$)/gi,
      /(?:I'll add|I'll schedule|I'll create)\s+(.+?)\s+(?:for|on)\s+(.+?)(?:\n|\.|$)/gi,
      /(?:Adding|Scheduling|Creating)\s+(.+?)\s+(?:for|on)\s+(.+?)(?:\n|\.|$)/gi,
    ];

    // Helper function to clean exercise names
    const cleanExerciseName = (name: string): string => {
      let cleaned = name.trim();
      // Remove all known verbose AI phrases
      cleaned = cleaned.replace(/A New Exercise To Your Library:?/gi, '');
      cleaned = cleaned.replace(/This Will Be Categorized As [^\.]+\./gi, '');
      cleaned = cleaned.replace(/I've Scheduled/gi, '');
      cleaned = cleaned.replace(/To Your Personal Exercise Library/gi, '');
      cleaned = cleaned.replace(/Scheduled It/gi, '');
      cleaned = cleaned.replace(/Added To Your Library/gi, '');
      cleaned = cleaned.replace(
        /\s+for\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i,
        ''
      );
      cleaned = cleaned.replace(
        /\s+on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i,
        ''
      );
      cleaned = cleaned.replace(/\.+$/, ''); // Remove trailing periods and text
      return cleaned.trim();
    };

    for (const pattern of workoutPatterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const exercises = cleanExerciseName(match[1]);
        const dateText = match[2].trim();

        // Parse exercises - handle compound names better
        // Only split on commas and "and" as separators, not on spaces within exercise names
        let exerciseList = exercises
          .split(/,\s*|\s+and\s+/)
          .map(e =>
            cleanExerciseName(e)
              .replace(/^and\s+/i, '')
              .trim()
          )
          .filter(e => e.length > 0);

        // Remove leading 'And ' if present in the first exercise (fix for AI output)
        if (
          exerciseList.length > 0 &&
          exerciseList[0].toLowerCase().startsWith('and ')
        ) {
          exerciseList[0] = exerciseList[0].slice(4).trim();
        }

        // Fix common AI parsing issues with compound exercises
        const fixedExercises = [];
        for (let i = 0; i < exerciseList.length; i++) {
          const current = exerciseList[i];
          const next = exerciseList[i + 1];

          // Check for split compound exercises
          if (current === 'overhe' && next === 'presses') {
            fixedExercises.push('overhead presses');
            i++; // Skip next item
          } else if (current === 'bench' && next === 'press') {
            fixedExercises.push('bench press');
            i++; // Skip next item
          } else if (current === 'dead' && next === 'lift') {
            fixedExercises.push('deadlift');
            i++; // Skip next item
          } else if (current === 'push' && next === 'ups') {
            fixedExercises.push('push-ups');
            i++; // Skip next item
          } else if (current === 'pull' && next === 'ups') {
            fixedExercises.push('pull-ups');
            i++; // Skip next item
          } else if (current === 'sit' && next === 'ups') {
            fixedExercises.push('sit-ups');
            i++; // Skip next item
          } else {
            fixedExercises.push(current);
          }
        }

        exerciseList = fixedExercises;

        // Try to match exercises against the comprehensive exercise database
        const matchedExercises = [];
        for (const exercise of exerciseList) {
          // First try exact match using the database function
          const exactMatch = findExerciseByName(exercise);

          if (exactMatch) {
            matchedExercises.push(exactMatch.name); // Use the Title Case version from database
          } else {
            // Try search function for partial matches
            const searchResults = searchExercises(exercise);

            if (searchResults.length > 0) {
              // Use the first (best) match
              matchedExercises.push(searchResults[0].name);
            } else {
              // If no match found, add it as a custom exercise
              const exerciseName = toTitleCase(exercise);
              const newExercise: ExerciseDefinition = {
                name: exerciseName,
                type: determineActivityType([exerciseName]),
                category: 'Compound' as ExerciseCategory,
                muscleGroups: ['Full Body' as MuscleGroup],
                equipment: [],
                difficulty: 'Beginner',
                description: '',
                variations: [],
              };
              try {
                await addCustomExercise(newExercise);
                console.log(`Added new exercise: ${exerciseName}`);
              } catch (error) {
                console.error('Error adding custom exercise:', error);
              }
              matchedExercises.push(exerciseName);
            }
          }
        }

        exerciseList = matchedExercises;

        // Remove duplicates while preserving order
        const uniqueExercises = [];
        const seen = new Set();
        for (const exercise of exerciseList) {
          if (!seen.has(exercise.toLowerCase())) {
            seen.add(exercise.toLowerCase());
            uniqueExercises.push(exercise);
          }
        }
        exerciseList = uniqueExercises;

        console.log('Parsed exercises:', exerciseList);

        // Parse date and recurrence
        let targetDate = dayjs();
        let isRecurring = false;
        let weeksToRepeat = 4; // Default to 4 weeks
        const lowerDateText = dateText.toLowerCase();

        if (
          lowerDateText.includes('recurring') ||
          lowerDateText.includes('weekly') ||
          lowerDateText.includes('every week')
        ) {
          isRecurring = true;
        }

        if (lowerDateText.includes('tomorrow')) {
          targetDate = targetDate.add(1, 'day');
        } else if (lowerDateText.includes('today')) {
          // Keep today
        } else if (
          lowerDateText.includes('next week') ||
          lowerDateText.includes('next')
        ) {
          // Handle "next Monday", "next Tuesday", etc.
          const dayMatch = lowerDateText.match(
            /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
          );
          if (dayMatch) {
            const dayName = dayMatch[1];
            const dayIndex = [
              'sunday',
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
              'saturday',
            ].indexOf(dayName);
            if (dayIndex !== -1) {
              const currentDay = targetDate.day();
              const daysToAdd = (dayIndex - currentDay + 7) % 7;
              targetDate = targetDate.add(daysToAdd + 7, 'day'); // Add 7 more days for "next week"
            }
          }
        } else {
          // Try to parse day names
          const dayIndex = [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          ].indexOf(lowerDateText);
          if (dayIndex !== -1) {
            const currentDay = targetDate.day();
            const daysToAdd = (dayIndex - currentDay + 7) % 7;
            targetDate = targetDate.add(daysToAdd, 'day');
          }
        }

        // Check for duration in the response
        const durationMatch = response.match(
          /(?:for|repeat|duration)\s+(\d+)\s+(?:weeks?|months?)/i
        );
        if (durationMatch) {
          weeksToRepeat = parseInt(durationMatch[1]);
          if (response.toLowerCase().includes('month')) {
            weeksToRepeat *= 4;
          }
        }

        workoutRequests.push({
          date: targetDate.format('YYYY-MM-DD'),
          exercises: exerciseList,
          type: determineActivityType(exerciseList),
          isRecurring,
          weeksToRepeat,
        });
      }
    }

    // If no patterns found, try to extract from user input context with better compound exercise handling
    if (workoutRequests.length === 0) {
      const userInputLower = userInput.toLowerCase();

      // Define compound exercise patterns to look for first
      const compoundExercises = [
        'overhead press',
        'overhead presses',
        'bench press',
        'bench presses',
        'dead lift',
        'deadlift',
        'deadlifts',
        'push up',
        'push-up',
        'push ups',
        'push-ups',
        'pull up',
        'pull-up',
        'pull ups',
        'pull-ups',
        'sit up',
        'sit-up',
        'sit ups',
        'sit-ups',
        'chin up',
        'chin-up',
        'chin ups',
        'chin-ups',
        'dip',
        'dips',
        'squat',
        'squats',
        'lunge',
        'lunges',
        'curl',
        'curls',
        'row',
        'rows',
        'cardio',
        'yoga',
        'run',
        'running',
        'bike',
        'cycling',
        'swim',
        'swimming',
        'face pulls',
        'cable face pulls',
        'lateral raises',
        'dumbbell lateral raises',
      ];

      const dayKeywords = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
        'today',
        'tomorrow',
        'next monday',
        'next tuesday',
        'next wednesday',
        'next thursday',
        'next friday',
        'next saturday',
        'next sunday',
      ];

      // Find compound exercises first
      const foundCompoundExercises = compoundExercises.filter(ex =>
        userInputLower.includes(ex)
      );

      // If no compound exercises found, fall back to individual keywords
      const foundExercises =
        foundCompoundExercises.length > 0
          ? foundCompoundExercises
          : [
              'curl',
              'deadlift',
              'squat',
              'bench',
              'press',
              'cardio',
              'yoga',
              'run',
              'bike',
              'swim',
              'push-up',
              'pull-up',
            ].filter(ex => userInputLower.includes(ex));

      const foundDays = dayKeywords.filter(day => userInputLower.includes(day));

      if (foundExercises.length > 0 && foundDays.length > 0) {
        let targetDate = dayjs();
        const dayText = foundDays[0];

        if (dayText === 'tomorrow') {
          targetDate = targetDate.add(1, 'day');
        } else if (dayText.includes('next')) {
          // Handle "next Monday", "next Tuesday", etc.
          const dayMatch = dayText.match(
            /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
          );
          if (dayMatch) {
            const dayName = dayMatch[1];
            const dayIndex = [
              'sunday',
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
              'saturday',
            ].indexOf(dayName);
            if (dayIndex !== -1) {
              const currentDay = targetDate.day();
              const daysToAdd = (dayIndex - currentDay + 7) % 7;
              targetDate = targetDate.add(daysToAdd + 7, 'day'); // Add 7 more days for "next week"
            }
          }
        } else if (dayText !== 'today') {
          const dayIndex = [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          ].indexOf(dayText);
          if (dayIndex !== -1) {
            const currentDay = targetDate.day();
            const daysToAdd = (dayIndex - currentDay + 7) % 7;
            targetDate = targetDate.add(daysToAdd, 'day');
          }
        }

        workoutRequests.push({
          date: targetDate.format('YYYY-MM-DD'),
          exercises: foundExercises.map(toTitleCase),
          type: determineActivityType(foundExercises.map(toTitleCase)),
          isRecurring: false,
          weeksToRepeat: 1,
        });
      }
    }

    // If still no patterns found, try to extract exercise names from verbose AI responses
    if (workoutRequests.length === 0) {
      // Look for exercise names in quotes or after "scheduled"
      const exercisePatterns = [
        /"([^"]+)"\s+(?:for|on)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|next\s+monday|next\s+tuesday|next\s+wednesday|next\s+thursday|next\s+friday|next\s+saturday|next\s+sunday)/gi,
        /scheduled\s+([^,\n.]+?)\s+(?:for|on)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|next\s+monday|next\s+tuesday|next\s+wednesday|next\s+thursday|next\s+friday|next\s+saturday|next\s+sunday)/gi,
        /added\s+([^,\n.]+?)\s+(?:for|on)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|next\s+monday|next\s+tuesday|next\s+wednesday|next\s+thursday|next\s+friday|next\s+saturday|next\s+sunday)/gi,
      ];

      for (const pattern of exercisePatterns) {
        let match;
        while ((match = pattern.exec(response)) !== null) {
          const exerciseName = cleanExerciseName(match[1]);
          const dayText = match[2].toLowerCase();

          if (exerciseName && exerciseName.length > 0) {
            let targetDate = dayjs();

            if (dayText === 'tomorrow') {
              targetDate = targetDate.add(1, 'day');
            } else if (dayText.includes('next')) {
              // Handle "next Monday", "next Tuesday", etc.
              const dayMatch = dayText.match(
                /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
              );
              if (dayMatch) {
                const dayName = dayMatch[1];
                const dayIndex = [
                  'sunday',
                  'monday',
                  'tuesday',
                  'wednesday',
                  'thursday',
                  'friday',
                  'saturday',
                ].indexOf(dayName);
                if (dayIndex !== -1) {
                  const currentDay = targetDate.day();
                  const daysToAdd = (dayIndex - currentDay + 7) % 7;
                  targetDate = targetDate.add(daysToAdd + 7, 'day'); // Add 7 more days for "next week"
                }
              }
            } else if (dayText !== 'today') {
              const dayIndex = [
                'sunday',
                'monday',
                'tuesday',
                'wednesday',
                'thursday',
                'friday',
                'saturday',
              ].indexOf(dayText);
              if (dayIndex !== -1) {
                const currentDay = targetDate.day();
                const daysToAdd = (dayIndex - currentDay + 7) % 7;
                targetDate = targetDate.add(daysToAdd, 'day');
              }
            }

            workoutRequests.push({
              date: targetDate.format('YYYY-MM-DD'),
              exercises: [exerciseName],
              type: determineActivityType([exerciseName]),
              isRecurring: false,
              weeksToRepeat: 1,
            });
          }
        }
      }
    }

    // Final fallback: if AI response is too verbose, extract from user input
    if (workoutRequests.length === 0) {
      console.log(
        'No workout patterns found in AI response, trying fallback parsing'
      );

      // First, try to extract from verbose AI response
      const responseLower = response.toLowerCase();

      // Look for verbose patterns in AI response
      const verbosePatterns = [
        /(.+?)\s+to\s+your\s+personal\s+(?:exercise\s+)?library/i,
        /(.+?)\s+scheduled\s+it/i,
        /(.+?)\s+the\s+new\s+exercise/i,
        /(.+?)\s+exercise\s+to\s+your\s+personal\s+library/i,
        /(.+?)\s+personal\s+exercise\s+library/i,
        /(.+?)\s+to\s+your\s+personal\s+exercise\s+library\.\s+scheduled\s+it/i,
        /(.+?)\s+personal\s+exercise\s+library\.\s+scheduled\s+it/i,
      ];

      let extractedExercise = null;
      for (const pattern of verbosePatterns) {
        const match = response.match(pattern);
        if (match) {
          extractedExercise = cleanExerciseName(match[1]);
          console.log(
            `Fallback: Extracted exercise "${extractedExercise}" from verbose AI response`
          );
          break;
        }
      }

      // If no exercise found in AI response, try user input
      if (!extractedExercise) {
        const userInputLower = userInput.toLowerCase();
        const addPatterns = [
          /add\s+(.+?)\s+to\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i,
          /add\s+(.+?)\s+for\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i,
          /add\s+(.+?)\s+on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i,
          /add\s+(.+?)\s+to\s+this\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
          /add\s+(.+?)\s+for\s+this\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
          /add\s+(.+?)\s+on\s+this\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
        ];

        for (const pattern of addPatterns) {
          const match = userInput.match(pattern);
          if (match) {
            // Clean the exercise name more aggressively to handle extra context
            let exerciseName = match[1].trim();

            // Remove common extra context like sets, reps, weights, etc.
            exerciseName = exerciseName.replace(
              /\s*,\s*\d+\s*sets?\s*(?:of\s*\d+\s*reps?)?/i,
              ''
            );
            exerciseName = exerciseName.replace(
              /\s*\d+\s*sets?\s*(?:of\s*\d+\s*reps?)?/i,
              ''
            );
            exerciseName = exerciseName.replace(
              /\s*at\s*\d+(?:\.\d+)?\s*(?:lbs?|kg)/i,
              ''
            );
            exerciseName = exerciseName.replace(
              /\s*\d+(?:\.\d+)?\s*(?:lbs?|kg)/i,
              ''
            );
            exerciseName = exerciseName.replace(
              /\s*for\s*\d+\s*(?:minutes?|mins?)/i,
              ''
            );
            exerciseName = exerciseName.replace(
              /\s*\d+\s*(?:minutes?|mins?)/i,
              ''
            );

            // Clean up any remaining punctuation and extra words
            exerciseName = cleanExerciseName(exerciseName);

            extractedExercise = exerciseName;
            const dayText = match[2].toLowerCase();

            if (exerciseName && exerciseName.length > 0) {
              let targetDate = dayjs();

              if (dayText === 'tomorrow') {
                targetDate = targetDate.add(1, 'day');
              } else if (dayText !== 'today') {
                const dayIndex = [
                  'sunday',
                  'monday',
                  'tuesday',
                  'wednesday',
                  'thursday',
                  'friday',
                  'saturday',
                ].indexOf(dayText);
                if (dayIndex !== -1) {
                  const currentDay = targetDate.day();
                  const daysToAdd = (dayIndex - currentDay + 7) % 7;
                  targetDate = targetDate.add(daysToAdd, 'day');
                }
              }

              console.log(
                `Fallback: Extracted exercise "${exerciseName}" for ${dayText} from user input`
              );

              workoutRequests.push({
                date: targetDate.format('YYYY-MM-DD'),
                exercises: [exerciseName],
                type: determineActivityType([exerciseName]),
                isRecurring: false,
                weeksToRepeat: 1,
              });
              break;
            }
          }
        }
      }

      // If we found an exercise from verbose AI response but no date, try to extract date from user input
      if (extractedExercise && workoutRequests.length === 0) {
        const userInputLower = userInput.toLowerCase();
        const dayPattern =
          /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i;
        const dayMatch = userInput.match(dayPattern);

        if (dayMatch) {
          const dayText = dayMatch[1].toLowerCase();
          let targetDate = dayjs();

          if (dayText === 'tomorrow') {
            targetDate = targetDate.add(1, 'day');
          } else if (dayText !== 'today') {
            const dayIndex = [
              'sunday',
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
              'saturday',
            ].indexOf(dayText);
            if (dayIndex !== -1) {
              const currentDay = targetDate.day();
              const daysToAdd = (dayIndex - currentDay + 7) % 7;
              targetDate = targetDate.add(daysToAdd, 'day');
            }
          }

          console.log(
            `Fallback: Using extracted exercise "${extractedExercise}" with day "${dayText}" from user input`
          );

          workoutRequests.push({
            date: targetDate.format('YYYY-MM-DD'),
            exercises: [extractedExercise],
            type: determineActivityType([extractedExercise]),
            isRecurring: false,
            weeksToRepeat: 1,
          });
        }
      }

      // Final emergency fallback: if we still have no workout requests, force extract from user input
      if (workoutRequests.length === 0) {
        console.log('Emergency fallback: forcing extraction from user input');

        // Extract any exercise-like words from user input
        const userInputLower = userInput.toLowerCase();
        const exerciseKeywords = [
          'paddle',
          'surf',
          'windsurf',
          'tennis',
          'basketball',
          'soccer',
          'football',
          'volleyball',
          'baseball',
          'hockey',
          'golf',
          'rock',
          'climb',
          'hike',
          'ski',
          'snowboard',
          'skate',
          'dance',
          'martial',
          'boxing',
          'kickbox',
          'crossfit',
          'hiit',
          'run',
          'bike',
          'swim',
          'yoga',
          'stretch',
          'mobility',
          'pilates',
          'meditation',
          'push',
          'pull',
          'sit',
          'plank',
          'burpee',
          'mountain',
          'jumping',
          'dip',
          'deadlift',
          'squat',
          'bench',
          'press',
          'curl',
          'extension',
          'row',
          'pulldown',
          'fly',
          'lunge',
          'shoulder',
          'overhead',
          'face',
          'pulls',
          'cable',
          'lateral',
          'raises',
          'dumbbell',
          'cardio',
          'elliptical',
          'treadmill',
          'jog',
          'walk',
          'stroll',
          'sauna',
          'steam',
          'massage',
        ];

        let foundExercise = null;
        for (const keyword of exerciseKeywords) {
          if (userInputLower.includes(keyword)) {
            // Find the full exercise name by looking for the word and surrounding context
            const regex = new RegExp(`\\b\\w*${keyword}\\w*\\b`, 'i');
            const match = userInput.match(regex);
            if (match) {
              foundExercise = cleanExerciseName(match[0]);
              break;
            }
          }
        }

        if (foundExercise) {
          // Extract day from user input
          const dayPattern =
            /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i;
          const dayMatch = userInput.match(dayPattern);

          if (dayMatch) {
            const dayText = dayMatch[1].toLowerCase();
            let targetDate = dayjs();

            if (dayText === 'tomorrow') {
              targetDate = targetDate.add(1, 'day');
            } else if (dayText !== 'today') {
              const dayIndex = [
                'sunday',
                'monday',
                'tuesday',
                'wednesday',
                'thursday',
                'friday',
                'saturday',
              ].indexOf(dayText);
              if (dayIndex !== -1) {
                const currentDay = targetDate.day();
                const daysToAdd = (dayIndex - currentDay + 7) % 7;
                targetDate = targetDate.add(daysToAdd, 'day');
              }
            }

            console.log(
              `Emergency fallback: Created workout for "${foundExercise}" on ${dayText}`
            );

            workoutRequests.push({
              date: targetDate.format('YYYY-MM-DD'),
              exercises: [foundExercise],
              type: determineActivityType([foundExercise]),
              isRecurring: false,
              weeksToRepeat: 1,
            });
          }
        }
      }
    }

    return workoutRequests;
  };

  const determineActivityType = (exercises: string[]): ActivityType => {
    const exerciseStr = exercises.join(' ').toLowerCase();

    // Weight Training - compound movements, lifts, presses
    if (
      exerciseStr.includes('deadlift') ||
      exerciseStr.includes('squat') ||
      exerciseStr.includes('bench') ||
      exerciseStr.includes('press') ||
      exerciseStr.includes('curl') ||
      exerciseStr.includes('extension') ||
      exerciseStr.includes('row') ||
      exerciseStr.includes('pulldown') ||
      exerciseStr.includes('fly') ||
      exerciseStr.includes('lunge') ||
      exerciseStr.includes('shoulder press') ||
      exerciseStr.includes('overhead press')
    ) {
      return 'weight-training';
    }

    // Cardio - running, cycling, swimming, rowing
    if (
      exerciseStr.includes('run') ||
      exerciseStr.includes('cardio') ||
      exerciseStr.includes('bike') ||
      exerciseStr.includes('cycling') ||
      exerciseStr.includes('swim') ||
      exerciseStr.includes('rowing') ||
      exerciseStr.includes('elliptical') ||
      exerciseStr.includes('treadmill') ||
      exerciseStr.includes('jog')
    ) {
      return 'cardio';
    }

    // Sports & Outdoor Activities
    if (
      exerciseStr.includes('paddle') ||
      exerciseStr.includes('surf') ||
      exerciseStr.includes('tennis') ||
      exerciseStr.includes('basketball') ||
      exerciseStr.includes('soccer') ||
      exerciseStr.includes('football') ||
      exerciseStr.includes('volleyball') ||
      exerciseStr.includes('baseball') ||
      exerciseStr.includes('hockey') ||
      exerciseStr.includes('golf') ||
      exerciseStr.includes('rock climb') ||
      exerciseStr.includes('hike') ||
      exerciseStr.includes('ski') ||
      exerciseStr.includes('snowboard') ||
      exerciseStr.includes('skate') ||
      exerciseStr.includes('dance') ||
      exerciseStr.includes('martial') ||
      exerciseStr.includes('boxing') ||
      exerciseStr.includes('kickbox') ||
      exerciseStr.includes('crossfit') ||
      exerciseStr.includes('hiit')
    ) {
      return 'sports';
    }

    // Yoga & Mobility
    if (
      exerciseStr.includes('yoga') ||
      exerciseStr.includes('stretch') ||
      exerciseStr.includes('mobility') ||
      exerciseStr.includes('pilates') ||
      exerciseStr.includes('meditation') ||
      exerciseStr.includes('breathing')
    ) {
      return 'mobility';
    }

    // Bodyweight exercises
    if (
      exerciseStr.includes('push-up') ||
      exerciseStr.includes('pull-up') ||
      exerciseStr.includes('bodyweight') ||
      exerciseStr.includes('sit-up') ||
      exerciseStr.includes('plank') ||
      exerciseStr.includes('burpee') ||
      exerciseStr.includes('mountain climber') ||
      exerciseStr.includes('jumping jack') ||
      exerciseStr.includes('dip')
    ) {
      return 'bodyweight';
    }

    // Walking and light activities
    if (
      exerciseStr.includes('walk') ||
      exerciseStr.includes('stroll') ||
      exerciseStr.includes('hike') ||
      exerciseStr.includes('sauna') ||
      exerciseStr.includes('steam') ||
      exerciseStr.includes('massage')
    ) {
      return 'recovery';
    }

    // Default to weight training for unknown exercises
    return 'weight-training';
  };

  const createActivitiesFromRequest = (workoutRequests: any[]) => {
    const createdWorkouts = [];

    for (const request of workoutRequests) {
      // If there are multiple exercises, split into separate requests
      const exercises =
        request.exercises && request.exercises.length > 1
          ? request.exercises
          : null;
      if (exercises) {
        for (const exercise of exercises) {
          if (request.isRecurring) {
            for (let week = 0; week < request.weeksToRepeat; week++) {
              const workoutDate = dayjs(request.date).add(week * 7, 'day');
              const workout: Activity = {
                id:
                  Date.now().toString() +
                  Math.random().toString(36).substr(2, 9) +
                  week,
                date: workoutDate.format('YYYY-MM-DD'),
                type: determineActivityType([exercise]),
                name: toTitleCase(exercise),
                emoji:
                  ACTIVITY_EMOJIS[
                    determineActivityType([
                      exercise,
                    ]) as keyof typeof ACTIVITY_EMOJIS
                  ] || '💪',
                completed: false,
                notes: `Recurring workout (week ${week + 1}/${request.weeksToRepeat}) - Created by AI coach`,
              };
              dispatch(addActivity(workout));
              createdWorkouts.push(workout);
            }
          } else {
            const workout: Activity = {
              id:
                Date.now().toString() + Math.random().toString(36).substr(2, 9),
              date: request.date,
              type: determineActivityType([exercise]),
              name: toTitleCase(exercise),
              emoji:
                ACTIVITY_EMOJIS[
                  determineActivityType([
                    exercise,
                  ]) as keyof typeof ACTIVITY_EMOJIS
                ] || '💪',
              completed: false,
              notes: `Created by AI coach based on your request`,
            };
            dispatch(addActivity(workout));
            createdWorkouts.push(workout);
          }
        }
      } else {
        // Single exercise or already split
        if (request.isRecurring) {
          for (let week = 0; week < request.weeksToRepeat; week++) {
            const workoutDate = dayjs(request.date).add(week * 7, 'day');
            const workout: Activity = {
              id:
                Date.now().toString() +
                Math.random().toString(36).substr(2, 9) +
                week,
              date: workoutDate.format('YYYY-MM-DD'),
              type: request.type, // keep as enum value
              name: request.exercises.map(toTitleCase).join(', '),
              emoji:
                ACTIVITY_EMOJIS[request.type as keyof typeof ACTIVITY_EMOJIS] ||
                '💪',
              completed: false,
              notes: `Recurring workout (week ${week + 1}/${request.weeksToRepeat}) - Created by AI coach`,
            };
            dispatch(addActivity(workout));
            createdWorkouts.push(workout);
          }
        } else {
          const workout: Activity = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            date: request.date,
            type: request.type, // keep as enum value
            name: request.exercises.map(toTitleCase).join(', '),
            emoji:
              ACTIVITY_EMOJIS[request.type as keyof typeof ACTIVITY_EMOJIS] ||
              '💪',
            completed: false,
            notes: `Created by AI coach based on your request`,
          };
          dispatch(addActivity(workout));
          createdWorkouts.push(workout);
        }
      }
    }

    return createdWorkouts;
  };

  const getWorkoutContext = (): string => {
    const recentActivities = activities.filter(a =>
      dayjs(a.date).isAfter(dayjs().subtract(30, 'day'))
    );
    const upcomingActivities = activities
      .filter(a => dayjs(a.date).isSameOrAfter(dayjs(), 'day'))
      .slice(0, 5);

    // Get this week's activities (Monday to Sunday)
    const startOfWeek = dayjs().startOf('week').add(1, 'day'); // Monday
    const endOfWeek = startOfWeek.add(6, 'day'); // Sunday
    const thisWeekActivities = activities.filter(a => {
      const activityDate = dayjs(a.date);
      return (
        activityDate.isSameOrAfter(startOfWeek, 'day') &&
        activityDate.isSameOrBefore(endOfWeek, 'day')
      );
    });

    let context = `Current activity context:\n`;
    context += `- Recent activities (last 30 days): ${recentActivities.length}\n`;
    context += `- Completed: ${recentActivities.filter(a => a.completed).length}\n`;

    if (thisWeekActivities.length > 0) {
      context += `- This week's activities (${startOfWeek.format('MMM D')} - ${endOfWeek.format('MMM D')}):\n`;
      const activitiesByDay: { [key: string]: Activity[] } = {};
      thisWeekActivities.forEach((a: Activity) => {
        const dayName = dayjs(a.date).format('dddd');
        if (!activitiesByDay[dayName]) {
          activitiesByDay[dayName] = [];
        }
        activitiesByDay[dayName].push(a);
      });

      Object.keys(activitiesByDay).forEach(day => {
        const dayActivities = activitiesByDay[day];
        context += `  * ${day}: ${dayActivities.map((a: Activity) => a.name || a.type).join(', ')}\n`;
      });
    }

    if (upcomingActivities.length > 0) {
      context += `- Upcoming activities:\n`;
      upcomingActivities.forEach(a => {
        const date = dayjs(a.date).format('MMM D');
        context += `  * ${date}: ${a.name || a.type} (${a.completed ? 'completed' : 'pending'})\n`;
      });
    }

    return context;
  };

  const handleSend = async () => {
    if (!inputText.trim() || isProcessing) return;

    setIsProcessing(true);

    // Store the input text and clear immediately
    const currentInput = inputText.trim();
    setInputText('');

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      text: currentInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Create system prompt with workout context
      const workoutContext = getWorkoutContext();

      const systemPrompt = `You are an AI fitness coach. You can help users create workout plans, provide advice, and manage their fitness routine.

${workoutContext}

COMPREHENSIVE EXERCISE DATABASE:
I have access to a detailed exercise database with the following information for each exercise:
- Name (exact Title Case)
- Workout Type (Weight Training, Cardio, HIIT, Yoga, etc.)
- Category (Compound, Isolation, Cardiovascular, Core, etc.)
- Muscle Groups targeted
- Equipment needed
- Difficulty level (Beginner, Intermediate, Advanced)
- Description and variations

AVAILABLE EXERCISES (use these exact names in Title Case):
${EXERCISE_DATABASE.map(ex => ex.name).join(', ')}

AVAILABLE WORKOUT TYPES (use these exact names in Title Case):
${ACTIVITY_TYPES.map(wt => wt.label).join(', ')}

EXERCISE CATEGORIES:
- Compound: Multi-joint movements (Bench Press, Squat, Deadlift)
- Isolation: Single-joint movements (Dumbbell Curl, Tricep Extension)
- Cardiovascular: Heart rate elevating (Run, Bike, Swim)
- Core: Abdominal and stability work (Plank, Sit-Up, Russian Twist)
- Flexibility: Stretching and mobility (Yoga Flow, Downward Dog)

MUSCLE GROUPS:
- Upper Body: Chest, Back, Shoulders, Biceps, Triceps, Forearms
- Lower Body: Quadriceps, Hamstrings, Glutes, Calves
- Core: Core, Lower Back
- Full Body: Full Body, Cardiovascular

DYNAMIC EXERCISE SYSTEM:
- If a user requests an exercise not in the available list, you can add it to their personal exercise library
- When adding new exercises, use Title Case formatting (e.g., "Cable Face Pulls", "Dumbbell Lateral Raises")
- New exercises will be automatically categorized as "Compound" with "Full Body" muscle groups
- The system will remember custom exercises for future use

You can:
1. Create workouts by mentioning "I've scheduled [exercises] for [date]"
2. Create recurring workouts by mentioning "I've scheduled [exercises] for [day] (recurring weekly for X weeks)"
3. Add new exercises to the user's library by simply using them in workout creation
4. Provide fitness advice and motivation
5. Analyze workout patterns and suggest improvements
6. Help with exercise form and technique
7. Suggest exercises based on muscle groups, workout types, or categories
8. Recommend exercise variations and progressions

IMPORTANT WORKOUT SCHEDULING RULES:
- When creating workouts, start from this week and schedule them on the specified day
- For recurring workouts, default to 4 weeks unless specified otherwise
- Don't move or modify existing workouts when adding new ones
- If duration is not specified, use 4 weeks as default
- Be specific about the exercises and date
- Don't ask follow-up questions unless absolutely necessary
- When a user asks to add a workout, just create it with reasonable defaults
- ALWAYS use Title Case for all workout and exercise names/types (e.g., "Bench Press", "Overhead Press", "Weight Training")
- ALWAYS use the exact exercise names the user requests (e.g., "Overhead Presses" not "Overhead, Presses")
- Keep compound exercise names together (e.g., "Bench Press", "Deadlift", "Push-Ups")
- If a user requests an exercise not in the available list, add it to their library automatically
- Consider exercise categories and muscle groups when suggesting workouts
- Match workout types appropriately (e.g., "Bench Press" is weight-training, "Run" is cardio, "Yoga Flow" is mobility)

WORKOUT COPYING INSTRUCTIONS:
When a user asks to "copy" or "duplicate" workouts from one week to another:
1. COPYING A SINGLE DAY: If they say "copy Monday's workouts to next Monday" or "duplicate Tuesday to next Tuesday":
   - Find all workouts for the specified day of this week
   - Create new workouts for the same day of next week (7 days later)
   - Use the format: "I've scheduled [exercise names] for [next week's day]"
   - Example: "I've scheduled Bench Press and Deadlift for next Monday"

2. COPYING AN ENTIRE WEEK: If they say "copy all workouts from this week to next week" or "duplicate this week's workouts":
   - Find all workouts for each day of this week (Monday through Sunday)
   - Create new workouts for the corresponding days of next week
   - Use the format: "I've scheduled [exercise names] for [next week's day]" for each day
   - Example: "I've scheduled Squat and Leg Press for next Tuesday" and "I've scheduled Bench Press for next Wednesday"

3. COPYING TO A SPECIFIC WEEK: If they say "copy this week's workouts to week of [date]" or "duplicate to [specific week]":
   - Calculate the target week based on the specified date
   - Create new workouts for the corresponding days of that target week
   - Use the format: "I've scheduled [exercise names] for [target week's day]"

CRITICAL COPYING RULES:
- NEVER add workouts to the current week when copying - always create them for the target week
- When copying to "next week", add 7 days to the current date
- When copying to a specific week, calculate the correct dates based on the target week
- Maintain the same day-of-week pattern (Monday stays Monday, Tuesday stays Tuesday, etc.)
- Copy ALL exercises from each day, not just some of them
- Use the exact same exercise names and workout types
- Don't modify or combine exercises when copying - keep them exactly as they are

RESPONSE FORMAT FOR WORKOUT CREATION:
When creating workouts, use this exact format: "I've scheduled [exercise names] for [day]"
Examples:
- "I've scheduled Overhead Presses for Monday"
- "I've scheduled Bench Press and Deadlifts for Wednesday"
- "I've scheduled Push-Ups and Pull-Ups for Friday"

IMPORTANT: When adding new exercises that aren't in the database, just use the exercise name directly:
- "I've scheduled Cable Face Pulls for Monday" (not "I've scheduled the new exercise Cable Face Pulls for Monday")
- "I've scheduled Dumbbell Lateral Raises for Wednesday" (not "I've scheduled the new exercise to your personal library, scheduled Dumbbell Lateral Raises for Wednesday")
- "I've scheduled Paddle Boarding for Wednesday" (not "Paddle Boarding To Your Personal Exercise Library. Scheduled It")

CRITICAL: Always use the simple format "I've scheduled [exercise name] for [day]" - never add extra words like "to your personal library" or "scheduled it" or any other verbose language.

WARNING: If you use verbose language like "added to your personal library" or "scheduled it" or any other extra words, the system will not be able to parse your response correctly. Stick to the exact format above.

CRITICAL RULE: NEVER use phrases like:
- "To Your Personal Exercise Library"
- "Scheduled It" 
- "Added To Your Library"
- "Personal Exercise Library"
- Any other verbose language

ONLY use: "I've scheduled [exercise name] for [day]"

EXERCISE CATEGORIZATION GUIDELINES:
When users add new exercises, the system will automatically categorize them based on the exercise name:
- Weight Training: deadlift, squat, bench, press, curl, extension, row, pulldown, fly, lunge
- Cardio: run, bike, cycling, swim, rowing, elliptical, treadmill, jog
- Sports: paddle, surf, tennis, basketball, soccer, football, volleyball, baseball, hockey, golf, rock climb, hike, ski, snowboard, skate, dance, martial arts, boxing, kickbox, crossfit, hiit
- Mobility: yoga, stretch, mobility, pilates, meditation, breathing
- Bodyweight: push-up, pull-up, sit-up, plank, burpee, mountain climber, jumping jack, dip
- Recovery: walk, stroll, sauna, steam, massage

USER INPUT EXAMPLES:
Users will say things like:
- "Add paddle boarding to Wednesday"
- "Add bench press to Monday, 3 sets of 10 reps at 32.5 lbs"
- "Add overhead presses to this Monday"
- "Add face pulls to Monday"
- "Copy Monday's workouts to next Monday"
- "Copy all workouts from this week to next week"
- "Duplicate Tuesday's workouts to next Tuesday"
- "Copy this week's workouts to the week of July 15"

Always respond with the simple format regardless of how the user phrases their request.

COPYING EXAMPLES:
When copying workouts, respond like this:
- "I've scheduled Bench Press and Deadlift for next Monday"
- "I've scheduled Squat and Leg Press for next Tuesday"
- "I've scheduled Dumbbell Row and Lat Pulldown for next Wednesday"

Keep responses conversational and helpful. If creating workouts, be specific about the exercises, date, and recurrence. Don't get stuck in loops asking for more information.`;

      // Map conversation history to valid OpenAI roles (type-safe)
      const conversationHistory = messages
        .filter(m => m.type === 'user' || m.type === 'bot')
        .slice(-6)
        .map(m => {
          if (m.type === 'user') {
            return { role: 'user' as const, content: m.text };
          } else {
            return { role: 'assistant' as const, content: m.text };
          }
        });

      // Lower temperature for workout creation (more consistent)
      // Higher temperature for motivational responses (more creative)
      const getTemperature = (userInput: string): number => {
        const workoutKeywords = [
          'add',
          'schedule',
          'create',
          'copy',
          'duplicate',
        ];
        const isWorkoutRequest = workoutKeywords.some(keyword =>
          userInput.toLowerCase().includes(keyword)
        );
        return isWorkoutRequest ? 0.3 : 0.7;
      };

      const response = await openai.chat.completions
        .create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: currentInput },
          ],
          max_tokens: 500,
          temperature: getTemperature(currentInput),
        })
        .catch(error => {
          console.error('OpenAI API Error:', error);
          throw new Error('Failed to get AI response');
        });

      const botResponse =
        response.choices[0]?.message?.content ||
        "Sorry, I couldn't process that request.";

      // Debug logging
      console.log('AI Response:', botResponse);
      console.log('User Input:', currentInput);

      // Check if the response contains workout creation
      const workoutRequests = await parseActivityFromResponse(
        botResponse,
        currentInput
      );
      let finalResponse = botResponse;
      // Remove the checkmark summary block
      // if (workoutRequests.length > 0) { ... finalResponse += `\n\n${summary}`; }

      const botMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot' as const,
        text: finalResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);

      // Save session after each message
      setTimeout(() => saveCurrentSession(), 100);
    } catch (error) {
      console.error('OpenAI API Error:', error);

      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot' as const,
        text: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const startNewChat = () => {
    setMessages([
      {
        id: '1',
        type: 'bot',
        text: "Hi! I'm your AI fitness coach powered by ChatGPT. I can help you create activity plans, suggest exercises, and provide motivation. What are your fitness goals?",
        timestamp: new Date(),
      },
    ]);
    setCurrentSessionId(Date.now().toString());
    setActiveTab('chat');
  };

  const renderChatHistory = () => {
    return (
      <View className="flex-1">
        <ScrollView className="flex-1 px-4 pt-4">
          <TouchableOpacity
            style={{ backgroundColor: isDark ? '#2563eb' : '#3b82f6' }}
            className="px-4 py-3 rounded-lg mb-4 flex-row items-center justify-center"
            onPress={startNewChat}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text className="text-white font-medium ml-2">Start New Chat</Text>
          </TouchableOpacity>

          {chatHistory.length === 0 ? (
            <View className="items-center py-8">
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={isDark ? '#a3a3a3' : '#6b7280'}
              />
              <Text
                className="text-lg font-medium mt-4"
                style={{ color: isDark ? '#fff' : '#111' }}
              >
                No chat history
              </Text>
              <Text
                style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
                className="text-center mt-2"
              >
                Start a conversation to see your chat history here
              </Text>
            </View>
          ) : (
            chatHistory.map(session => (
              <TouchableOpacity
                key={session.id}
                className={`p-4 rounded-lg mb-3 border ${
                  isDark
                    ? 'bg-[#18181b] border-[#222]'
                    : 'bg-white border-gray-200'
                }`}
                onPress={() => loadSession(session)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text
                      className="font-semibold"
                      style={{ color: isDark ? '#fff' : '#111' }}
                    >
                      {session.title}
                    </Text>
                    <Text
                      style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
                      className="text-sm mt-1"
                    >
                      {dayjs(session.timestamp).format('MMM D, YYYY h:mm A')}
                    </Text>
                    <Text
                      style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}
                      className="text-sm"
                    >
                      {session.messages.length} messages
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteSession(session.id)}
                    className="p-2"
                  >
                    <Ionicons
                      name="trash"
                      size={16}
                      color={isDark ? '#ef4444' : '#dc2626'}
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: isDark ? '#000' : '#F9FAFB' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <AppHeader>
        <AppHeaderTitle title="AI Coach" subtitle="Powered by ChatGPT" />
      </AppHeader>

      {/* Tab Navigation */}
      <View
        className="flex-row border-b"
        style={{ borderBottomColor: isDark ? '#222' : '#e5e7eb' }}
      >
        <TouchableOpacity
          className={`flex-1 py-3 ${activeTab === 'chat' ? '' : ''}`}
          style={{
            backgroundColor:
              activeTab === 'chat'
                ? isDark
                  ? '#2563eb'
                  : '#3b82f6'
                : 'transparent',
            borderBottomWidth: activeTab === 'chat' ? 2 : 0,
            borderBottomColor: isDark ? '#2563eb' : '#3b82f6',
          }}
          onPress={() => setActiveTab('chat')}
        >
          <Text
            className="text-center font-medium"
            style={{
              color:
                activeTab === 'chat' ? '#fff' : isDark ? '#a3a3a3' : '#6b7280',
            }}
          >
            Chat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-3 ${activeTab === 'history' ? '' : ''}`}
          style={{
            backgroundColor:
              activeTab === 'history'
                ? isDark
                  ? '#2563eb'
                  : '#3b82f6'
                : 'transparent',
            borderBottomWidth: activeTab === 'history' ? 2 : 0,
            borderBottomColor: isDark ? '#2563eb' : '#3b82f6',
          }}
          onPress={() => setActiveTab('history')}
        >
          <Text
            className="text-center font-medium"
            style={{
              color:
                activeTab === 'history'
                  ? '#fff'
                  : isDark
                    ? '#a3a3a3'
                    : '#6b7280',
            }}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'chat' ? (
        <View className="flex-1">
          <ScrollView
            className="flex-1 px-4 pt-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            ref={scrollViewRef}
          >
            {messages.map((message, index) => (
              <View
                key={message.id}
                ref={
                  message.type === 'bot' && index === messages.length - 1
                    ? lastBotMessageRef
                    : message.type === 'user' &&
                        index === messages.length - 2 &&
                        messages[messages.length - 1]?.type === 'bot'
                      ? lastUserMessageRef
                      : null
                }
                onLayout={
                  message.type === 'user' &&
                  index === messages.length - 2 &&
                  messages[messages.length - 1]?.type === 'bot'
                    ? e => setLastUserMessageY(e.nativeEvent.layout.y)
                    : undefined
                }
                className={`mb-4 ${message.type === 'user' ? 'items-end' : 'items-start'}`}
              >
                <View
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    message.type === 'user'
                      ? isDark
                        ? 'bg-blue-700'
                        : 'bg-blue-500'
                      : isDark
                        ? 'bg-[#18181b] border border-[#222]'
                        : 'bg-white border border-gray-200'
                  }`}
                >
                  <Text
                    style={{
                      color:
                        message.type === 'user'
                          ? '#fff'
                          : isDark
                            ? '#fff'
                            : '#111',
                    }}
                  >
                    {message.text}
                  </Text>
                </View>
              </View>
            ))}
            {isProcessing && (
              <Animated.View
                className="mb-4 items-start"
                style={{
                  shadowColor: isDark ? GLOW_COLOR_DARK : GLOW_COLOR_LIGHT,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.2, 0.8],
                  }),
                  shadowRadius: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 18],
                  }),
                  elevation: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [2, 8],
                  }),
                }}
              >
                <View
                  className={`max-w-[80%] p-3 rounded-2xl ${isDark ? 'bg-[#18181b] border border-[#222]' : 'bg-white border border-gray-200'}`}
                >
                  <Text style={{ color: isDark ? '#a3a3a3' : '#6b7280' }}>
                    Thinking...
                  </Text>
                </View>
              </Animated.View>
            )}
          </ScrollView>

          <View
            style={{
              backgroundColor: isDark ? '#111' : '#fff',
              borderTopColor: isDark ? '#222' : '#e5e7eb',
            }}
            className="p-4 border-t"
          >
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 bg-gray-100 p-3 rounded-full mr-3"
                placeholder="Ask your AI coach anything..."
                placeholderTextColor={isDark ? '#a3a3a3' : '#6b7280'}
                value={inputText}
                onChangeText={setInputText}
                multiline
                editable={!isProcessing}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
                returnKeyType="send"
                style={{
                  color: isDark ? '#fff' : '#111',
                  backgroundColor: isDark ? '#18181b' : '#f3f4f6',
                }}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: isDark ? '#2563eb' : '#3b82f6',
                  opacity: isProcessing ? 0.5 : 1,
                }}
                className="w-10 h-10 rounded-full items-center justify-center"
                onPress={handleSend}
                disabled={isProcessing}
              >
                <Text className="text-white text-lg">→</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        renderChatHistory()
      )}
    </KeyboardAvoidingView>
  );
}
