import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import OpenAI from 'openai';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AppHeader, { AppHeaderTitle } from '../components/AppHeader';
import { ChatSuggestions } from '../components/ChatSuggestions';
import { WorkoutContentWithLinks } from '../components/WorkoutContentWithLinks';
import { OPENAI_CONFIG, isBackendConfigured } from '../config/api';
import { useAuth } from '../context/AuthContext';
import {
  sendChatMessage,
  getChatSessions,
  getChatSession,
  deleteChatSession,
} from '../services/chatApi';
import { getEmojiForType } from '../services/activityTypeService';
import {
  buildCoachAnalytics,
  formatAnalyticsForPrompt,
} from '../services/coachAnalyticsService';
import { addActivity } from '../redux/activitySlice';
import { RootState } from '../redux/store';
import { useTheme } from '../theme/ThemeContext';
import { Activity, ActivityType } from '../types/activity';
import { useWeekBoundaries } from '../hooks/useWeekBoundaries';
import { toTitleCase } from '../utils/storage';

import { palette } from '../theme/colors';

const GLOW_COLOR_LIGHT = palette.blue[400];
const GLOW_COLOR_DARK = palette.blue[500];

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
  const [showAllHistory, setShowAllHistory] = useState(false);

  const HISTORY_PREVIEW_COUNT = 5;
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  // Add ref for ScrollView, last bot message, and last user message
  const scrollViewRef = useRef<ScrollView>(null);
  const lastBotMessageRef = useRef<View>(null);
  const lastUserMessageRef = useRef<View>(null);

  const dispatch = useDispatch();
  const activities = useSelector((state: RootState) => state.activities.data);
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';
  const { user, getAccessToken } = useAuth();
  const isAuthenticated = Boolean(user) && isBackendConfigured();
  const { getWeekStart, getWeekEnd } = useWeekBoundaries();

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

  // Get user-specific storage key
  const chatHistoryKey = `chat_history_${user?.id || 'anonymous'}`;

  // Load chat history on mount and when user changes
  useEffect(() => {
    // Reset to initial state when user changes
    setMessages([
      {
        id: '1',
        type: 'bot',
        text: '## 👋 Welcome to Your AI Fitness Coach!\n\nI\'m here to help you **crush your fitness goals** and build the best version of yourself! 💪\n\n### What I can do for you:\n- 🏋️ **Create personalized workout plans**\n- 📅 **Schedule activities** for any day\n- 💡 **Provide exercise tips and form advice**\n- 🎯 **Track your progress** and suggest improvements\n- 🏃 **Recommend exercises** based on your goals\n\n### Just ask me things like:\n- "Create a push day workout for Monday"\n- "Add deadlifts to today\'s routine"\n- "What\'s a good exercise for my back?"\n- "Copy this week\'s workouts to next week"\n\n**What are your fitness goals?** Let\'s get started! 🚀',
        timestamp: new Date(),
      },
    ]);
    setChatHistory([]);
    setCurrentSessionId(Crypto.randomUUID());
    loadChatHistory();
  }, [user?.id]);

  // Auto-scroll when messages change or processing state changes
  useEffect(() => {
    if (scrollViewRef.current && (messages.length > 0 || isProcessing)) {
      setTimeout(
        () => {
          if (isProcessing) {
            // When processing (showing "Thinking..."), scroll to end
            scrollViewRef.current?.scrollToEnd({ animated: true });
          } else {
            // When new bot message is received, scroll to show top of the message
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.type === 'bot' && lastBotMessageRef.current) {
              lastBotMessageRef.current.measureLayout(
                scrollViewRef.current as any,
                (x, y) => {
                  scrollViewRef.current?.scrollTo({
                    y: Math.max(0, y - 20), // Add small padding from top
                    animated: true,
                  });
                },
                () => {
                  // Fallback to scroll to end if measurement fails
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }
              );
            } else {
              // For user messages or when ref not available, scroll to end
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }
          }
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
      // Try to load from server if authenticated
      if (isAuthenticated) {
        const token = getAccessToken();
        if (token) {
          try {
            const sessions = await getChatSessions(token);
            const formattedSessions: ChatSession[] = sessions.map(s => ({
              id: s.id,
              title: s.title,
              messages: [], // Messages loaded on demand
              timestamp: new Date(s.updated_at),
            }));
            setChatHistory(formattedSessions);
            return;
          } catch (err) {
            console.error(
              'Failed to load from server, falling back to local:',
              err
            );
          }
        }
      }
      // Fall back to local storage (user-specific key)
      const history = await AsyncStorage.getItem(chatHistoryKey);
      if (history) {
        setChatHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const saveChatHistory = async (newHistory: ChatSession[]) => {
    try {
      await AsyncStorage.setItem(chatHistoryKey, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  const saveCurrentSession = useCallback(async () => {
    if (messages.length <= 1) return; // Don't save if only initial message

    // Find the first user message for the title
    const firstUserMessage = messages.find(m => m.type === 'user');
    const sessionTitle = firstUserMessage
      ? firstUserMessage.text.substring(0, 50)
      : 'Chat Session';

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

    // Get this week's activities (based on user's first day preference)
    const startOfWeek = getWeekStart();
    const endOfWeek = getWeekEnd();
    const thisWeekActivities = activities.filter(a => {
      const activityDate = dayjs(a.date);
      return (
        activityDate.isSameOrAfter(startOfWeek, 'day') &&
        activityDate.isSameOrBefore(endOfWeek, 'day')
      );
    });

    // Add today's date at the start for explicit date calculations
    const today = dayjs();
    const formattedToday = today.format('dddd, MMMM D, YYYY');

    // Build analytics from activity data
    const analytics = buildCoachAnalytics(activities);
    const analyticsContext = formatAnalyticsForPrompt(analytics);

    let context = `Today's date: ${formattedToday}\n\n`;

    // Add user analytics section
    context += `User analytics (last 30 days):\n${analyticsContext}\n\n`;

    // Add activity context
    context += `Current activity context:\n`;
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
  }, [activities, getWeekStart, getWeekEnd]);

  const loadSession = async (session: ChatSession) => {
    // If authenticated and session has no messages (loaded from server), fetch them
    if (isAuthenticated && session.messages.length === 0) {
      const token = getAccessToken();
      if (token) {
        try {
          const { messages: serverMessages } = await getChatSession(
            token,
            session.id
          );
          const formattedMessages = serverMessages.map((m, idx) => ({
            id: `${session.id}-${idx}`,
            type: m.role === 'user' ? ('user' as const) : ('bot' as const),
            text: m.content,
            timestamp: new Date(),
          }));
          setMessages(
            formattedMessages.length > 0
              ? formattedMessages
              : [
                  {
                    id: '1',
                    type: 'bot' as const,
                    text: "## 👋 Welcome to Your AI Fitness Coach!\n\nI'm here to help you **crush your fitness goals** and build the best version of yourself! 💪",
                    timestamp: new Date(),
                  },
                ]
          );
          setCurrentSessionId(session.id);
          setActiveTab('chat');
          return;
        } catch (err) {
          console.error('Failed to load session from server:', err);
        }
      }
    }
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
            // Delete from server if authenticated
            if (isAuthenticated) {
              const token = getAccessToken();
              if (token) {
                try {
                  await deleteChatSession(token, sessionId);
                } catch (err) {
                  console.error('Failed to delete from server:', err);
                }
              }
            }

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

  const createActivitiesFromRequest = (activityRequests: any[]) => {
    const createdActivities = [];

    for (const request of activityRequests) {
      try {
        // Validate the request has required fields
        if (!request.date || !request.exercises || !request.exercises.length) {
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
          continue;
        }

        // If there are multiple exercises, split into separate activities
        const exercises =
          request.exercises && request.exercises.length > 1
            ? request.exercises
            : null;
        if (exercises) {
          for (const exercise of exercises) {
            if (!exercise || typeof exercise !== 'string') {
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
                  type: request.type,
                  name: toTitleCase(exercise),
                  emoji: getEmojiForType(request.type),
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
                type: request.type,
                name: toTitleCase(exercise),
                emoji: getEmojiForType(request.type),
                completed: false,
                notes: `Created by AI coach based on your request`,
              };
              dispatch(addActivity(activity));
              createdActivities.push(activity);
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
                emoji: getEmojiForType(request.type),
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
              emoji: getEmojiForType(request.type),
              completed: false,
              notes: `Created by AI coach based on your request`,
            };
            dispatch(addActivity(activity));
            createdActivities.push(activity);
          }
        }
      } catch (error) {
        console.error('Error creating activity from request:', request, error);
      }
    }
    return createdActivities;
  };

  const handleSuggestionPress = (suggestion: string) => {
    setInputText(suggestion);
  };

  const [selectedMessage, setSelectedMessage] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleMessageLongPress = (messageText: string, messageId: string) => {
    setSelectedMessage({ id: messageId, text: messageText });
  };

  const handleCopyMessage = async () => {
    if (selectedMessage) {
      await Clipboard.setStringAsync(selectedMessage.text);
      setCopiedMessageId(selectedMessage.id);
      setSelectedMessage(null);
      setTimeout(() => setCopiedMessageId(null), 1500);
    }
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

      let botResponse: string;
      let activityRequests: any[] = [];

      // Use backend API if authenticated, otherwise use direct OpenAI
      if (isAuthenticated) {
        const token = getAccessToken();
        if (!token) {
          throw new Error('No access token available');
        }
        // Send user/assistant messages only - backend handles system prompt, temperature, and activity parsing
        const allMessages = [
          ...conversationHistory,
          { role: 'user' as const, content: currentInput },
        ];
        // Use current input for title if this is the first user message, otherwise use first user message
        const isFirstUserMessage = messages.length === 1; // Only welcome message exists
        const sessionTitle = isFirstUserMessage
          ? currentInput.substring(0, 50)
          : messages[1]?.text?.substring(0, 50) || 'Chat Session';

        const response = await sendChatMessage(token, allMessages, {
          activityContext,
          sessionId: currentSessionId,
          sessionTitle,
        });
        botResponse =
          response.message.content || "Sorry, I couldn't process that request.";
        // Activities are parsed by the backend
        activityRequests = response.activities || [];
      } else {
        // Fallback for unauthenticated users - minimal system prompt, no activity parsing
        const fallbackSystemPrompt = `You are an AI fitness coach. Help with workouts, nutrition, sleep, recovery, motivation, and any health/wellness topics. Only redirect if asked about something completely unrelated (like coding or math).

Use Markdown formatting. ${activityContext}`;
        const response = await openai.chat.completions
          .create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: fallbackSystemPrompt },
              ...conversationHistory,
              { role: 'user', content: currentInput },
            ],
            max_tokens: 1000,
            temperature: 0.7,
          })
          .catch(error => {
            console.error('OpenAI API Error:', error);
            throw new Error('Failed to get AI response');
          });
        botResponse =
          response.choices[0]?.message?.content ||
          "Sorry, I couldn't process that request.";
        // No activity parsing for unauthenticated users
      }

      let finalResponse = botResponse;

      // Create activities if any were requested
      let createdActivities: Activity[] = [];
      if (activityRequests.length > 0) {
        createdActivities = createActivitiesFromRequest(activityRequests);

        // Check if activities were actually created and provide honest feedback
        if (createdActivities.length === 0) {
          finalResponse =
            "I'm sorry, I wasn't able to create the activities you requested. Please try again with a different format or check your request.";
        } else {
          // Success! Don't show confusing messages about "formatting issues"
          // The system correctly splits workout requests into individual exercises
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

      // Save session after each message and refresh history
      setTimeout(() => {
        saveCurrentSession();
        loadChatHistory(); // Refresh history to show new/updated session
      }, 100);
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
    const newSessionId = Crypto.randomUUID();
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
          {chatHistory.length === 0 ? (
            <View className="items-center py-8">
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text
                className="text-lg font-medium mt-4"
                style={{ color: colors.text }}
              >
                No chat history
              </Text>
              <Text
                style={{ color: colors.textSecondary }}
                className="text-center mt-2"
              >
                Start a conversation to see your chat history here
              </Text>
            </View>
          ) : (
            <>
              {(showAllHistory
                ? chatHistory
                : chatHistory.slice(0, HISTORY_PREVIEW_COUNT)
              ).map(session => (
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
                        style={{ color: colors.text }}
                      >
                        {session.title}
                      </Text>
                      <Text
                        style={{ color: colors.textSecondary }}
                        className="text-sm mt-1"
                      >
                        {dayjs(session.timestamp).format('MMM D, YYYY h:mm A')}
                      </Text>
                      <Text
                        style={{ color: colors.textSecondary }}
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
                        color={colors.error.main}
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Show More / Show Less Button */}
              {chatHistory.length > HISTORY_PREVIEW_COUNT && (
                <TouchableOpacity
                  onPress={() => setShowAllHistory(!showAllHistory)}
                  hitSlop={14}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 12,
                    marginTop: 4,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showAllHistory
                      ? 'Show fewer sessions'
                      : `Show ${chatHistory.length - HISTORY_PREVIEW_COUNT} more sessions`
                  }
                >
                  <Ionicons
                    name={showAllHistory ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.primary.main}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{ color: colors.primary.main, fontWeight: '500' }}
                  >
                    {showAllHistory
                      ? 'Show Less'
                      : `Show ${chatHistory.length - HISTORY_PREVIEW_COUNT} More`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      </View>
    );
  };

  // Show login wall for unauthenticated users
  if (!isAuthenticated) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <AppHeader>
          <AppHeaderTitle title="AI Coach" subtitle="Powered by ChatGPT" />
        </AppHeader>
        <View className="flex-1 px-6 pt-4">
          <View
            className="items-center p-8 rounded-2xl"
            style={{
              backgroundColor: colors.cardBackground,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.3 : 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={64}
              color={colors.primary.main}
            />
            <Text
              className="text-xl font-bold mt-4 text-center"
              style={{ color: colors.text }}
            >
              Sign In to Get Started
            </Text>
            <Text
              className="text-center mt-2 mb-6"
              style={{ color: colors.textSecondary }}
            >
              Create an account or sign in to chat with your AI fitness coach
            </Text>
            <TouchableOpacity
              className="px-8 py-3 rounded-full"
              style={{ backgroundColor: colors.primary.main }}
              onPress={() => navigation.navigate('Auth')}
            >
              <Text className="text-white font-semibold text-base">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <AppHeader
        leftAction={
          <TouchableOpacity
            onPress={startNewChat}
            hitSlop={14}
            className="p-2 items-center"
            accessibilityLabel="Start new chat"
            accessibilityRole="button"
          >
            <Ionicons
              name="create-outline"
              size={24}
              color={colors.textSecondary}
            />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 10,
                marginTop: 2,
              }}
            >
              New Chat
            </Text>
          </TouchableOpacity>
        }
      >
        <AppHeaderTitle title="AI Coach" subtitle="Powered by ChatGPT" />
      </AppHeader>

      {/* Tab Navigation */}
      <View
        className="flex-row border-b"
        style={{ borderBottomColor: colors.border }}
      >
        <TouchableOpacity
          hitSlop={14}
          className={`flex-1 py-3 ${activeTab === 'chat' ? '' : ''}`}
          style={{
            backgroundColor:
              activeTab === 'chat' ? colors.primary.main : 'transparent',
            borderBottomWidth: activeTab === 'chat' ? 2 : 0,
            borderBottomColor: colors.primary.main,
          }}
          onPress={() => setActiveTab('chat')}
        >
          <Text
            className="text-center font-medium"
            style={{
              color:
                activeTab === 'chat'
                  ? colors.textInverse
                  : colors.textSecondary,
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
              activeTab === 'history' ? colors.primary.main : 'transparent',
            borderBottomWidth: activeTab === 'history' ? 2 : 0,
            borderBottomColor: colors.primary.main,
          }}
          onPress={() => setActiveTab('history')}
        >
          <Text
            className="text-center font-medium"
            style={{
              color:
                activeTab === 'history'
                  ? colors.textInverse
                  : colors.textSecondary,
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
            accessibilityLiveRegion="polite"
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
                {message.type === 'user' ? (
                  <TouchableOpacity
                    onLongPress={() =>
                      handleMessageLongPress(message.text, message.id)
                    }
                    delayLongPress={300}
                    activeOpacity={0.8}
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      isDark ? 'bg-blue-700' : 'bg-blue-500'
                    }`}
                  >
                    {copiedMessageId === message.id && (
                      <View
                        className="absolute -top-8 left-1/2 px-2 py-1 rounded"
                        style={{
                          backgroundColor: colors.success.main,
                          transform: [{ translateX: -24 }],
                        }}
                      >
                        <Text className="text-white text-xs font-medium">
                          Copied!
                        </Text>
                      </View>
                    )}
                    <Text style={{ color: '#fff' }}>{message.text}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onLongPress={() =>
                      handleMessageLongPress(message.text, message.id)
                    }
                    delayLongPress={300}
                    activeOpacity={0.8}
                    className="w-full"
                  >
                    {copiedMessageId === message.id && (
                      <View
                        className="absolute -top-8 left-0 px-2 py-1 rounded"
                        style={{ backgroundColor: colors.success.main }}
                      >
                        <Text className="text-white text-xs font-medium">
                          Copied!
                        </Text>
                      </View>
                    )}
                    <WorkoutContentWithLinks
                      text={message.text}
                      isDark={isDark}
                    />
                  </TouchableOpacity>
                )}
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
                    outputRange: [0.3, 1],
                  }),
                  shadowRadius: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 20],
                  }),
                  elevation: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [2, 10],
                  }),
                }}
              >
                <View
                  className={`px-4 py-3 rounded-2xl ${
                    isDark
                      ? 'bg-[#18181b] border border-[#333]'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <Text style={{ color: colors.textSecondary }}>
                    Thinking...
                  </Text>
                </View>
              </Animated.View>
            )}
          </ScrollView>

          <ChatSuggestions
            onSuggestionPress={handleSuggestionPress}
            visible={!isProcessing}
            chatSessionId={currentSessionId}
          />

          <View
            style={{
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            }}
            className="p-4 border-t"
          >
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 bg-gray-100 p-3 rounded-2xl mr-3"
                placeholder="Ask your AI coach anything..."
                placeholderTextColor={colors.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                editable={!isProcessing}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
                returnKeyType="send"
                style={{
                  color: colors.text,
                  backgroundColor: colors.inputBackground,
                  maxHeight: 120,
                }}
              />
              <TouchableOpacity
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                style={{
                  backgroundColor: isProcessing
                    ? colors.textSecondary
                    : colors.primary.main,
                }}
                className="w-11 h-11 rounded-full items-center justify-center"
                onPress={handleSend}
                disabled={isProcessing}
                accessibilityRole="button"
                accessibilityLabel={
                  isProcessing ? 'Processing message' : 'Send message'
                }
                accessibilityState={{ disabled: isProcessing }}
                accessibilityHint={
                  isProcessing ? 'Please wait for response' : undefined
                }
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white text-lg">→</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        renderChatHistory()
      )}

      {/* Copy Message Modal */}
      <Modal
        visible={selectedMessage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMessage(null)}
      >
        <Pressable
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setSelectedMessage(null)}
        >
          <View
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: colors.modalBackground,
              minWidth: 200,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <TouchableOpacity
              className="flex-row items-center px-5 py-4"
              onPress={handleCopyMessage}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={20} color={colors.text} />
              <Text
                className="text-base font-medium ml-3"
                style={{ color: colors.text }}
              >
                Copy Message
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
