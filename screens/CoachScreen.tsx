import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
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
import { StreamingText } from '../components/StreamingText';
import { WorkoutContentWithLinks } from '../components/WorkoutContentWithLinks';
import {
  getBackendConfigErrorMessage,
  isBackendConfigured,
} from '../config/api';
import { useAuth } from '../context/AuthContext';
import {
  streamChatMessage,
  getChatSessions,
  getChatSession,
  deleteChatSession,
  ChatErrorCode,
} from '../services/chatApi';
import { buildCoachActivityContext } from '../services/coachAnalyticsService';
import { createActivitiesFromRequest } from '../services/activityScheduler';
import { generateAndSchedulePlan } from '../services/planGenerationService';
import { AppDispatch, RootState } from '../redux/store';
import { useTheme } from '../theme/ThemeContext';
import { useTabBarInset } from '../hooks/useTabBarInset';
import { useWeekBoundaries } from '../hooks/useWeekBoundaries';
import { useEntitlements } from '../context/EntitlementContext';
import { useCoachProfile } from '../context/CoachProfileContext';
import CoachGate from '../components/coach/CoachGate';
import RescheduleSheet from '../components/coach/RescheduleSheet';
import CoachDashboard from './coach/CoachDashboard';
import OnboardingFlowScreen from './onboarding/OnboardingFlowScreen';

import { palette } from '../theme/colors';

const GLOW_COLOR_LIGHT = palette.blue[400];
const GLOW_COLOR_DARK = palette.blue[500];

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

interface ChatSession {
  id: string;
  title: string;
  messages: any[];
  timestamp: Date;
}

export default function CoachScreen({ navigation, route }: any) {
  // Top-level Coach view: dashboard (default landing) vs the chat below.
  const [view, setView] = useState<'dashboard' | 'chat'>('dashboard');
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [onboardingStart, setOnboardingStart] = useState<'welcome' | 'review'>(
    'welcome'
  );
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [messages, setMessages] = useState([
    {
      id: '1',
      type: 'bot',
      text: '## Welcome to Your AI Fitness Coach\n\nI\'m here to help you **crush your fitness goals** and build the best version of yourself.\n\n### What I can do for you:\n- **Create personalized workout plans**\n- **Schedule activities** for any day\n- **Provide exercise tips and form advice**\n- **Track your progress** and suggest improvements\n- **Recommend exercises** based on your goals\n\n### Just ask me things like:\n- "Create a push day workout for Monday"\n- "Add deadlifts to today\'s routine"\n- "What\'s a good exercise for my back?"\n- "Copy this week\'s workouts to next week"\n\n**What are your fitness goals?** Let\'s get started.',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const HISTORY_PREVIEW_COUNT = 5;
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  // The native tab bar floats over content; lift the input composer above it,
  // but collapse that inset while the keyboard is open so there's no gap.
  const tabBarInset = useTabBarInset();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () =>
      setKeyboardVisible(true)
    );
    const hide = Keyboard.addListener('keyboardWillHide', () =>
      setKeyboardVisible(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Add ref for ScrollView, last bot message, and last user message
  const scrollViewRef = useRef<ScrollView>(null);
  const lastBotMessageRef = useRef<View>(null);
  const lastUserMessageRef = useRef<View>(null);

  // Streaming state
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const streamAbortRef = useRef<{ abort: () => void } | null>(null);
  const streamContentRef = useRef('');
  const streamFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const streamScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const userScrolledRef = useRef(false);

  const dispatch = useDispatch<AppDispatch>();
  const activities = useSelector((state: RootState) => state.activities.data);
  const { colorScheme, colors } = useTheme();
  const isDark = colorScheme === 'dark';
  const { user, getAccessToken } = useAuth();
  const isAuthenticated = Boolean(user) && isBackendConfigured();
  const { getWeekStart, getWeekEnd } = useWeekBoundaries();
  const { hasCoachAccess, refreshEntitlements } = useEntitlements();
  const { coachProfile, hasCompletedOnboarding, deferOnboarding } =
    useCoachProfile();

  // First-login / explicit redirect can request onboarding via route param.
  useEffect(() => {
    if (route?.params?.startOnboarding) {
      setOnboardingStart('welcome');
      setOnboarding(true);
      navigation.setParams?.({ startOnboarding: undefined });
    }
  }, [route?.params?.startOnboarding, navigation]);

  const openOnboarding = useCallback(
    (start: 'welcome' | 'review') => {
      setOnboardingStart(coachProfile ? start : 'welcome');
      setOnboarding(true);
    },
    [coachProfile]
  );

  const openChatWith = useCallback((seed?: string) => {
    if (seed) setInputText(seed);
    setActiveTab('chat');
    setView('chat');
    AccessibilityInfo.announceForAccessibility('Coach chat opened');
  }, []);

  const backToDashboard = useCallback(() => {
    setView('dashboard');
    AccessibilityInfo.announceForAccessibility('Returned to Coach dashboard');
  }, []);

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
        text: '## Welcome to Your AI Fitness Coach\n\nI\'m here to help you **crush your fitness goals** and build the best version of yourself.\n\n### What I can do for you:\n- **Create personalized workout plans**\n- **Schedule activities** for any day\n- **Provide exercise tips and form advice**\n- **Track your progress** and suggest improvements\n- **Recommend exercises** based on your goals\n\n### Just ask me things like:\n- "Create a push day workout for Monday"\n- "Add deadlifts to today\'s routine"\n- "What\'s a good exercise for my back?"\n- "Copy this week\'s workouts to next week"\n\n**What are your fitness goals?** Let\'s get started.',
        timestamp: new Date(),
      },
    ]);
    setChatHistory([]);
    setCurrentSessionId(Crypto.randomUUID());
    loadChatHistory();
  }, [user?.id]);

  // Scroll to end when user sends a message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.type === 'user' && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Immediate scroll when processing starts
  useEffect(() => {
    if (isProcessing && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [isProcessing]);

  // Scroll to bottom when keyboard dismisses (only if not streaming)
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        if (
          scrollViewRef.current &&
          messages.length > 0 &&
          !streamingMessageId
        ) {
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    );

    return () => {
      keyboardDidHideListener?.remove();
    };
  }, [messages, streamingMessageId]);

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
  const activityContext = useMemo(
    () => buildCoachActivityContext(activities, getWeekStart(), getWeekEnd()),
    [activities, getWeekStart, getWeekEnd]
  );

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
                    text: "## Welcome to Your AI Fitness Coach\n\nI'm here to help you **crush your fitness goals** and build the best version of yourself.",
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
    userScrolledRef.current = false;

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

      if (!isAuthenticated) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            type: 'bot' as const,
            text: user
              ? getBackendConfigErrorMessage()
              : 'Sign in to use the AI coach.',
            timestamp: new Date(),
          },
        ]);
        setIsProcessing(false);
        return;
      }

      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }
      const allMessages = [
        ...conversationHistory,
        { role: 'user' as const, content: currentInput },
      ];
      const isFirstUserMessage = messages.length === 1;
      const sessionTitle = isFirstUserMessage
        ? currentInput.substring(0, 50)
        : messages[1]?.text?.substring(0, 50) || 'Chat Session';

      // Create bot message ID but don't add to messages yet - show "Thinking..." first
      const botMessageId = (Date.now() + 1).toString();
      streamContentRef.current = '';

      const streamHandle = streamChatMessage(
        token,
        allMessages,
        {
          onToken: (text: string) => {
            // On first token, add the bot message and start streaming scroll
            if (!streamContentRef.current) {
              const botMessage = {
                id: botMessageId,
                type: 'bot' as const,
                text: '',
                timestamp: new Date(),
              };
              setMessages(prev => [...prev, botMessage]);
              setStreamingMessageId(botMessageId);

              // Start periodic scroll to pin user's message at the top
              const targetY = { value: -1 };
              streamScrollTimerRef.current = setInterval(() => {
                if (!scrollViewRef.current) return;
                if (lastUserMessageRef.current) {
                  lastUserMessageRef.current.measureLayout(
                    scrollViewRef.current as any,
                    (x, y) => {
                      const scrollTarget = Math.max(0, y - 12);
                      if (targetY.value === -1) {
                        targetY.value = scrollTarget;
                      }
                      scrollViewRef.current?.scrollTo({
                        y: scrollTarget,
                        animated: false,
                      });
                    },
                    () => {}
                  );
                }
              }, 200);
            }

            streamContentRef.current += text;

            // Throttled flush to state (~50ms)
            if (!streamFlushTimerRef.current) {
              streamFlushTimerRef.current = setTimeout(() => {
                const content = streamContentRef.current;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === botMessageId ? { ...m, text: content } : m
                  )
                );
                streamFlushTimerRef.current = null;
              }, 50);
            }
          },
          onDone: (content: string, activities: any[]) => {
            // Clear timers and do final update
            if (streamFlushTimerRef.current) {
              clearTimeout(streamFlushTimerRef.current);
              streamFlushTimerRef.current = null;
            }
            if (streamScrollTimerRef.current) {
              clearInterval(streamScrollTimerRef.current);
              streamScrollTimerRef.current = null;
            }
            let finalContent = content;

            // Create activities if any were parsed
            if (activities.length > 0) {
              const createdActivities = createActivitiesFromRequest(
                activities,
                dispatch
              );
              if (createdActivities.length === 0) {
                finalContent =
                  "I'm sorry, I wasn't able to create the activities you requested. Please try again with a different format or check your request.";
              }
            }

            // If no tokens arrived, add the message; otherwise update it
            if (!streamContentRef.current) {
              setMessages(prev => [
                ...prev,
                {
                  id: botMessageId,
                  type: 'bot' as const,
                  text: finalContent,
                  timestamp: new Date(),
                },
              ]);
            } else {
              setMessages(prev =>
                prev.map(m =>
                  m.id === botMessageId ? { ...m, text: finalContent } : m
                )
              );
            }
            setStreamingMessageId(null);
            streamAbortRef.current = null;
            setIsProcessing(false);

            // Save session after each message and refresh history
            setTimeout(() => {
              saveCurrentSession();
              loadChatHistory();
            }, 100);
          },
          onError: (message: string, code?: ChatErrorCode) => {
            if (code === 'subscription_required') {
              // Server says the subscription lapsed — re-sync so CoachGate
              // drops back to the Paywall.
              refreshEntitlements();
            }
            if (streamFlushTimerRef.current) {
              clearTimeout(streamFlushTimerRef.current);
              streamFlushTimerRef.current = null;
            }
            if (streamScrollTimerRef.current) {
              clearInterval(streamScrollTimerRef.current);
              streamScrollTimerRef.current = null;
            }
            const errorText =
              message ||
              "Sorry, I'm having trouble connecting right now. Please try again in a moment.";
            if (!streamContentRef.current) {
              setMessages(prev => [
                ...prev,
                {
                  id: botMessageId,
                  type: 'bot' as const,
                  text: errorText,
                  timestamp: new Date(),
                },
              ]);
            } else {
              setMessages(prev =>
                prev.map(m =>
                  m.id === botMessageId ? { ...m, text: errorText } : m
                )
              );
            }
            setStreamingMessageId(null);
            streamAbortRef.current = null;
            setIsProcessing(false);
          },
        },
        {
          activityContext,
          sessionId: currentSessionId,
          sessionTitle,
        }
      );

      streamAbortRef.current = streamHandle;
      // Don't set isProcessing to false here - callbacks handle it
      return;
    } catch (error) {
      console.error('Coach API error:', error);

      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot' as const,
        text: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      // Only clear processing for non-streaming (streaming callbacks handle it)
      if (!streamAbortRef.current) {
        setIsProcessing(false);
      }
      setInputText('');
    }
  };

  // Cleanup streaming on unmount
  useEffect(() => {
    return () => {
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
        streamAbortRef.current = null;
      }
      if (streamFlushTimerRef.current) {
        clearTimeout(streamFlushTimerRef.current);
      }
      if (streamScrollTimerRef.current) {
        clearInterval(streamScrollTimerRef.current);
      }
    };
  }, []);

  const startNewChat = () => {
    // Abort any in-flight stream
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }
    if (streamFlushTimerRef.current) {
      clearTimeout(streamFlushTimerRef.current);
      streamFlushTimerRef.current = null;
    }
    if (streamScrollTimerRef.current) {
      clearInterval(streamScrollTimerRef.current);
      streamScrollTimerRef.current = null;
    }
    setStreamingMessageId(null);
    setIsProcessing(false);

    setMessages([
      {
        id: '1',
        type: 'bot',
        text: '## Welcome to Your AI Fitness Coach\n\nI\'m here to help you **crush your fitness goals** and build the best version of yourself.\n\n### What I can do for you:\n- **Create personalized workout plans**\n- **Schedule activities** for any day\n- **Provide exercise tips and form advice**\n- **Track your progress** and suggest improvements\n- **Recommend exercises** based on your goals\n\n### Just ask me things like:\n- "Create a push day workout for Monday"\n- "Add deadlifts to today\'s routine"\n- "What\'s a good exercise for my back?"\n- "Copy this week\'s workouts to next week"\n\n**What are your fitness goals?** Let\'s get started.',
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

  // Premium gate: sign-in now, paywall-ready via EntitlementContext.
  if (!hasCoachAccess) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <AppHeader rightAction={<View style={{ width: 44, height: 44 }} />}>
          <AppHeaderTitle title="AI Coach" />
        </AppHeader>
        <CoachGate>{null}</CoachGate>
      </View>
    );
  }

  // Onboarding takes over the whole Coach surface.
  if (onboarding) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <AppHeader>
          <AppHeaderTitle title="AI Coach" />
        </AppHeader>
        <OnboardingFlowScreen
          initialStep={onboardingStart}
          onComplete={() => {
            setOnboarding(false);
            setView('dashboard');
            // Drop the user onto their calendar to see the freshly built plan.
            navigation.navigate('Weekly', { screen: 'WeeklyHome' });
          }}
          onDismiss={() => {
            // "Maybe later": don't re-ambush on next launch.
            if (!hasCompletedOnboarding) deferOnboarding();
            setOnboarding(false);
            setView('dashboard');
          }}
        />
      </View>
    );
  }

  // Dashboard is the default landing view.
  if (view === 'dashboard') {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <AppHeader>
          <AppHeaderTitle title="AI Coach" />
        </AppHeader>
        <CoachDashboard
          hasProfile={Boolean(coachProfile) || hasCompletedOnboarding}
          onStartOnboarding={() => openOnboarding('welcome')}
          onOpenChat={openChatWith}
          onRegenerate={() =>
            coachProfile ? openOnboarding('review') : openOnboarding('welcome')
          }
          onReschedule={() => setRescheduleOpen(true)}
          onReconfigure={() => openOnboarding('review')}
        />
        <RescheduleSheet
          visible={rescheduleOpen}
          onClose={() => setRescheduleOpen(false)}
        />
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
            onPress={backToDashboard}
            hitSlop={14}
            accessibilityLabel="Back to Dashboard"
            accessibilityRole="button"
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity
            onPress={startNewChat}
            hitSlop={14}
            accessibilityLabel="Start new chat"
            accessibilityRole="button"
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name="create-outline"
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        }
      >
        <AppHeaderTitle title="AI Coach" />
      </AppHeader>

      {/* Chat / History sub-navigation (underline style) */}
      <View
        className="flex-row border-b"
        style={{ borderBottomColor: colors.border }}
      >
        {(['chat', 'history'] as const).map(tab => {
          const selected = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              hitSlop={14}
              className="flex-1 py-3"
              style={{
                borderBottomWidth: 2,
                borderBottomColor: selected
                  ? colors.primary.main
                  : 'transparent',
              }}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={tab === 'chat' ? 'Chat' : 'History'}
            >
              <Text
                className="text-center font-medium"
                style={{
                  color: selected ? colors.primary.main : colors.textSecondary,
                }}
              >
                {tab === 'chat' ? 'Chat' : 'History'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'chat' ? (
        <View className="flex-1">
          <ScrollView
            className="flex-1 px-4 pt-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            ref={scrollViewRef}
            accessibilityLiveRegion="polite"
            onScrollBeginDrag={() => {
              if (streamingMessageId) {
                userScrolledRef.current = true;
                // Stop the auto-scroll timer when user takes over
                if (streamScrollTimerRef.current) {
                  clearInterval(streamScrollTimerRef.current);
                  streamScrollTimerRef.current = null;
                }
              }
            }}
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
                    {message.id === streamingMessageId ? (
                      <StreamingText text={message.text} isDark={isDark} />
                    ) : (
                      <WorkoutContentWithLinks
                        text={message.text}
                        isDark={isDark}
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {isProcessing && !streamingMessageId && (
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
            visible={!isProcessing && messages.length <= 1}
          />

          <View
            style={{
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: keyboardVisible ? 16 : tabBarInset,
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
