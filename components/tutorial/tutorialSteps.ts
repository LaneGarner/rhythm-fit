export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetId: string;
  navigateTo?: {
    type: 'tab' | 'stack';
    screen: string;
    params?: object;
  };
  tooltipPosition?: 'top' | 'bottom' | 'auto';
  overlayOpacity?: number; // 0-1, defaults to 0.75
  requiresUnauthenticated?: boolean; // Only show this step if user is not signed in
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'weekly-tab',
    title: 'Your Week',
    description:
      'See all your activities organized by day. Today is highlighted. Swipe or tap arrows to navigate weeks.',
    targetId: 'week-header',
    navigateTo: { type: 'tab', screen: 'Weekly' },
    tooltipPosition: 'bottom',
  },
  {
    id: 'add-activity',
    title: 'Add Activities',
    description:
      'Tap here to schedule a new activity from the library or create your own.',
    targetId: 'floating-add-button',
    navigateTo: { type: 'tab', screen: 'Weekly' },
    tooltipPosition: 'top',
  },
  {
    id: 'day-view',
    title: 'Daily Details',
    description:
      'Tap any day to add activities, press edit to reorder with drag & drop, or link exercises into supersets.',
    targetId: 'today-card',
    navigateTo: { type: 'tab', screen: 'Weekly' },
    tooltipPosition: 'bottom',
  },
  {
    id: 'activity-execution',
    title: 'Track Your Workout',
    description:
      'Tap an activity to view it. Add sets, log weight and reps, and mark complete.',
    targetId: 'full-screen',
    navigateTo: { type: 'stack', screen: 'DemoActivityExecution' },
    tooltipPosition: 'bottom',
  },
  {
    id: 'stats-tab',
    title: 'Track Progress',
    description:
      'See streaks, volume trends, and personal records. Tap any exercise for detailed stats.',
    targetId: 'stats-tab-button',
    navigateTo: { type: 'tab', screen: 'Stats' },
    tooltipPosition: 'top',
  },
  {
    id: 'coach-tab',
    title: 'AI Coach',
    description:
      'Ask the coach to create workouts, get exercise tips, or schedule activities using natural language.',
    targetId: 'coach-tab-button',
    navigateTo: { type: 'tab', screen: 'Coach' },
    tooltipPosition: 'top',
  },
  {
    id: 'calculator-tab',
    title: 'Plate Calculator',
    description:
      'Enter or select a weight, choose your barbell, and see exactly which plates to load on each side.',
    targetId: 'calculator-tab-button',
    navigateTo: { type: 'tab', screen: 'Calculator' },
    tooltipPosition: 'top',
  },
  {
    id: 'equipment-settings',
    title: 'Configure Equipment',
    description:
      'Add custom barbells and set your available plates for accurate calculations.',
    targetId: 'configure-equipment-link',
    navigateTo: { type: 'tab', screen: 'Calculator' },
    tooltipPosition: 'bottom',
  },
  {
    id: 'settings',
    title: 'Settings',
    description:
      'Tap the profile icon to access settings. Customize your week start day, toggle dark mode, manage your account, or replay this tutorial.',
    targetId: 'settings-button',
    navigateTo: { type: 'tab', screen: 'Weekly' },
    tooltipPosition: 'bottom',
  },
  {
    id: 'auth',
    title: 'Get Started',
    description:
      'Sign in to use AI Coach and sync your workouts across devices, or tap "Use without account" to get started.',
    targetId: 'full-screen',
    navigateTo: { type: 'stack', screen: 'Auth' },
    tooltipPosition: 'bottom',
    requiresUnauthenticated: true,
  },
];
