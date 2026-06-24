import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  OnboardingTextArea,
  PrimaryButton,
  SelectCard,
  SelectChip,
  SkipLink,
  StepHeader,
  StepTitle,
} from '../../components/onboarding/OnboardingControls';
import { useAuth } from '../../context/AuthContext';
import { useCoachProfile } from '../../context/CoachProfileContext';
import { useWeekBoundaries } from '../../hooks/useWeekBoundaries';
import { AppDispatch, RootState } from '../../redux/store';
import { buildCoachActivityContext } from '../../services/coachAnalyticsService';
import { generateAndSchedulePlan } from '../../services/planGenerationService';
import { useTheme } from '../../theme/ThemeContext';
import {
  CoachProfile,
  DEFAULT_PLAN_WEEKS,
  EQUIPMENT_LABELS,
  EQUIPMENT_PRESETS,
  Equipment,
  EXPERIENCE_LABELS,
  ExperienceLevel,
  GOAL_LABELS,
  Goal,
  MAX_DAYS_PER_WEEK,
  MIN_DAYS_PER_WEEK,
  PLAN_WEEK_OPTIONS,
  SESSION_LENGTH_OPTIONS,
  SEX_LABELS,
  Sex,
} from '../../types/coachProfile';

type QuestionStep =
  | 'goals'
  | 'experience'
  | 'sex'
  | 'days'
  | 'session'
  | 'plan'
  | 'equipment'
  | 'refine';

type Step =
  | 'welcome'
  | QuestionStep
  | 'review'
  | 'generating'
  | 'done'
  | 'error';

const QUESTION_ORDER: QuestionStep[] = [
  'goals',
  'experience',
  'sex',
  'days',
  'session',
  'plan',
  'equipment',
  'refine',
];

const GOAL_ICONS: Record<Goal, keyof typeof Ionicons.glyphMap> = {
  build_muscle: 'barbell',
  lose_fat: 'flame',
  get_stronger: 'fitness',
  improve_endurance: 'walk',
  mobility: 'body',
  general_health: 'heart',
};

const EXPERIENCE_DESCRIPTIONS: Record<ExperienceLevel, string> = {
  beginner: 'New to training or returning after a long break.',
  intermediate: 'Training consistently for 6+ months; know the main lifts.',
  advanced: 'Years of training; comfortable programming your own work.',
};

// Order shown in the optional sex step.
const SEX_ORDER: Sex[] = ['female', 'male', 'unspecified'];

const PICKABLE_EQUIPMENT: Equipment[] = [
  'barbell',
  'dumbbell',
  'kettlebell',
  'cable',
  'machine',
  'bands',
  'cardio-machine',
];

interface Props {
  onComplete: () => void;
  onDismiss: () => void;
  // Where to open the flow. 'welcome' for first-time onboarding; 'review' for
  // regenerate/reconfigure (prefilled, jump straight to the editable summary).
  initialStep?: 'welcome' | 'review';
}

export default function OnboardingFlowScreen({
  onComplete,
  onDismiss,
  initialStep = 'welcome',
}: Props) {
  const { colors } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { getAccessToken } = useAuth();
  const { setCoachProfile, markOnboardingComplete, coachProfile } =
    useCoachProfile();
  const activities = useSelector((s: RootState) => s.activities.data);
  const { getWeekStart, getWeekEnd } = useWeekBoundaries();

  const [step, setStep] = useState<Step>(initialStep);

  // Answers — prefilled from an existing profile (supports "Reconfigure").
  const [goals, setGoals] = useState<Goal[]>(
    (coachProfile?.goals as Goal[]) ?? []
  );
  const [experience, setExperience] = useState<ExperienceLevel | null>(
    coachProfile?.experience ?? null
  );
  const [sex, setSex] = useState<Sex | null>(coachProfile?.sex ?? null);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(
    coachProfile?.daysPerWeek ?? 4
  );
  const [sessionLengthMin, setSessionLengthMin] = useState<number>(
    coachProfile?.sessionLengthMin ?? 45
  );
  const [planWeeks, setPlanWeeks] = useState<number>(
    coachProfile?.planWeeks ?? DEFAULT_PLAN_WEEKS
  );
  const [startThisWeek, setStartThisWeek] = useState<boolean>(
    coachProfile?.startThisWeek ?? true
  );
  const [equipment, setEquipment] = useState<Equipment[] | null>(
    coachProfile?.equipment ?? null
  );
  // Single free-text box at the end of the flow. Prefilled from any prior
  // injuries + notes (older profiles stored them separately) so reconfigure
  // doesn't drop what the user already wrote.
  const [notes, setNotes] = useState<string>(
    [coachProfile?.injuries, coachProfile?.notes]
      .map(s => s?.trim())
      .filter(Boolean)
      .join('\n\n')
  );

  const [genError, setGenError] = useState<string | null>(null);
  const [partialNote, setPartialNote] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const stepNumber = QUESTION_ORDER.includes(step as QuestionStep)
    ? QUESTION_ORDER.indexOf(step as QuestionStep) + 1
    : 0;

  const goToQuestion = (index: number) => {
    if (index < 0) {
      setStep('welcome');
    } else if (index >= QUESTION_ORDER.length) {
      setStep('review');
    } else {
      setStep(QUESTION_ORDER[index]);
    }
  };

  const next = () => goToQuestion(stepNumber - 1 + 1);
  const back = () => goToQuestion(stepNumber - 1 - 1);

  const buildProfile = (): CoachProfile => ({
    goals,
    experience: experience ?? 'intermediate',
    sex: sex ?? undefined,
    daysPerWeek,
    sessionLengthMin,
    planWeeks,
    startThisWeek,
    equipment,
    injuries: '',
    preferredActivityTypes: [],
    notes: notes.trim() || undefined,
  });

  const startGeneration = async () => {
    setGenError(null);
    setPartialNote(null);
    setStep('generating');

    const token = getAccessToken();
    if (!token) {
      setGenError('You need to be signed in to generate a plan.');
      setStep('error');
      return;
    }

    const profile = buildProfile();
    // Persist answers up front so they survive (resumable / reconfigure).
    await setCoachProfile(profile);

    const activityContext = buildCoachActivityContext(
      activities,
      getWeekStart(),
      getWeekEnd()
    );

    const { abort, result } = generateAndSchedulePlan({
      accessToken: token,
      coachProfile: profile,
      activityContext,
      dispatch,
      // Replace any prior coach plan (upcoming, not-yet-done) instead of
      // stacking a second plan on top of it.
      existingActivities: activities,
    });
    abortRef.current = abort;

    try {
      const res = await result;
      if (res.createdActivities.length === 0) {
        setGenError(
          "I couldn't put together a plan from that. Let's try again."
        );
        setStep('error');
        return;
      }
      if (res.scheduledDays > 0 && res.scheduledDays < res.expectedDays) {
        setPartialNote(
          `I scheduled ${res.scheduledDays} of your ${res.expectedDays} days. You can ask the coach to fill in the rest.`
        );
      }
      await markOnboardingComplete();
      setStep('done');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong.';
      setGenError(message);
      setStep('error');
    } finally {
      abortRef.current = null;
    }
  };

  const cancelGeneration = () => {
    abortRef.current?.();
    abortRef.current = null;
    setStep('review');
  };

  const toggleGoal = (g: Goal) =>
    setGoals(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    );

  const presetSelected = (preset: Equipment[]): boolean =>
    equipment !== null &&
    equipment.length === preset.length &&
    preset.every(e => equipment.includes(e));

  const toggleEquipment = (e: Equipment) =>
    setEquipment(prev => {
      const base = prev ?? [];
      const nextSet = base.includes(e)
        ? base.filter(x => x !== e)
        : [...base, e];
      return nextSet.length ? nextSet : null;
    });

  // --- Render ---

  const containerStyle = {
    flex: 1,
    backgroundColor: colors.background,
  } as const;

  const scrollContent = {
    padding: 16,
    paddingBottom: 32,
  } as const;

  if (step === 'welcome') {
    return (
      <View style={containerStyle}>
        <ScrollView contentContainerStyle={scrollContent}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 24,
              alignItems: 'center',
              marginTop: 24,
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: colors.primary.background,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
              }}
            >
              <Ionicons name="sparkles" size={28} color={colors.primary.main} />
            </View>
            <Text
              accessibilityRole="header"
              style={{
                color: colors.text,
                fontSize: 22,
                fontWeight: '600',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              Let's build your plan
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 15,
                lineHeight: 22,
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              A few quick questions and I'll create a workout plan tailored to
              your goals, schedule, and equipment — then put it on your
              calendar.
            </Text>
            <View style={{ width: '100%', gap: 12 }}>
              <PrimaryButton
                label="Get started"
                onPress={() => setStep('goals')}
              />
              <SkipLink label="Maybe later" onPress={onDismiss} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (step === 'generating') {
    return (
      <View style={containerStyle}>
        <ScrollView contentContainerStyle={scrollContent}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 24,
              marginTop: 24,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 17,
                fontWeight: '600',
                marginBottom: 6,
              }}
            >
              Building your plan…
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                lineHeight: 20,
                marginBottom: 20,
              }}
            >
              This usually takes under a minute.
            </Text>
            <GeneratingSteps />
            <SkipLink label="Cancel" onPress={cancelGeneration} />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (step === 'error') {
    return (
      <View style={containerStyle}>
        <ScrollView contentContainerStyle={scrollContent}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 24,
              marginTop: 24,
              alignItems: 'center',
            }}
          >
            <Ionicons
              name="alert-circle"
              size={40}
              color={colors.error.main}
              style={{ marginBottom: 12 }}
            />
            <Text
              accessibilityRole="header"
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '600',
                marginBottom: 6,
                textAlign: 'center',
              }}
            >
              Couldn't finish your plan
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                lineHeight: 20,
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              {genError ?? 'Something went wrong.'}
            </Text>
            <View style={{ width: '100%', gap: 12 }}>
              <PrimaryButton
                label="Try again"
                onPress={startGeneration}
                icon="refresh"
              />
              <SkipLink
                label="Back to review"
                onPress={() => setStep('review')}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (step === 'done') {
    return (
      <View style={containerStyle}>
        <ScrollView contentContainerStyle={scrollContent}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 24,
              marginTop: 24,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: colors.success.main,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Ionicons name="checkmark" size={28} color={colors.textInverse} />
            </View>
            <Text
              accessibilityRole="header"
              style={{
                color: colors.text,
                fontSize: 20,
                fontWeight: '600',
                marginBottom: 6,
                textAlign: 'center',
              }}
            >
              Your plan is ready
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                lineHeight: 20,
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              {daysPerWeek} days a week, added to your calendar. Adjust anything
              anytime — just ask the coach.
            </Text>
            {partialNote ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: colors.warning.background,
                  marginBottom: 16,
                }}
              >
                <Ionicons
                  name="information-circle"
                  size={18}
                  color={colors.warning.dark}
                />
                <Text
                  style={{
                    flex: 1,
                    color: colors.warning.dark,
                    fontSize: 13,
                    lineHeight: 18,
                  }}
                >
                  {partialNote}
                </Text>
              </View>
            ) : null}
            <View style={{ width: '100%' }}>
              <PrimaryButton label="View my plan" onPress={onComplete} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Question + review steps share the stepper chrome.
  return (
    <View style={containerStyle}>
      <ScrollView contentContainerStyle={scrollContent}>
        {step === 'review' ? (
          <ReviewHeaderBack onBack={() => setStep('refine')} />
        ) : (
          <StepHeader
            step={stepNumber}
            total={QUESTION_ORDER.length}
            onBack={back}
          />
        )}

        {step === 'goals' && (
          <>
            <StepTitle
              title="What are you training for?"
              subtitle="Pick all that apply — I'll balance the plan around them."
            />
            {(Object.keys(GOAL_LABELS) as Goal[]).map(g => (
              <SelectCard
                key={g}
                label={GOAL_LABELS[g]}
                icon={GOAL_ICONS[g]}
                selected={goals.includes(g)}
                onPress={() => toggleGoal(g)}
              />
            ))}
            <View style={{ marginTop: 10 }}>
              <PrimaryButton
                label="Continue"
                icon="arrow-forward"
                disabled={goals.length === 0}
                onPress={next}
              />
            </View>
          </>
        )}

        {step === 'experience' && (
          <>
            <StepTitle
              title="How much lifting experience do you have?"
              subtitle="This sets your starting volume and how fast I progress you."
            />
            {(Object.keys(EXPERIENCE_LABELS) as ExperienceLevel[]).map(
              level => (
                <SelectCard
                  key={level}
                  label={EXPERIENCE_LABELS[level]}
                  description={EXPERIENCE_DESCRIPTIONS[level]}
                  selected={experience === level}
                  onPress={() => setExperience(level)}
                />
              )
            )}
            <View style={{ marginTop: 10 }}>
              <PrimaryButton
                label="Continue"
                icon="arrow-forward"
                disabled={!experience}
                onPress={next}
              />
            </View>
          </>
        )}

        {step === 'sex' && (
          <>
            <StepTitle
              title="Anything I should know about your body?"
              subtitle="Optional. I'll use this to fine-tune recovery, volume, and exercise emphasis. It changes nothing else."
            />
            {SEX_ORDER.map(option => (
              <SelectCard
                key={option}
                label={SEX_LABELS[option]}
                selected={sex === option}
                onPress={() => setSex(option)}
              />
            ))}
            <View style={{ marginTop: 10, gap: 12 }}>
              <PrimaryButton
                label="Continue"
                icon="arrow-forward"
                onPress={next}
              />
              <SkipLink
                label="Skip — prefer not to say"
                onPress={() => {
                  setSex(null);
                  next();
                }}
              />
            </View>
          </>
        )}

        {step === 'days' && (
          <>
            <StepTitle
              title="How many days a week can you train?"
              subtitle="Be realistic — a plan you can keep beats a perfect one you can't."
            />
            <View style={{ alignItems: 'center', marginBottom: 18 }}>
              <Text
                style={{ color: colors.text, fontSize: 44, fontWeight: '600' }}
              >
                {daysPerWeek}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
                days / week
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {Array.from(
                { length: MAX_DAYS_PER_WEEK - MIN_DAYS_PER_WEEK + 1 },
                (_, i) => MIN_DAYS_PER_WEEK + i
              ).map(d => {
                const selected = d === daysPerWeek;
                return (
                  <SelectChip
                    key={d}
                    label={String(d)}
                    selected={selected}
                    onPress={() => setDaysPerWeek(d)}
                  />
                );
              })}
            </View>
            <View style={{ marginTop: 18 }}>
              <PrimaryButton
                label="Continue"
                icon="arrow-forward"
                onPress={next}
              />
            </View>
          </>
        )}

        {step === 'session' && (
          <>
            <StepTitle
              title="How long is a typical session?"
              subtitle="I'll size each workout to fit the time you have."
            />
            <View style={{ gap: 12 }}>
              {SESSION_LENGTH_OPTIONS.map(min => (
                <SelectCard
                  key={min}
                  label={`${min} minutes`}
                  selected={sessionLengthMin === min}
                  onPress={() => setSessionLengthMin(min)}
                />
              ))}
            </View>
            <View style={{ marginTop: 18 }}>
              <PrimaryButton
                label="Continue"
                icon="arrow-forward"
                onPress={next}
              />
            </View>
          </>
        )}

        {step === 'plan' && (
          <>
            <StepTitle
              title="How long should your plan run?"
              subtitle="The plan repeats your weekly split for this many weeks. You can always extend it later."
            />
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 28,
              }}
            >
              {PLAN_WEEK_OPTIONS.map(w => (
                <SelectChip
                  key={w}
                  label={`${w} weeks`}
                  selected={planWeeks === w}
                  onPress={() => setPlanWeeks(w)}
                />
              ))}
            </View>
            <StepTitle
              title="When do you want to start?"
              subtitle="Begin today so you have a workout right away, or start fresh on Monday."
            />
            <SelectCard
              label="Start this week"
              description="Adds a workout for today and builds the week around it."
              selected={startThisWeek}
              onPress={() => setStartThisWeek(true)}
            />
            <SelectCard
              label="Start next Monday"
              description="Your first workout lands at the start of next week."
              selected={!startThisWeek}
              onPress={() => setStartThisWeek(false)}
            />
            <View style={{ marginTop: 18 }}>
              <PrimaryButton
                label="Continue"
                icon="arrow-forward"
                onPress={next}
              />
            </View>
          </>
        )}

        {step === 'equipment' && (
          <>
            <StepTitle
              title="What do you have access to?"
              subtitle="I'll only program exercises you can actually do. Not sure? Skip it — I'll assume access to most gym equipment, and you can change this anytime."
            />
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              Quick presets
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 18,
              }}
            >
              {EQUIPMENT_PRESETS.map(preset => (
                <SelectChip
                  key={preset.id}
                  label={preset.label}
                  selected={presetSelected(preset.equipment)}
                  onPress={() => setEquipment(preset.equipment)}
                />
              ))}
            </View>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              Or pick individually
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PICKABLE_EQUIPMENT.map(e => (
                <SelectChip
                  key={e}
                  label={EQUIPMENT_LABELS[e]}
                  selected={Boolean(equipment?.includes(e))}
                  onPress={() => toggleEquipment(e)}
                />
              ))}
            </View>
            <View style={{ marginTop: 22, gap: 12 }}>
              <PrimaryButton
                label="Continue"
                icon="arrow-forward"
                disabled={equipment !== null && equipment.length === 0}
                onPress={next}
              />
              <SkipLink
                label="Skip — I'll figure it out"
                onPress={() => {
                  setEquipment(null);
                  next();
                }}
              />
            </View>
          </>
        )}

        {step === 'refine' && (
          <>
            <StepTitle
              title="Anything else I should know?"
              subtitle="Injuries to work around, preferences, a routine you like, days that don't work — tell me in your own words."
            />
            <OnboardingTextArea
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. bad left knee so avoid deep squats, I'd love longer sessions on Saturdays, and I don't enjoy running"
            />
            <View style={{ marginTop: 20, gap: 12 }}>
              <PrimaryButton
                label="Review"
                icon="arrow-forward"
                onPress={() => setStep('review')}
              />
              <SkipLink
                label="Nothing to add — skip"
                onPress={() => {
                  setNotes('');
                  setStep('review');
                }}
              />
            </View>
          </>
        )}

        {step === 'review' && (
          <>
            <StepTitle
              title="Review your plan setup"
              subtitle="Tap any line to change it."
            />
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
                marginBottom: 16,
              }}
            >
              <ReviewRow
                icon="flag"
                label="Goals"
                value={
                  goals.length
                    ? goals.map(g => GOAL_LABELS[g]).join(' · ')
                    : 'Not set'
                }
                onPress={() => setStep('goals')}
              />
              <ReviewRow
                icon="trending-up"
                label="Experience"
                value={experience ? EXPERIENCE_LABELS[experience] : 'Not set'}
                onPress={() => setStep('experience')}
              />
              <ReviewRow
                icon="person"
                label="Gender"
                value={sex ? SEX_LABELS[sex] : 'Prefer not to say'}
                onPress={() => setStep('sex')}
              />
              <ReviewRow
                icon="calendar"
                label="Schedule"
                value={`${daysPerWeek} days / week · ${sessionLengthMin} min`}
                onPress={() => setStep('days')}
              />
              <ReviewRow
                icon="time"
                label="Plan length"
                value={`${planWeeks} weeks · starts ${
                  startThisWeek ? 'this week' : 'next Monday'
                }`}
                onPress={() => setStep('plan')}
              />
              <ReviewRow
                icon="barbell"
                label="Equipment"
                value={
                  equipment === null
                    ? 'Any (skipped)'
                    : equipment.map(e => EQUIPMENT_LABELS[e]).join(' · ')
                }
                onPress={() => setStep('equipment')}
              />
              <ReviewRow
                icon="chatbubble-ellipses"
                label="Anything else"
                value={notes.trim() || 'None'}
                onPress={() => setStep('refine')}
                last
              />
            </View>
            <PrimaryButton
              label="Generate my plan"
              icon="sparkles"
              onPress={startGeneration}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// Cosmetic progress steps shown while the plan generates. They advance on a
// timer (not tied to real backend stages) so a ~minute-long wait reads as
// steady progress instead of a single frozen spinner. The list holds on the
// last step until the parent swaps the screen to 'done'/'error'.
const GENERATION_STEPS = [
  'Reviewing your goals and equipment',
  'Selecting exercises that fit',
  'Balancing your weekly split',
  'Scheduling it on your calendar',
];

const GENERATION_STEP_MS = 4500;

function GeneratingSteps() {
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= GENERATION_STEPS.length - 1) return;
    const timer = setTimeout(
      () => setActiveIndex(i => Math.min(i + 1, GENERATION_STEPS.length - 1)),
      GENERATION_STEP_MS
    );
    return () => clearTimeout(timer);
  }, [activeIndex]);

  return (
    <View
      style={{ gap: 16, marginBottom: 24 }}
      accessibilityLiveRegion="polite"
    >
      {GENERATION_STEPS.map((label, i) => {
        const done = i < activeIndex;
        const current = i === activeIndex;
        return (
          <View
            key={label}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            accessibilityRole="text"
            accessibilityLabel={`${label}${
              done ? ', done' : current ? ', in progress' : ', pending'
            }`}
          >
            <View
              style={{
                width: 22,
                height: 22,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {done ? (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.success.main}
                />
              ) : current ? (
                <ActivityIndicator size="small" color={colors.primary.main} />
              ) : (
                <Ionicons
                  name="ellipse-outline"
                  size={20}
                  color={colors.textTertiary}
                />
              )}
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: 15,
                color: done || current ? colors.text : colors.textTertiary,
                fontWeight: current ? '600' : '400',
              }}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ReviewHeaderBack({ onBack }: { onBack: () => void }) {
  return <StepHeader step={0} total={0} onBack={onBack} />;
}

function ReviewRow({
  icon,
  label,
  value,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${label}, currently ${value}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
        minHeight: 56,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.borderSecondary,
      }}
    >
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
          {label}
        </Text>
        <Text style={{ color: colors.text, fontSize: 14 }}>{value}</Text>
      </View>
      <Ionicons name="pencil" size={16} color={colors.primary.main} />
    </TouchableOpacity>
  );
}
