import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import OpenAI from 'openai';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import Markdown from 'react-native-markdown-display';
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
      text: '## 👋 Welcome to Your AI Fitness Coach!\n\nI\'m here to help you **crush your fitness goals** and build the best version of yourself! 💪\n\n### What I can do for you:\n- 🏋️ **Create personalized workout plans**\n- 📅 **Schedule activities** for any day\n- 💡 **Provide exercise tips and form advice**\n- 🎯 **Track your progress** and suggest improvements\n- 🏃 **Recommend exercises** based on your goals\n\n### Just ask me things like:\n- "Create a push day workout for Monday"\n- "Add deadlifts to today\'s routine"\n- "What\'s a good exercise for my back?"\n- "Copy this week\'s workouts to next week"\n\n**What are your fitness goals?** Let\'s get started! 🚀',
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
    // Create a new session ID for current chat only if no current session exists
    if (!currentSessionId) {
      setCurrentSessionId(Date.now().toString());
    }
  }, []);

  // Auto-scroll when messages change or processing state changes
  useEffect(() => {
    if (scrollViewRef.current && (messages.length > 0 || isProcessing)) {
      setTimeout(
        () => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        },
        isProcessing ? 100 : 350
      );
    }
  }, [messages, isProcessing]);

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

  const saveCurrentSession = useCallback(async () => {
    if (messages.length <= 1) return; // Don't save if only initial message

    const sessionTitle =
      messages[1]?.text?.substring(0, 50) + '...' || 'Chat Session';

    const newSession: ChatSession = {
      id: currentSessionId,
      title: sessionTitle,
      messages: messages,
      timestamp: new Date(),
    };

    setChatHistory(prevHistory => {
      const updatedHistory = [
        newSession,
        ...prevHistory.filter(s => s.id !== currentSessionId),
      ];
      // Save to storage asynchronously
      saveChatHistory(updatedHistory);
      return updatedHistory;
    });
  }, [messages, currentSessionId]);

  // Memoize the activity context to prevent unnecessary recalculations
  const activityContext = useMemo(() => {
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
    context += `- This week's activities: ${thisWeekActivities.length}\n`;
    context += `- Upcoming activities: ${upcomingActivities.length}\n`;

    if (thisWeekActivities.length > 0) {
      context += `\nThis week's activities:\n`;
      const groupedByDay = thisWeekActivities.reduce(
        (acc, activity) => {
          const day = dayjs(activity.date).format('dddd');
          if (!acc[day]) acc[day] = [];
          acc[day].push(activity);
          return acc;
        },
        {} as { [key: string]: Activity[] }
      );

      Object.entries(groupedByDay).forEach(([day, dayActivities]) => {
        context += `- ${day}: ${dayActivities
          .map(a => `${a.emoji} ${a.name}`)
          .join(', ')}\n`;
      });
    }

    if (upcomingActivities.length > 0) {
      context += `\nUpcoming activities:\n`;
      upcomingActivities.forEach(activity => {
        const date = dayjs(activity.date).format('MMM D');
        context += `- ${date}: ${activity.emoji} ${activity.name}\n`;
      });
    }

    return context;
  }, [activities]);

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
            setChatHistory(prevHistory => {
              const updatedHistory = prevHistory.filter(
                s => s.id !== sessionId
              );
              saveChatHistory(updatedHistory);
              return updatedHistory;
            });

            // Check if the deleted session was the current active session
            if (sessionId === currentSessionId) {
              // Start a new chat since the current session was deleted
              startNewChat();
            }
          },
        },
      ]
    );
  };

  const deleteAllSessions = async () => {
    Alert.alert(
      'Delete All Chats',
      'Are you sure you want to delete all chat sessions?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setChatHistory([]);
            saveChatHistory([]);
            // Always start a new chat when all sessions are deleted
            startNewChat();
          },
        },
      ]
    );
  };

  // Parse activity creation requests from ChatGPT response
  const parseActivityFromResponse = async (
    response: string,
    userInput: string
  ): Promise<any[]> => {
    console.log('Parsing activity from response:', response);
    console.log('User input:', userInput);

    const activityRequests = [];
    let bulkWorkoutProcessed = false; // Flag to prevent duplicate processing

    // Look for activity creation patterns in the response
    const activityPatterns = [
      // BULK WORKOUT PATTERN - Handle multiple "I've scheduled X for Y" lines
      /I've scheduled\s+([^.]+?)\s+for\s+(\w+)\.?\s*/gi,
      // Handle "I've scheduled the following X for Y: 1. Exercise1 2. Exercise2..."
      // This pattern specifically looks for numbered lists and excludes the category text
      /(?:I've scheduled|I've created|I've added|Scheduled|Created|Added)\s+(?:the following\s+)?(?:leg exercises?|arm exercises?|chest exercises?|back exercises?|core exercises?|cardio exercises?|strength exercises?|workout exercises?|exercises?)\s+(?:for|on)\s+(.+?):\s*((?:\d+\.\s*[^\n]+\n?)+)/gi,
      // Handle "I've scheduled X for Y" - FIXED PATTERN to handle trailing spaces and better capture
      /(?:I've scheduled|I've created|I've added|Scheduled|Created|Added)\s+([^]+?)\s+(?:for|on)\s+([^\n.]+?)(?:\s*$|\s*\n|\s*\.)/gm,
      // Handle "Activity/Exercise: X on Y" (original pattern)
      /(?:Activity|Exercise):\s*(.+?)\s+(?:on|for)\s+(.+?)(?:\n|\.|$)/gi,
      // Handle "Recurring/Weekly/Every week: X on Y" (original pattern)
      /(?:Recurring|Weekly|Every week):\s*(.+?)\s+(?:on|for)\s+(.+?)(?:\n|\.|$)/gi,
      // Handle "I'll add/schedule/create X for Y" (original pattern)
      /(?:I'll add|I'll schedule|I'll create)\s+(.+?)\s+(?:for|on)\s+(.+?)(?:\n|\.|$)/gi,
      // Handle "Adding/Scheduling/Creating X for Y" (original pattern)
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

      // Remove generic workout terms that shouldn't be exercise names
      cleaned = cleaned.replace(
        /^(a\s+)?(pull|push|legs?|chest|back|shoulder|arm|full\s+body)\s+(workout|day|routine|session|training)/gi,
        ''
      );
      cleaned = cleaned.replace(
        /^(a\s+)?(workout|day|routine|session|training)\s+(with\s+\d+\s+exercises?)?/gi,
        ''
      );
      cleaned = cleaned.replace(
        /^(a\s+)?(\d+\s+)?(exercises?|moves?|activities?)/gi,
        ''
      );

      // Remove common AI filler words
      cleaned = cleaned.replace(/^(the\s+)?(following\s+)?/gi, '');
      cleaned = cleaned.replace(/(\s+for\s+|\s+on\s+).*$/i, '');

      return cleaned.trim();
    };

    // Helper function to extract exercises from numbered lists
    const extractExercisesFromNumberedList = (
      numberedList: string
    ): string[] => {
      const exercises = [];
      const lines = numberedList.split('\n');

      for (const line of lines) {
        // Match patterns like "1. Squat", "2. Deadlift", etc.
        const match = line.match(/^\d+\.\s*(.+?)(?:\s*$|\.$)/);
        if (match) {
          exercises.push(cleanExerciseName(match[1]));
        }
      }

      return exercises.filter(ex => ex.length > 0);
    };

    // Helper function to parse date text into YYYY-MM-DD format
    const parseDateFromText = (dateText: string): string => {
      let targetDate = dayjs();
      const lowerDateText = dateText.toLowerCase();
      const lowerUserInput = userInput.toLowerCase();

      // Check if user input mentions "next week" to provide context
      const isNextWeekContext = lowerUserInput.includes('next week');

      if (lowerDateText.includes('tomorrow')) {
        targetDate = targetDate.add(1, 'day');
      } else if (lowerDateText.includes('today')) {
        // Keep today - allow activities for today
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

          // If user mentioned "next week" in their input, add 7 more days
          if (isNextWeekContext) {
            targetDate = targetDate.add(daysToAdd + 7, 'day');
          } else {
            targetDate = targetDate.add(daysToAdd, 'day');
          }
        }
      }

      return targetDate.format('YYYY-MM-DD');
    };

    for (const pattern of activityPatterns) {
      console.log('Testing pattern:', pattern.source);

      // Skip other patterns if bulk workout was already processed
      if (
        bulkWorkoutProcessed &&
        pattern.source !== "I've scheduled\\s+([^.]+?)\\s+for\\s+(\\w+)\\.?\\s*"
      ) {
        console.log('Skipping pattern - bulk workout already processed');
        continue;
      }

      let match;
      while ((match = pattern.exec(response)) !== null) {
        console.log('Pattern matched:', match);
        let exercises: string;
        let dateText: string;
        let numberedList: string | undefined;

        // Check if this is our new bulk workout pattern (first pattern in array)
        if (
          pattern.source ===
          "I've scheduled\\s+([^.]+?)\\s+for\\s+(\\w+)\\.?\\s*"
        ) {
          // New bulk workout pattern: match[1] = exercises, match[2] = day
          exercises = cleanExerciseName(match[1]);
          dateText = match[2].trim();

          console.log('Processing bulk workout pattern');
          console.log('Raw exercises:', match[1]);
          console.log('Raw dateText:', match[2]);

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

          console.log('Parsed exercises:', exerciseList);
          console.log('Date text:', dateText);
          console.log('User input for context:', userInput);

          // Skip if no valid exercises were found
          if (exerciseList.length === 0) {
            console.log('No valid exercises found, skipping activity creation');
            continue;
          }

          // Parse date and determine if it's next week
          let targetDate = dayjs();
          const lowerDateText = dateText.toLowerCase();
          const lowerUserInput = userInput.toLowerCase();
          const isNextWeekContext = lowerUserInput.includes('next week');

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
            if (isNextWeekContext) {
              // For "next week", go to next week's version of that day
              const nextWeekStart = targetDate.add(7, 'day').startOf('week'); // Next Sunday
              targetDate = nextWeekStart.add(dayIndex, 'day'); // Add days to get to the target day
            } else {
              // For current week, use existing logic
              const currentDay = targetDate.day();
              const daysToAdd = (dayIndex - currentDay + 7) % 7;
              targetDate = targetDate.add(daysToAdd, 'day');
            }
          }

          console.log(
            'Calculated target date:',
            targetDate.format('YYYY-MM-DD')
          );

          activityRequests.push({
            date: targetDate.format('YYYY-MM-DD'),
            exercises: exerciseList,
            type: determineActivityType(exerciseList),
            isRecurring: false,
            weeksToRepeat: 1,
          });

          // Mark that bulk workout has been processed
          bulkWorkoutProcessed = true;
        } else if (match[2]) {
          // This is the numbered list pattern
          dateText = match[1];
          numberedList = match[2];

          // Extract exercises from the numbered list
          const exerciseList = extractExercisesFromNumberedList(numberedList);

          if (exerciseList.length > 0) {
            console.log('Found numbered list exercises:', exerciseList);

            // Process each exercise individually
            for (const exercise of exerciseList) {
              // Try to match exercise against the comprehensive exercise database
              const exactMatch = findExerciseByName(exercise);

              if (exactMatch) {
                // Create individual activity for each exercise
                activityRequests.push({
                  date: parseDateFromText(dateText),
                  exercises: [exactMatch.name],
                  type: determineActivityType([exactMatch.name]),
                  isRecurring: false,
                  weeksToRepeat: 1,
                });
              } else {
                // Try search function for partial matches
                const searchResults = searchExercises(exercise);

                if (searchResults.length > 0) {
                  activityRequests.push({
                    date: parseDateFromText(dateText),
                    exercises: [searchResults[0].name],
                    type: determineActivityType([searchResults[0].name]),
                    isRecurring: false,
                    weeksToRepeat: 1,
                  });
                } else {
                  // Add as custom exercise
                  const exerciseName = toTitleCase(exercise);
                  const newExercise: ExerciseDefinition = {
                    name: exerciseName,
                    type: determineActivityType([exerciseName]),
                    category: 'Compound' as ExerciseCategory,
                    muscleGroups: ['Full Body' as MuscleGroup],
                    equipment: [],
                    difficulty: 'Beginner' as
                      | 'Beginner'
                      | 'Intermediate'
                      | 'Advanced',
                    description: '',
                    variations: [],
                  };
                  try {
                    await addCustomExercise(newExercise);
                    console.log(`Added new exercise: ${exerciseName}`);
                  } catch (error) {
                    console.error('Error adding custom exercise:', error);
                  }

                  activityRequests.push({
                    date: parseDateFromText(dateText),
                    exercises: [exerciseName],
                    type: determineActivityType([exerciseName]),
                    isRecurring: false,
                    weeksToRepeat: 1,
                  });
                }
              }
            }
          }
        } else {
          // Original pattern handling
          exercises = cleanExerciseName(match[1]);
          dateText = match[2].trim();

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
            // Skip generic workout terms
            const genericPatterns = [
              /^(a\s+)?(pull|push|legs?|chest|back|shoulder|arm|full\s+body)\s+(workout|day|routine|session|training)/i,
              /^(a\s+)?(workout|day|routine|session|training)\s+(with\s+\d+\s+exercises?)?/i,
              /^(a\s+)?(\d+\s+)?(exercises?|moves?|activities?)/i,
              /^(the\s+)?(following\s+)?/i,
            ];

            const isGeneric = genericPatterns.some(pattern =>
              pattern.test(exercise)
            );
            if (isGeneric || exercise.length < 3) {
              console.log(`Skipping generic exercise name: ${exercise}`);
              continue;
            }

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
                  difficulty: 'Beginner' as
                    | 'Beginner'
                    | 'Intermediate'
                    | 'Advanced',
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
          console.log('Date text:', dateText);
          console.log('User input for context:', userInput);

          // Skip if no valid exercises were found
          if (exerciseList.length === 0) {
            console.log('No valid exercises found, skipping activity creation');
            continue;
          }

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
            // Keep today - allow activities for today
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

          activityRequests.push({
            date: targetDate.format('YYYY-MM-DD'),
            exercises: exerciseList,
            type: determineActivityType(exerciseList),
            isRecurring,
            weeksToRepeat,
          });
        }
      }
    }

    // If no patterns found, try to extract from user input context with better compound exercise handling
    if (activityRequests.length === 0) {
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

        activityRequests.push({
          date: targetDate.format('YYYY-MM-DD'),
          exercises: foundExercises.map(toTitleCase),
          type: determineActivityType(foundExercises.map(toTitleCase)),
          isRecurring: false,
          weeksToRepeat: 1,
        });
      }
    }

    // If still no patterns found, try to extract exercise names from verbose AI responses
    let extractedExercise: string | null = null;

    if (activityRequests.length === 0) {
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

            console.log(
              `Fallback: Extracted exercise "${exerciseName}" for ${dayText} from AI response`
            );

            activityRequests.push({
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

      // If no exercise found in AI response, try user input
      if (!extractedExercise) {
        const userInputLower = userInput.toLowerCase();
        // More specific patterns that avoid matching general phrases like "it to my schedule"
        const addPatterns = [
          // Only match when there's a clear exercise name, not pronouns or generic phrases
          /add\s+((?:deadlift|squat|bench press|overhead press|curl|row|pull-?up|push-?up|plank|burpee|lunge|dip)[s]?(?:\s+\w+)*)\s+(?:to|for|on)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i,
          /add\s+(\w+(?:\s+\w+)*(?:lift|press|curl|row|pull|push|squat|lunge|dip|plank|burpee)s?)\s+(?:to|for|on)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i,
          // Match "schedule X for Y" format - but not "schedule it"
          /schedule\s+([A-Za-z]\w+(?:\s+\w+)*)\s+(?:for|on)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i,
        ];

        // Helper function to validate exercise names
        const isValidExerciseName = (exerciseName: string): boolean => {
          if (!exerciseName || exerciseName.length < 3) return false;

          // Skip obvious non-exercise phrases
          const invalidPhrases = [
            'it to my schedule',
            'my schedule',
            'to my schedule',
            'the schedule',
            'workout plan',
            'fitness plan',
            'routine plan',
            'exercise plan',
            'training plan',
            'it to',
            'it',
            'this',
            'that',
            'them',
          ];

          const lowerName = exerciseName.toLowerCase();
          return !invalidPhrases.some(phrase => lowerName.includes(phrase));
        };

        for (const pattern of addPatterns) {
          const match = userInput.match(pattern);
          if (match) {
            // Clean the exercise name more aggressively to handle extra context
            let exerciseName = match[1].trim();

            // Validate the exercise name before proceeding
            if (!isValidExerciseName(exerciseName)) {
              console.log(`Skipping invalid exercise name: "${exerciseName}"`);
              continue;
            }

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

              activityRequests.push({
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
    }

    // If we found an exercise from verbose AI response but no date, try to extract date from user input
    if (extractedExercise && activityRequests.length === 0) {
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

        activityRequests.push({
          date: targetDate.format('YYYY-MM-DD'),
          exercises: [extractedExercise],
          type: determineActivityType([extractedExercise]),
          isRecurring: false,
          weeksToRepeat: 1,
        });
      }
    }

    // Final emergency fallback: if we still have no activity requests, force extract from user input
    if (activityRequests.length === 0) {
      console.log(
        'No activity patterns found in AI response, trying fallback parsing'
      );

      const userInputLower = userInput.toLowerCase();

      // Look for exercise keywords in user input
      const exerciseKeywords = [
        'deadlift',
        'squat',
        'bench',
        'press',
        'curl',
        'row',
        'cardio',
        'yoga',
        'run',
        'bike',
        'swim',
        'push-up',
        'pull-up',
        'sit-up',
        'plank',
        'burpee',
        'lunge',
        'dip',
        'chin-up',
        'face pull',
        'lateral raise',
        'overhead press',
        'leg press',
        'lat pulldown',
        'cable face pull',
        'dumbbell lateral raise',
      ];

      let foundExercise = '';

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
            `Emergency fallback: Created activity for "${foundExercise}" on ${dayText}`
          );

          activityRequests.push({
            date: targetDate.format('YYYY-MM-DD'),
            exercises: [foundExercise],
            type: determineActivityType([foundExercise]),
            isRecurring: false,
            weeksToRepeat: 1,
          });
        }
      }
    }

    return activityRequests;
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
      exerciseStr.includes('overhead press') ||
      exerciseStr.includes('hip thrust') ||
      exerciseStr.includes('calf raise') ||
      exerciseStr.includes('lateral raise') ||
      exerciseStr.includes('leg extension') ||
      exerciseStr.includes('leg curl')
    ) {
      return 'weight-training';
    }

    // Calisthenics - bodyweight exercises
    if (
      exerciseStr.includes('push-up') ||
      exerciseStr.includes('pull-up') ||
      exerciseStr.includes('sit-up') ||
      exerciseStr.includes('plank') ||
      exerciseStr.includes('burpee') ||
      exerciseStr.includes('mountain climber') ||
      exerciseStr.includes('jumping jack') ||
      exerciseStr.includes('dip') ||
      exerciseStr.includes('muscle-up') ||
      exerciseStr.includes('handstand') ||
      exerciseStr.includes('pistol squat') ||
      exerciseStr.includes('l-sit') ||
      exerciseStr.includes('planche')
    ) {
      return 'calisthenics';
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
      exerciseStr.includes('jog') ||
      exerciseStr.includes('jump rope') ||
      exerciseStr.includes('stair climber') ||
      exerciseStr.includes('hiit')
    ) {
      return 'cardio';
    }

    // Mobility - yoga, stretching, flexibility
    if (
      exerciseStr.includes('yoga') ||
      exerciseStr.includes('stretch') ||
      exerciseStr.includes('mobility') ||
      exerciseStr.includes('pilates') ||
      exerciseStr.includes('meditation') ||
      exerciseStr.includes('breathing') ||
      exerciseStr.includes('sun salutation') ||
      exerciseStr.includes('downward dog') ||
      exerciseStr.includes('pigeon pose') ||
      exerciseStr.includes("child's pose") ||
      exerciseStr.includes('cat-cow') ||
      exerciseStr.includes('hip flexor stretch') ||
      exerciseStr.includes('hamstring stretch') ||
      exerciseStr.includes('shoulder stretch') ||
      exerciseStr.includes('thoracic extension')
    ) {
      return 'mobility';
    }

    // Recovery - light activities, sauna, cold therapy
    if (
      exerciseStr.includes('walk') ||
      exerciseStr.includes('stroll') ||
      exerciseStr.includes('sauna') ||
      exerciseStr.includes('steam') ||
      exerciseStr.includes('massage') ||
      exerciseStr.includes('foam rolling') ||
      exerciseStr.includes('cold plunge') ||
      exerciseStr.includes('ice bath') ||
      exerciseStr.includes('cryotherapy')
    ) {
      return 'recovery';
    }

    // Sports - team and individual sports
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
      exerciseStr.includes('kayaking') ||
      exerciseStr.includes('paddleboarding') ||
      exerciseStr.includes('skateboarding') ||
      exerciseStr.includes('surfing') ||
      exerciseStr.includes('barre')
    ) {
      return 'sports';
    }

    // Default to other for unknown exercises
    return 'other';
  };

  const createActivitiesFromRequest = (activityRequests: any[]) => {
    const createdActivities = [];

    console.log('createActivitiesFromRequest called with:', activityRequests);

    for (const request of activityRequests) {
      try {
        // Validate the request has required fields
        if (!request.date || !request.exercises || !request.exercises.length) {
          console.log('Invalid activity request:', request);
          continue;
        }

        // Validate that exercises are not generic workout names
        const isGenericExercise = (exercise: string): boolean => {
          const lowerExercise = exercise.toLowerCase().trim();

          // List of obvious generic terms that shouldn't be exercise names
          const genericTerms = [
            'workout',
            'workouts',
            'exercise',
            'exercises',
            'activity',
            'activities',
            'routine',
            'routines',
            'training',
            'session',
            'sessions',
            'the following',
            'following',
            'pull workout',
            'push workout',
            'leg workout',
            'chest workout',
            'back workout',
            'full body workout',
            'arm workout',
            'shoulder workout',
            'it to my schedule',
            'my schedule',
            'to my schedule',
          ];

          return genericTerms.some(term => lowerExercise.includes(term));
        };

        const hasGenericExercises = request.exercises.some((exercise: string) =>
          isGenericExercise(exercise)
        );

        if (hasGenericExercises) {
          console.log(
            'Activity request contains generic exercise names, skipping:',
            request
          );
          continue;
        }

        // If there are multiple exercises, split into separate requests
        const exercises =
          request.exercises && request.exercises.length > 1
            ? request.exercises
            : null;
        if (exercises) {
          for (const exercise of exercises) {
            if (!exercise || typeof exercise !== 'string') {
              console.log('Invalid exercise:', exercise);
              continue;
            }

            if (request.isRecurring) {
              for (let week = 0; week < request.weeksToRepeat; week++) {
                const activityDate = dayjs(request.date).add(week * 7, 'day');
                const activity: Activity = {
                  id:
                    Date.now().toString() +
                    Math.random().toString(36).substr(2, 9) +
                    week,
                  date: activityDate.format('YYYY-MM-DD'),
                  type: determineActivityType([exercise]),
                  name: toTitleCase(exercise),
                  emoji:
                    ACTIVITY_EMOJIS[
                      determineActivityType([
                        exercise,
                      ]) as keyof typeof ACTIVITY_EMOJIS
                    ] || '💪',
                  completed: false,
                  notes: `Recurring activity (week ${week + 1}/${request.weeksToRepeat}) - Created by AI coach`,
                };
                dispatch(addActivity(activity));
                createdActivities.push(activity);
              }
            } else {
              const activity: Activity = {
                id:
                  Date.now().toString() +
                  Math.random().toString(36).substr(2, 9),
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
              dispatch(addActivity(activity));
              createdActivities.push(activity);
              console.log('Created individual activity:', activity);
            }
          }
        } else {
          // Single exercise or already split
          if (request.isRecurring) {
            for (let week = 0; week < request.weeksToRepeat; week++) {
              const activityDate = dayjs(request.date).add(week * 7, 'day');
              const activity: Activity = {
                id:
                  Date.now().toString() +
                  Math.random().toString(36).substr(2, 9) +
                  week,
                date: activityDate.format('YYYY-MM-DD'),
                type: request.type, // keep as enum value
                name: request.exercises.map(toTitleCase).join(', '),
                emoji:
                  ACTIVITY_EMOJIS[
                    request.type as keyof typeof ACTIVITY_EMOJIS
                  ] || '💪',
                completed: false,
                notes: `Recurring activity (week ${week + 1}/${request.weeksToRepeat}) - Created by AI coach`,
              };
              dispatch(addActivity(activity));
              createdActivities.push(activity);
            }
          } else {
            const activity: Activity = {
              id:
                Date.now().toString() + Math.random().toString(36).substr(2, 9),
              date: request.date,
              type: request.type, // keep as enum value
              name: request.exercises.map(toTitleCase).join(', '),
              emoji:
                ACTIVITY_EMOJIS[request.type as keyof typeof ACTIVITY_EMOJIS] ||
                '💪',
              completed: false,
              notes: `Created by AI coach based on your request`,
            };
            dispatch(addActivity(activity));
            createdActivities.push(activity);
            console.log('Created combined activity:', activity);
          }
        }
      } catch (error) {
        console.error('Error creating activity from request:', request, error);
      }
    }

    console.log(
      `Successfully created ${createdActivities.length} activities out of ${activityRequests.length} requests`
    );
    return createdActivities;
  };

  const handleSend = async () => {
    if (!inputText.trim() || isProcessing) return;

    setIsProcessing(true);

    // Store the input text and clear immediately
    const currentInput = inputText.trim();

    // Clear input immediately and force a re-render
    setInputText('');

    // Force focus to ensure the input field updates
    setTimeout(() => {
      setInputText('');
    }, 0);

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      text: currentInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Create system prompt with activity context
      const systemPrompt = `You are an AI fitness coach. You can help users create activity plans, provide advice, and manage their fitness routine.

**IMPORTANT: Use Markdown formatting in your responses to make them more readable and visually appealing.**

**Markdown Formatting Guidelines:**
- Use **bold** for emphasis and important points
- Use *italic* for secondary emphasis
- Use \`code\` for exercise names and technical terms
- Use \`\`\`code blocks\`\`\` for workout examples
- Use > blockquotes for tips and advice
- Use bullet points (- or *) for lists
- Use numbered lists (1. 2. 3.) for step-by-step instructions
- Use ## Headers for section breaks
- Use --- for horizontal rules to separate sections

**Examples of good markdown usage:**
- **Great job on your workout today!** 💪
- Here's a \`Bench Press\` form tip: *Keep your feet flat on the ground*
- > **Pro tip:** Always warm up before heavy lifts
- Your **Monday workout** includes:
  - \`Squat\` - 3 sets of 8 reps
  - \`Deadlift\` - 3 sets of 6 reps
  - \`Bench Press\` - 3 sets of 8 reps

${activityContext}

COMPREHENSIVE EXERCISE DATABASE:
I have access to a detailed exercise database with the following information for each exercise:
- Name (exact Title Case)
- Activity Type (Weight Training, Cardio, HIIT, Yoga, etc.)
- Category (Compound, Isolation, Cardiovascular, Core, etc.)
- Muscle Groups targeted
- Equipment needed
- Difficulty level (Beginner, Intermediate, Advanced)
- Description and variations

AVAILABLE EXERCISES (use these exact names in Title Case):
${EXERCISE_DATABASE.map(ex => ex.name).join(', ')}

AVAILABLE ACTIVITY TYPES (use these exact names in Title Case):
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
1. Create activities by mentioning "I've scheduled [exercises] for [date]"
2. Create recurring activities by mentioning "I've scheduled [exercises] for [day] (recurring weekly for X weeks)"
3. Add new exercises to the user's library by simply using them in activity creation
4. Provide fitness advice and motivation
5. Analyze activity patterns and suggest improvements
6. Help with exercise form and technique
7. Suggest exercises based on muscle groups, activity types, or categories
8. Recommend exercise variations and progressions

CRITICAL ACTIVITY CREATION RULES - READ CAREFULLY:

1. ALWAYS CREATE SPECIFIC EXERCISES, NEVER GENERIC WORKOUTS:
   - WRONG: "I've scheduled a pull workout with 3 exercises for Monday"
   - CORRECT: "I've scheduled Deadlift, Barbell Row, and Lat Pulldown for Monday"
   - WRONG: "I've scheduled a chest workout for Tuesday"
   - CORRECT: "I've scheduled Bench Press, Incline Dumbbell Press, and Cable Flyes for Tuesday"

2. ALWAYS USE EXACT EXERCISE NAMES:
   - Use the exact names from the exercise database when available
   - For new exercises, use proper Title Case (e.g., "Cable Face Pulls", "Dumbbell Lateral Raises")
   - Never use generic terms like "workout", "exercises", "routine", etc.

3. ALWAYS SEPARATE MULTIPLE EXERCISES WITH COMMAS:
   - CORRECT: "I've scheduled Bench Press, Deadlift, and Squat for Monday"
   - WRONG: "I've scheduled Bench Press Deadlift Squat for Monday"

4. ALWAYS SPECIFY THE DAY/DATE:
   - CORRECT: "I've scheduled Deadlift for Monday"
   - WRONG: "I've scheduled Deadlift"

5. ALWAYS USE THE EXACT FORMAT: "I've scheduled [exercise names] for [day]"
   - This is the ONLY format that will work
   - Never add extra words, explanations, or verbose language
   - Never use phrases like "added to your library", "scheduled it", etc.

6. FOR LARGE WORKOUTS, BREAK THEM INTO INDIVIDUAL EXERCISES:
   - If a user asks for a "full body workout", create specific exercises like:
     "I've scheduled Squat, Bench Press, Deadlift, Overhead Press, and Barbell Row for Monday"
   - If a user asks for a "push day", create specific exercises like:
     "I've scheduled Bench Press, Incline Press, Overhead Press, Tricep Dips, and Lateral Raises for Tuesday"

7. FOR COMPOUND EXERCISES, KEEP THEM TOGETHER:
   - CORRECT: "I've scheduled Bench Press for Monday"
   - WRONG: "I've scheduled Bench, Press for Monday"

8. FOR NEW EXERCISES NOT IN DATABASE:
   - Just use the exercise name directly: "I've scheduled Cable Face Pulls for Monday"
   - Don't add any extra text about adding to library

9. ALWAYS HANDLE LARGE LISTS:
   - If a user provides a long list of exercises, create them all
   - Example: "I've scheduled Squat, Deadlift, Bench Press, Overhead Press, Barbell Row, Lat Pulldown, Face Pulls, Lateral Raises, Bicep Curls, and Tricep Extensions for Monday"

10. NEVER CREATE GENERIC ACTIVITIES:
    - Never create activities with names like "A Pull Workout With 3 Exercises"
    - Always specify the actual exercise names
    - If you can't determine specific exercises, ask the user to clarify

IMPORTANT ACTIVITY SCHEDULING RULES:
- When creating activities, you can schedule them for today, tomorrow, or any day of the week
- For recurring activities, default to 4 weeks unless specified otherwise
- Don't move or modify existing activities when adding new ones
- If duration is not specified, use 4 weeks as default
- Be specific about the exercises and date
- Don't ask follow-up questions unless absolutely necessary
- When a user asks to add an activity, just create it with reasonable defaults
- ALWAYS use Title Case for all activity and exercise names/types (e.g., "Bench Press", "Overhead Press", "Weight Training")
- ALWAYS use the exact exercise names the user requests (e.g., "Overhead Presses" not "Overhead, Presses")
- Keep compound exercise names together (e.g., "Bench Press", "Deadlift", "Push-Ups")
- If a user requests an exercise not in the available list, add it to their library automatically
- Consider exercise categories and muscle groups when suggesting activities
- Match activity types appropriately (e.g., "Bench Press" is weight-training, "Run" is cardio, "Yoga Flow" is mobility)

ACTIVITY COPYING INSTRUCTIONS:
When a user asks to "copy" or "duplicate" activities from one week to another:
1. COPYING A SINGLE DAY: If they say "copy Monday's activities to next Monday" or "duplicate Tuesday to next Tuesday":
   - Find all activities for the specified day of this week
   - Create new activities for the same day of next week (7 days later)
   - Use the format: "I've scheduled [exercise names] for [next week's day]"
   - Example: "I've scheduled Bench Press and Deadlift for next Monday"

2. COPYING AN ENTIRE WEEK: If they say "copy all activities from this week to next week" or "duplicate this week's activities":
   - Find all activities for each day of this week (Monday through Sunday)
   - Create new activities for the corresponding days of next week
   - Use the format: "I've scheduled [exercise names] for [next week's day]" for each day
   - Example: "I've scheduled Squat and Leg Press for next Tuesday" and "I've scheduled Bench Press for next Wednesday"

3. COPYING TO A SPECIFIC WEEK: If they say "copy this week's activities to week of [date]" or "duplicate to [specific week]":
   - Calculate the target week based on the specified date
   - Create new activities for the corresponding days of that target week
   - Use the format: "I've scheduled [exercise names] for [target week's day]"

CRITICAL COPYING RULES:
- When copying to "next week", add 7 days to the current date
- When copying to a specific week, calculate the correct dates based on the target week
- Maintain the same day-of-week pattern (Monday stays Monday, Tuesday stays Tuesday, etc.)
- Copy ALL exercises from each day, not just some of them
- Use the exact same exercise names and activity types
- Don't modify or combine exercises when copying - keep them exactly as they are

RESPONSE FORMAT FOR ACTIVITY CREATION:
When creating activities, use this exact format: "I've scheduled [exercise names] for [day]"
Examples:
- "I've scheduled Overhead Presses for Monday"
- "I've scheduled Bench Press and Deadlifts for Wednesday"
- "I've scheduled Push-Ups and Pull-Ups for Friday"
- "I've scheduled Deadlift for today"
- "I've scheduled Squat, Bench Press, Deadlift, Overhead Press, Barbell Row, Lat Pulldown, Face Pulls, Lateral Raises, Bicep Curls, and Tricep Extensions for Monday"

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
- Weight Training: deadlift, squat, bench, press, curl, extension, row, pulldown, fly, lunge, hip thrust, calf raise, lateral raise, leg extension, leg curl
- Calisthenics: push-up, pull-up, sit-up, plank, burpee, mountain climber, jumping jack, dip, muscle-up, handstand, pistol squat, l-sit, planche
- Cardio: run, bike, cycling, swim, rowing, elliptical, treadmill, jog, jump rope, stair climber, hiit
- Mobility: yoga, stretch, mobility, pilates, meditation, breathing, sun salutation, downward dog, pigeon pose, child's pose, cat-cow, hip flexor stretch, hamstring stretch, shoulder stretch, thoracic extension
- Recovery: walk, stroll, sauna, steam, massage, foam rolling, cold plunge, ice bath, cryotherapy
- Sports: paddle, surf, tennis, basketball, soccer, football, volleyball, baseball, hockey, golf, rock climb, hike, ski, snowboard, skate, dance, martial arts, boxing, kickbox, crossfit, kayaking, paddleboarding, skateboarding, surfing, barre
- Other: any other activities not fitting the above categories

USER INPUT EXAMPLES:
Users will say things like:
- "Add paddle boarding to Wednesday"
- "Add bench press to Monday, 3 sets of 10 reps at 32.5 lbs"
- "Add overhead presses to this Monday"
- "Add face pulls to Monday"
- "Add deadlift to today"
- "Copy Monday's activities to next Monday"
- "Copy all activities from this week to next week"
- "Duplicate Tuesday's activities to next Tuesday"
- "Copy this week's activities to the week of July 15"
- "Create a full body workout for Monday"
- "Add a push day for Tuesday"
- "Create a pull workout for Wednesday"

Always respond with the simple format regardless of how the user phrases their request.

COPYING EXAMPLES:
When copying activities, respond like this:
- "I've scheduled Bench Press and Deadlift for next Monday"
- "I've scheduled Squat and Leg Press for next Tuesday"
- "I've scheduled Dumbbell Row and Lat Pulldown for next Wednesday"

WORKOUT CREATION EXAMPLES:
When creating workouts, respond like this:
- "I've scheduled Squat, Bench Press, Deadlift, Overhead Press, and Barbell Row for Monday"
- "I've scheduled Bench Press, Incline Press, Overhead Press, Tricep Dips, and Lateral Raises for Tuesday"
- "I've scheduled Deadlift, Barbell Row, Lat Pulldown, Face Pulls, and Bicep Curls for Wednesday"

Keep responses conversational and helpful. If creating activities, be specific about the exercises, date, and recurrence. Don't get stuck in loops asking for more information.`;

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

      // Lower temperature for activity creation (more consistent)
      // Higher temperature for motivational responses (more creative)
      const getTemperature = (userInput: string): number => {
        const activityKeywords = [
          'add',
          'schedule',
          'create',
          'copy',
          'duplicate',
        ];
        const isActivityRequest = activityKeywords.some(keyword =>
          userInput.toLowerCase().includes(keyword)
        );
        return isActivityRequest ? 0.3 : 0.7;
      };

      const response = await openai.chat.completions
        .create({
          model: 'gpt-4o-mini',
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

      // Check if the response contains activity creation
      const activityRequests = await parseActivityFromResponse(
        botResponse,
        currentInput
      );
      let finalResponse = botResponse;

      // Create activities if any were requested
      let createdActivities: Activity[] = [];
      if (activityRequests.length > 0) {
        console.log('Creating activities from AI response:', activityRequests);
        createdActivities = createActivitiesFromRequest(activityRequests);
        console.log('Created activities:', createdActivities.length);

        // Check if activities were actually created and provide honest feedback
        if (createdActivities.length === 0) {
          finalResponse =
            "I'm sorry, I wasn't able to create the activities you requested. Please try again with a different format or check your request.";
        } else {
          // Success! Don't show confusing messages about "formatting issues"
          // The system correctly splits workout requests into individual exercises
          console.log(
            `Successfully created ${createdActivities.length} activities from ${activityRequests.length} workout requests`
          );
        }
      }

      // Remove the checkmark summary block
      // if (activityRequests.length > 0) { ... finalResponse += `\n\n${summary}`; }

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
      // Ensure input is cleared even if there was an error
      setInputText('');
    }
  };

  const startNewChat = () => {
    setMessages([
      {
        id: '1',
        type: 'bot',
        text: '## 👋 Welcome to Your AI Fitness Coach!\n\nI\'m here to help you **crush your fitness goals** and build the best version of yourself! 💪\n\n### What I can do for you:\n- 🏋️ **Create personalized workout plans**\n- 📅 **Schedule activities** for any day\n- 💡 **Provide exercise tips and form advice**\n- 🎯 **Track your progress** and suggest improvements\n- 🏃 **Recommend exercises** based on your goals\n\n### Just ask me things like:\n- "Create a push day workout for Monday"\n- "Add deadlifts to today\'s routine"\n- "What\'s a good exercise for my back?"\n- "Copy this week\'s workouts to next week"\n\n**What are your fitness goals?** Let\'s get started! 🚀',
        timestamp: new Date(),
      },
    ]);
    // Always create a new session ID when starting a new chat
    const newSessionId = Date.now().toString();
    setCurrentSessionId(newSessionId);
    setActiveTab('chat');

    // Remove any existing session with the old ID from storage
    if (currentSessionId) {
      setChatHistory(prevHistory => {
        const updatedHistory = prevHistory.filter(
          s => s.id !== currentSessionId
        );
        saveChatHistory(updatedHistory);
        return updatedHistory;
      });
    }
  };

  const renderChatHistory = () => {
    return (
      <View className="flex-1">
        <ScrollView className="flex-1 px-4 pt-4">
          <TouchableOpacity
            hitSlop={14}
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
                hitSlop={14}
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
                    hitSlop={14}
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
          hitSlop={14}
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
          hitSlop={14}
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
                  {message.type === 'user' ? (
                    <Text
                      style={{
                        color: '#fff',
                      }}
                    >
                      {message.text}
                    </Text>
                  ) : (
                    <Markdown
                      style={{
                        body: {
                          color: isDark ? '#fff' : '#111',
                          fontSize: 16,
                          lineHeight: 22,
                        },
                        heading1: {
                          color: isDark ? '#fff' : '#111',
                          fontSize: 20,
                          fontWeight: 'bold',
                          marginTop: 8,
                          marginBottom: 4,
                        },
                        heading2: {
                          color: isDark ? '#fff' : '#111',
                          fontSize: 18,
                          fontWeight: 'bold',
                          marginTop: 6,
                          marginBottom: 3,
                        },
                        heading3: {
                          color: isDark ? '#fff' : '#111',
                          fontSize: 16,
                          fontWeight: 'bold',
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
                          fontWeight: 'bold',
                          color: isDark ? '#fff' : '#111',
                        },
                        em: {
                          fontStyle: 'italic',
                          color: isDark ? '#fff' : '#111',
                        },
                        link: {
                          color: isDark ? '#3b82f6' : '#2563eb',
                          textDecorationLine: 'underline',
                        },
                      }}
                    >
                      {message.text}
                    </Markdown>
                  )}
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
                hitSlop={14}
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
