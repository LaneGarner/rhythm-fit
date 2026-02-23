/**
 * Workout Data Import Script
 *
 * Parses freeform workout notes and generates SQL INSERT statements
 * for the Rhythm app's activities table.
 *
 * Usage: npx ts-node scripts/import-workouts.ts > import.sql
 */

// Simple UUID v4 generator
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Replace with your actual Supabase user ID
const USER_ID = '3bc839a9-ae94-4add-b1cc-22f2da94ea62';

interface SetData {
  id: string;
  reps?: number;
  weight?: number;
  time?: number;
  distance?: number;
  completed: boolean;
}

interface ParsedExercise {
  name: string;
  type:
    | 'weight-training'
    | 'calisthenics'
    | 'cardio'
    | 'mobility'
    | 'recovery'
    | 'other';
  sets: SetData[];
  emoji?: string;
}

interface ParsedWorkout {
  date: string; // YYYY-MM-DD
  exercises: ParsedExercise[];
}

// Exercise name normalization and type mapping
const EXERCISE_MAP: Record<
  string,
  { name: string; type: ParsedExercise['type']; emoji?: string }
> = {
  'barbell squat': {
    name: 'Barbell Back Squat',
    type: 'weight-training',
    emoji: '🦵',
  },
  'barbell back squat': {
    name: 'Barbell Back Squat',
    type: 'weight-training',
    emoji: '🦵',
  },
  squat: { name: 'Barbell Back Squat', type: 'weight-training', emoji: '🦵' },
  'smith machine squat': {
    name: 'Smith Machine Squat',
    type: 'weight-training',
    emoji: '🦵',
  },
  'goblet squat': {
    name: 'Goblet Squat',
    type: 'weight-training',
    emoji: '🦵',
  },
  'low incline db bench press': {
    name: 'Low Incline DB Bench Press',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'romanian deadlift': {
    name: 'Romanian Deadlift',
    type: 'weight-training',
    emoji: '🏋️',
  },
  deadlift: { name: 'Deadlift', type: 'weight-training', emoji: '🏋️' },
  'kb deadlift': {
    name: 'Kettlebell Deadlift',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'kb romanian deadlift': {
    name: 'Kettlebell Romanian Deadlift',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'lat raises': {
    name: 'Dumbbell Lateral Raise',
    type: 'weight-training',
    emoji: '💪',
  },
  'db lateral raise': {
    name: 'Dumbbell Lateral Raise',
    type: 'weight-training',
    emoji: '💪',
  },
  'dumbbell lateral raise': {
    name: 'Dumbbell Lateral Raise',
    type: 'weight-training',
    emoji: '💪',
  },
  pullups: { name: 'Pull-Up', type: 'calisthenics', emoji: '🏋️' },
  'pull-ups': { name: 'Pull-Up', type: 'calisthenics', emoji: '🏋️' },
  'pull-up': { name: 'Pull-Up', type: 'calisthenics', emoji: '🏋️' },
  'chin-ups': { name: 'Chin-Up', type: 'calisthenics', emoji: '🏋️' },
  'chin up': { name: 'Chin-Up', type: 'calisthenics', emoji: '🏋️' },
  'assisted pull-up': {
    name: 'Assisted Pull-Up',
    type: 'calisthenics',
    emoji: '🏋️',
  },
  'pull-up / assisted pull-up': {
    name: 'Pull-Up',
    type: 'calisthenics',
    emoji: '🏋️',
  },
  'pull-up / negatives': {
    name: 'Pull-Up Negatives',
    type: 'calisthenics',
    emoji: '🏋️',
  },
  'negative pull-ups': {
    name: 'Pull-Up Negatives',
    type: 'calisthenics',
    emoji: '🏋️',
  },
  'banded rows': { name: 'Banded Rows', type: 'weight-training', emoji: '🏋️' },
  'bench press': { name: 'Bench Press', type: 'weight-training', emoji: '🏋️' },
  'barbell bench press': {
    name: 'Bench Press',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'incline bench press': {
    name: 'Incline Bench Press',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'incline bench press (machine)': {
    name: 'Machine Incline Press',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'machine incline press': {
    name: 'Machine Incline Press',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'inclined chest press': {
    name: 'Machine Incline Press',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'chest press': { name: 'Chest Press', type: 'weight-training', emoji: '🏋️' },
  '1-arm db row': {
    name: 'One-Arm Dumbbell Row',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'dumbbell row': {
    name: 'Dumbbell Row',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'chest-supported row': {
    name: 'Chest-Supported Row',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'single-arm kb row': {
    name: 'Single-Arm Kettlebell Row',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'bent-over kb row': {
    name: 'Bent-Over Kettlebell Row',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'plank + reach': { name: 'Plank Reach', type: 'calisthenics', emoji: '🧘' },
  plank: { name: 'Plank', type: 'calisthenics', emoji: '🧘' },
  'standing calf raise': {
    name: 'Standing Calf Raise',
    type: 'weight-training',
    emoji: '🦵',
  },
  'smith machine calf raise': {
    name: 'Smith Machine Calf Raise',
    type: 'weight-training',
    emoji: '🦵',
  },
  'calf raise': { name: 'Calf Raise', type: 'weight-training', emoji: '🦵' },
  'calf press': { name: 'Calf Press', type: 'weight-training', emoji: '🦵' },
  'band hip abduction': {
    name: 'Band Hip Abduction',
    type: 'weight-training',
    emoji: '🦵',
  },
  run: { name: 'Running', type: 'cardio', emoji: '🏃' },
  'overhead press': {
    name: 'Overhead Press',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'overhead press (dumbbell)': {
    name: 'Dumbbell Overhead Press',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'shoulder press': {
    name: 'Shoulder Press',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'leg press': { name: 'Leg Press', type: 'weight-training', emoji: '🦵' },
  'leg press (high stance)': {
    name: 'Leg Press',
    type: 'weight-training',
    emoji: '🦵',
  },
  'hammer curl': { name: 'Hammer Curl', type: 'weight-training', emoji: '💪' },
  'hammer curls': { name: 'Hammer Curl', type: 'weight-training', emoji: '💪' },
  'kb hammer curl': {
    name: 'Kettlebell Hammer Curl',
    type: 'weight-training',
    emoji: '💪',
  },
  'lat pulldown': {
    name: 'Lat Pulldown',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'overhead triceps extension': {
    name: 'Overhead Triceps Extension',
    type: 'weight-training',
    emoji: '💪',
  },
  'overhead triceps extension (dumbbell)': {
    name: 'Overhead Triceps Extension',
    type: 'weight-training',
    emoji: '💪',
  },
  'cable overhead triceps extension': {
    name: 'Cable Overhead Triceps Extension',
    type: 'weight-training',
    emoji: '💪',
  },
  'seated leg curl': {
    name: 'Seated Leg Curl',
    type: 'weight-training',
    emoji: '🦵',
  },
  'leg curl': { name: 'Seated Leg Curl', type: 'weight-training', emoji: '🦵' },
  'leg curls seated': {
    name: 'Seated Leg Curl',
    type: 'weight-training',
    emoji: '🦵',
  },
  'machine weighted crunch': {
    name: 'Machine Weighted Crunch',
    type: 'weight-training',
    emoji: '🔥',
  },
  'weighted crunches': {
    name: 'Weighted Crunch',
    type: 'weight-training',
    emoji: '🔥',
  },
  'weighted sit-ups': {
    name: 'Weighted Sit-Up',
    type: 'weight-training',
    emoji: '🔥',
  },
  'kb weighted sit-ups': {
    name: 'Kettlebell Weighted Sit-Up',
    type: 'weight-training',
    emoji: '🔥',
  },
  'leg extension': {
    name: 'Leg Extension',
    type: 'weight-training',
    emoji: '🦵',
  },
  'seated leg extensions': {
    name: 'Leg Extension',
    type: 'weight-training',
    emoji: '🦵',
  },
  'ez-bar skull crusher': {
    name: 'EZ-Bar Skull Crusher',
    type: 'weight-training',
    emoji: '💪',
  },
  'skull crushers': {
    name: 'Skull Crusher',
    type: 'weight-training',
    emoji: '💪',
  },
  "farmer's carry": {
    name: "Farmer's Carry",
    type: 'weight-training',
    emoji: '🏋️',
  },
  'kettlebell clean & press': {
    name: 'Kettlebell Clean & Press',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'kettlebell clean and press': {
    name: 'Kettlebell Clean & Press',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'kb swing': {
    name: 'Kettlebell Swing',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'kb swings': {
    name: 'Kettlebell Swing',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'kettlebell swing': {
    name: 'Kettlebell Swing',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'kettlebell swings': {
    name: 'Kettlebell Swing',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'dead hang': { name: 'Dead Hang', type: 'calisthenics', emoji: '🏋️' },
  'preacher curl': {
    name: 'Preacher Curl',
    type: 'weight-training',
    emoji: '💪',
  },
  'preacher curl (ez-bar)': {
    name: 'EZ-Bar Preacher Curl',
    type: 'weight-training',
    emoji: '💪',
  },
  'preacher curls': {
    name: 'Preacher Curl',
    type: 'weight-training',
    emoji: '💪',
  },
  curl: { name: 'Bicep Curl', type: 'weight-training', emoji: '💪' },
  curls: { name: 'Bicep Curl', type: 'weight-training', emoji: '💪' },
  'kb bicep curl': {
    name: 'Kettlebell Bicep Curl',
    type: 'weight-training',
    emoji: '💪',
  },
  'kb high pull': {
    name: 'Kettlebell High Pull',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'kettlebell overhead press': {
    name: 'Kettlebell Overhead Press',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'step-ups': { name: 'Step-Up', type: 'weight-training', emoji: '🦵' },
  'weighted step-ups': {
    name: 'Weighted Step-Up',
    type: 'weight-training',
    emoji: '🦵',
  },
  'cable face pulls': {
    name: 'Cable Face Pull',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'reverse pec deck': {
    name: 'Reverse Pec Deck',
    type: 'weight-training',
    emoji: '🏋️',
  },
  'captains chair leg raises': {
    name: "Captain's Chair Leg Raise",
    type: 'calisthenics',
    emoji: '🔥',
  },
  'hanging leg raises': {
    name: 'Hanging Leg Raise',
    type: 'calisthenics',
    emoji: '🔥',
  },
  'ab wheel rollout': {
    name: 'Ab Wheel Rollout',
    type: 'calisthenics',
    emoji: '🔥',
  },
  'stair stepper': { name: 'Stair Stepper', type: 'cardio', emoji: '🏃' },
  walk: { name: 'Walking', type: 'cardio', emoji: '🚶' },
  'fan bike': { name: 'Fan Bike', type: 'cardio', emoji: '🚴' },
  yoga: { name: 'Yoga', type: 'mobility', emoji: '🧘' },
  meditation: { name: 'Meditation', type: 'recovery', emoji: '🧘' },
  'dry sauna': { name: 'Sauna', type: 'recovery', emoji: '🧖' },
  sauna: { name: 'Sauna', type: 'recovery', emoji: '🧖' },
  hiit: { name: 'HIIT', type: 'cardio', emoji: '🔥' },
};

// Parse date from various formats
function parseDate(dateStr: string): string | null {
  dateStr = dateStr.trim();

  // Handle "Monday 12/22/25" format
  const dayOfWeekMatch = dateStr.match(
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i
  );
  if (dayOfWeekMatch) {
    const [, month, day, year] = dayOfWeekMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Handle "1/10/26" format (M/D/YY)
  const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

// Parse weight value (handles "150lbs", "45 lb", "16kg", etc.)
function parseWeight(weightStr: string): number | null {
  weightStr = weightStr.toLowerCase().trim();

  // Handle kg to lbs conversion
  const kgMatch = weightStr.match(/([\d.]+)\s*kg/);
  if (kgMatch) {
    return Math.round(parseFloat(kgMatch[1]) * 2.205);
  }

  // Handle lbs
  const lbMatch = weightStr.match(/([\d.]+)\s*(?:lbs?|pounds?)?/);
  if (lbMatch) {
    return parseFloat(lbMatch[1]);
  }

  return null;
}

// Parse time duration (handles "30 min", "30s", "20-30 s", etc.)
function parseTime(timeStr: string): number | null {
  timeStr = timeStr.toLowerCase().trim();

  // Minutes
  const minMatch = timeStr.match(/([\d.]+)\s*min/);
  if (minMatch) {
    return Math.round(parseFloat(minMatch[1]) * 60);
  }

  // Seconds (or range like "20-30 s")
  const secMatch = timeStr.match(/([\d.]+)(?:\s*-\s*[\d.]+)?\s*s(?:ec)?/);
  if (secMatch) {
    return parseFloat(secMatch[1]);
  }

  return null;
}

// Parse exercise line into structured data
function parseExerciseLine(line: string): ParsedExercise | null {
  line = line.trim();

  // Remove checkbox markers
  line = line.replace(/^[-*\[\]x ]+/i, '').trim();

  // Remove leading letters like "A1.", "B2.", etc.
  line = line.replace(/^[A-Z]\d+\.\s*/i, '').trim();

  if (!line || line.length < 3) return null;

  // Try to match various formats

  // Format: "Exercise Name — 3 × 8 @ 150 lb"
  // Format: "Exercise Name 3 x 8 @ 150lbs"
  // Format: "Exercise Name 3x8 @150lb"
  // Format: "Exercise Name 150lbs 5x5"
  // Format: "Exercise Name 10x3" (reps x sets)

  let exerciseName = '';
  let sets: SetData[] = [];

  // Try to extract the pattern
  // Pattern 1: "Name — sets × reps @ weight"
  const dashPattern = line.match(
    /^(.+?)\s*[—–-]\s*(\d+)\s*[×x]\s*([\d–-]+)\s*(?:@\s*(.+))?$/i
  );
  if (dashPattern) {
    const [, name, numSets, reps, weightPart] = dashPattern;
    exerciseName = name.trim();
    const setCount = parseInt(numSets);
    const repCount = parseInt(reps.split(/[–-]/)[0]); // Take first number if range

    if (weightPart) {
      // Check for multiple weights (e.g., "150 lb, 160 lb, 170 lb" or "150lbs, 160lbs, 170lbs")
      const weights = weightPart.split(/,/).map(w => parseWeight(w.trim()));
      for (let i = 0; i < setCount; i++) {
        const weight =
          weights.length > 1
            ? weights[Math.min(i, weights.length - 1)]
            : weights[0];
        sets.push({
          id: uuidv4(),
          reps: repCount,
          weight: weight || undefined,
          completed: true,
        });
      }
    } else {
      for (let i = 0; i < setCount; i++) {
        sets.push({
          id: uuidv4(),
          reps: repCount,
          completed: true,
        });
      }
    }
  }

  // Pattern 2a: "Name sets x reps @ weight" (WITH spaces around x = sets × reps)
  if (sets.length === 0) {
    const spacedPattern = line.match(
      /^(.+?)\s+(\d+)\s+[×x]\s+([\d–-]+)\s*(?:@\s*(.+))?$/i
    );
    if (spacedPattern) {
      const [, name, first, second, weightPart] = spacedPattern;
      exerciseName = name.trim();
      const setCount = parseInt(first); // With spaces: first = sets
      const repCount = parseInt(second.split(/[–-]/)[0]); // second = reps

      if (weightPart) {
        const weights = weightPart.split(/,/).map(w => parseWeight(w.trim()));
        for (let i = 0; i < setCount; i++) {
          const weight =
            weights.length > 1
              ? weights[Math.min(i, weights.length - 1)]
              : weights[0];
          sets.push({
            id: uuidv4(),
            reps: repCount,
            weight: weight || undefined,
            completed: true,
          });
        }
      } else {
        for (let i = 0; i < setCount; i++) {
          sets.push({
            id: uuidv4(),
            reps: repCount,
            completed: true,
          });
        }
      }
    }
  }

  // Pattern 2b: "Name repsxsets @ weight" (WITHOUT spaces = reps × sets, compact format)
  if (sets.length === 0) {
    const compactPattern = line.match(/^(.+?)\s+(\d+)[×x](\d+)\s*@\s*(.+)$/i);
    if (compactPattern) {
      const [, name, first, second, weightPart] = compactPattern;
      exerciseName = name.trim();
      const repCount = parseInt(first); // Without spaces: first = reps
      const setCount = parseInt(second); // second = sets

      const weights = weightPart.split(/,/).map(w => parseWeight(w.trim()));
      for (let i = 0; i < setCount; i++) {
        const weight =
          weights.length > 1
            ? weights[Math.min(i, weights.length - 1)]
            : weights[0];
        sets.push({
          id: uuidv4(),
          reps: repCount,
          weight: weight || undefined,
          completed: true,
        });
      }
    }
  }

  // Pattern 3: "Name weight repsxsets" (e.g., "Deadlift 224lbs 6x4")
  if (sets.length === 0) {
    const reversePattern = line.match(
      /^(.+?)\s+([\d.]+\s*(?:lbs?|kg)?)\s+(\d+)[×x](\d+)$/i
    );
    if (reversePattern) {
      const [, name, weightStr, reps, numSets] = reversePattern;
      exerciseName = name.trim();
      const setCount = parseInt(numSets);
      const repCount = parseInt(reps);
      const weight = parseWeight(weightStr);

      for (let i = 0; i < setCount; i++) {
        sets.push({
          id: uuidv4(),
          reps: repCount,
          weight: weight || undefined,
          completed: true,
        });
      }
    }
  }

  // Pattern 4: "Name repsxsets weight" (e.g., "Skull Crushers 10x3 45lb")
  if (sets.length === 0) {
    const altPattern = line.match(
      /^(.+?)\s+(\d+)[×x](\d+)\s+([\d.]+\s*(?:lbs?|kg)?)$/i
    );
    if (altPattern) {
      const [, name, reps, numSets, weightStr] = altPattern;
      exerciseName = name.trim();
      const setCount = parseInt(numSets);
      const repCount = parseInt(reps);
      const weight = parseWeight(weightStr);

      for (let i = 0; i < setCount; i++) {
        sets.push({
          id: uuidv4(),
          reps: repCount,
          weight: weight || undefined,
          completed: true,
        });
      }
    }
  }

  // Pattern 5: Multiple weights per set (e.g., "Squat 90lbs 10x, 110lb 10x, 130 10x")
  if (sets.length === 0) {
    const multiWeightPattern = line.match(
      /^(.+?)\s+((?:[\d.]+\s*(?:lbs?|kg)?\s*\d+[×x](?:,?\s*)?)+)/i
    );
    if (multiWeightPattern) {
      const [, name, setsStr] = multiWeightPattern;
      exerciseName = name.trim();

      const setMatches = setsStr.matchAll(
        /([\d.]+)\s*(?:lbs?|kg)?\s*(\d+)[×x]/gi
      );
      for (const match of setMatches) {
        const [, weightStr, reps] = match;
        sets.push({
          id: uuidv4(),
          reps: parseInt(reps),
          weight: parseWeight(weightStr) ?? undefined,
          completed: true,
        });
      }
    }
  }

  // Pattern 6: Time-based (e.g., "Run 30 min")
  if (sets.length === 0) {
    const timePattern = line.match(/^(.+?)\s+(\d+)\s*min(?:ute)?s?$/i);
    if (timePattern) {
      const [, name, minutes] = timePattern;
      exerciseName = name.trim();
      sets.push({
        id: uuidv4(),
        time: parseInt(minutes) * 60,
        completed: true,
      });
    }
  }

  // Pattern 7: Bodyweight with reps (e.g., "Pullups 5 (body weight) 5x")
  if (sets.length === 0) {
    const bwPattern = line.match(
      /^(.+?)\s+(\d+)\s*\(?body\s*weight\)?\s*(\d+)[×x]$/i
    );
    if (bwPattern) {
      const [, name, reps, numSets] = bwPattern;
      exerciseName = name.trim();
      const setCount = parseInt(numSets);
      const repCount = parseInt(reps);

      for (let i = 0; i < setCount; i++) {
        sets.push({
          id: uuidv4(),
          reps: repCount,
          completed: true,
        });
      }
    }
  }

  // Pattern 8: Just name and reps (e.g., "Negative pull-ups 15")
  if (sets.length === 0) {
    const simpleRepsPattern = line.match(/^(.+?)\s+(\d+)[×x]?$/i);
    if (simpleRepsPattern) {
      const [, name, reps] = simpleRepsPattern;
      exerciseName = name.trim();
      sets.push({
        id: uuidv4(),
        reps: parseInt(reps),
        completed: true,
      });
    }
  }

  if (!exerciseName || sets.length === 0) {
    return null;
  }

  // Normalize exercise name
  const normalizedName = exerciseName
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .trim();
  const mappedExercise = EXERCISE_MAP[normalizedName];

  if (mappedExercise) {
    return {
      name: mappedExercise.name,
      type: mappedExercise.type,
      emoji: mappedExercise.emoji,
      sets,
    };
  }

  // Default to weight-training if not found
  return {
    name: exerciseName,
    type: 'weight-training',
    sets,
  };
}

// Parse all workout data
function parseWorkoutData(rawData: string): ParsedWorkout[] {
  const workouts: ParsedWorkout[] = [];
  const lines = rawData.split('\n');

  let currentDate: string | null = null;
  let currentExercises: ParsedExercise[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip headers like "Week 1", "Day 1", etc.
    if (/^(Week|Day|Lift|Push|Pull|Legs|Free day|HIIT)\b/i.test(trimmed))
      continue;

    // Try to parse as date
    const date = parseDate(trimmed);
    if (date) {
      // Save previous workout if exists
      if (currentDate && currentExercises.length > 0) {
        workouts.push({
          date: currentDate,
          exercises: currentExercises,
        });
      }
      currentDate = date;
      currentExercises = [];
      continue;
    }

    // Try to parse as exercise
    if (currentDate) {
      const exercise = parseExerciseLine(trimmed);
      if (exercise) {
        currentExercises.push(exercise);
      }
    }
  }

  // Don't forget the last workout
  if (currentDate && currentExercises.length > 0) {
    workouts.push({
      date: currentDate,
      exercises: currentExercises,
    });
  }

  return workouts;
}

// Generate SQL INSERT statements
function generateSQL(workouts: ParsedWorkout[]): string {
  const statements: string[] = [];

  statements.push('-- Workout Import SQL');
  statements.push(`-- Generated: ${new Date().toISOString()}`);
  statements.push(`-- User ID: ${USER_ID}`);
  statements.push(`-- Total workouts: ${workouts.length}`);
  statements.push('');
  statements.push('BEGIN;');
  statements.push('');

  for (const workout of workouts) {
    statements.push(`-- ${workout.date}`);
    let order = 0;
    for (const exercise of workout.exercises) {
      const id = uuidv4();
      const setsJson = JSON.stringify(exercise.sets);
      const emoji = exercise.emoji ? `'${exercise.emoji}'` : 'NULL';

      statements.push(`INSERT INTO public.activities (id, user_id, date, type, name, emoji, completed, sets, "order", updated_at, created_at)
VALUES (
  '${id}',
  '${USER_ID}',
  '${workout.date}',
  '${exercise.type}',
  '${exercise.name.replace(/'/g, "''")}',
  ${emoji},
  true,
  '${setsJson.replace(/'/g, "''")}',
  ${order},
  NOW(),
  NOW()
);`);
      order++;
    }
    statements.push('');
  }

  statements.push('COMMIT;');
  statements.push('');
  statements.push(
    `-- Total exercises inserted: ${workouts.reduce((sum, w) => sum + w.exercises.length, 0)}`
  );

  return statements.join('\n');
}

// Raw workout data - paste your data here
const RAW_WORKOUT_DATA = `
1/10/26
Barbell squat 3 x 8 @ 150lbs
Low incline db bench press 3 x 8 @ 35lb, 40lb, 45lb
Romanian deadlift 3 x 8 @ 185lb
Lat raises 3 x 10 @ 15lbs
Pullups 5 (body weight) 5x
Banded rows 3 x 15

1/12/26
Barbell squat 3 x 8 @ 155lbs
Low incline db bench press 3 x 8 @ 40lb, 45lb, 50lb
Romanian deadlift 3 x 8 @ 190lb
Lat raises 3 x 10 @ 15lbs
Pullups 5 (body weight) 5x
Banded rows 3 x 15

1/14/26
Barbell squat 3 x 8 @ 160lbs
Low incline db bench press 3 x 8 @ 40lb, 45lb, 50lb
Romanian deadlift 3 x 8 @ 190lb
Lat raises 3 x 10 @ 15lbs
Pullups 5 (body weight) 5x
Banded rows 3 x 15

1/17/26
Barbell squat 3 x 8 @ 160lbs, 170lbs, 175lbs
Low incline db bench press 3 x 8 @ 40lb, 45lb, 50lb
Romanian deadlift 3 x 8 @ 190lb
Lat raises 3 x 10 @ 15lbs
Pullups 5 (body weight) 5x
Banded rows 3 x 15

Monday 12/22/25
Barbell Back Squat 4 x 6 @ 135 lb
DB Lateral Raise 4 x 12 @ 15 lb
Barbell Bench Press 3 x 5 @ 95lb
1-Arm DB Row 3 x 8 @ 50 lb
Pull-Ups 3 x 4
Plank + Reach 3 x 20
Standing Calf Raise 3 x 12 @ 95lb
Band Hip Abduction 3 x 15

Tuesday 12/23/25
Run 30 min

11/11/25
Barbell Back Squat 4 x 5 @ 160 lb
Dumbbell Lateral Raise 3 x 12 @ 15 lb
Incline Bench Press (Machine) 3 x 6 @ 110 lb
Chest-Supported Row 3 x 8 @ 70 lb
EZ-Bar Skull Crusher 3 x 10 @ 45 lb
Farmer's Carry 3 x 30

11/14/25
Pull-Up / Assisted Pull-Up 3 x 5
Overhead Press (Dumbbell) 3 x 6 @ 30lb
Leg Press (High Stance) 3 x 8 @ 170lb
Hammer Curl (Dumbbell) 3 x 10 @ 20 lb
Lat Pulldown 3 x 10 @ 120
Overhead Triceps Extension (Dumbbell) 3 x 10 @ 27.5

11/17/25
Deadlift 3 x 5 @ 250
Dumbbell Lateral Raise 3 x 12 @ 15 lb
Seated Leg Curl 3 x 10 @ 120 lb
Machine Weighted Crunch 3 x 15 @ 185lb
Leg Extension 3 x 10 @ 100lb
Calf Raise 3 x 12 @ 170lb

11/20/25
Barbell Back Squat 4 x 5 @ 145
Dumbbell Lateral Raise 3 x 15 @ 15lb
Incline Bench Press (Machine) 3 x 6 @ 115
Chest-Supported Row 3 x 8 @ 70lb
EZ-Bar Skull Crusher 3 x 10 @ 45lb
Farmer's Carry 3 x 30

11/22/25
Pull-Up / Assisted Pull-Up 3 x 6
Overhead Press (Dumbbell) 3 x 6 @ 32.5lb
Dead hang 30
Leg Press (High Stance) 3 x 10 @ 180lb
Hammer Curl (Dumbbell) 3 x 10 @ 20
Lat Pulldown 3 x 10 @ 120
Overhead Triceps Extension (Dumbbell) 3 x 10 @ 27.5

11/23/25
Deadlift 3 x 5 @ 255 lb
Dumbbell Lateral Raise 3 x 12 @ 15lb
Seated Leg Curl 3 x 10 @ 125lb
Machine Weighted Crunch 3 x 15 @ 185lb
Leg Extension 3 x 10 @ 105 lb
Calf Raise 3 x 12 @ 180lb

11/25/25
Barbell Back Squat 4 x 5 @ 150
Dumbbell Lateral Raise 3 x 15 @ 17.5lb
Incline Bench Press (Machine) 3 x 6 @ 120
Chest-Supported Row 3 x 8 @ 72.5lb
EZ-Bar Skull Crusher 3 x 10 @ 55lb
Farmer's Carry 3 x 30

11/26/25
Pull-Up / Assisted Pull-Up 3 x 7
Overhead Press (Dumbbell) 3 x 6 @ 32.5lb
Dead hang 30
Leg Press (High Stance) 3 x 10 @ 180lb
Hammer Curl (Dumbbell) 3 x 10 @ 20lb
Lat Pulldown 3 x 12 @ 120 lb
Overhead Triceps Extension (Dumbbell) 3 x 10 @ 30lb

11/27/25
Deadlift 3 x 5 @ 260 lb
Dumbbell Lateral Raise 3 x 12 @ 17.5lb
Seated Leg Curl 3 x 10 @ 130lb
Machine Weighted Crunch 3 x 15 @ 185lb
Leg Extension 3 x 10 @ 125 lb
Calf Raise 3 x 12 @ 200lb

12/1/25
Barbell Back Squat 4 x 5 @ 155
Dumbbell Lateral Raise 4 x 15 @ 15lb
Incline Bench Press (Machine) 3 x 5 @ 110, 110, 125
Chest-Supported Row 3 x 8 @ 75lb
EZ-Bar Skull Crusher 3 x 10 @ 55lb
Farmer's Carry 3 x 30

12/3/25
Pull-Up / Assisted Pull-Up 3 x 7
Overhead Press (Dumbbell) 3 x 10 @ 30lb
Dead hang 35
Leg Press (High Stance) 3 x 10 @ 180lb
Hammer Curl (Dumbbell) 3 x 10 @ 22.5lb
Lat Pulldown 3 x 12 @ 120 lb
Overhead Triceps Extension (Dumbbell) 3 x 10 @ 30lb

12/5/25
Deadlift 3 x 5 @ 245 lb
Dumbbell Lateral Raise 3 x 12 @ 15lb
Hammer Curl 3 x 10 @ 25lb
Overhead Triceps Extension 3 x 10 @ 35lb
Curl 3 x 10 @ 25 lb
Goblet squat 3 x 10 @ 53lbs

11/10/25
Leg press 3 x 12 @ 180lbs
Calf press 3 x 12 @ 180lbs
Leg curl 3 x 10 @ 100lbs
Inclined chest press 3 x 12 @ 45lbs
Leg extension 3 x 10 @ 165lbs
Lat pulldown 3 x 10 @ 120lbs

11/12/25
Deadlift 3 x 6 @ 225lbs
Barbell Back Squat 3 x 5 @ 135lbs
Chin up 3 x 2
Pull-up 3 x 2
Dead hang 30
Bench press 3 x 6 @ 95lbs

11/13/25
Skull crushers 3 x 10 @ 55lbs
Hammer curls 3 x 10 @ 20lbs
Curls 3 x 10 @ 20lbs
Db lat raise 3 x 6 @ 17.5lbs
Kb swings 4 x 25 @ 62lbs

10/13/25
Smith machine Squat 1 x 5 @ 120, 2 x 5 @ 140, 2 x 5 @ 160
Smith machine calf raises 1 x 10 @ 120, 1 x 10 @ 140, 1 x 10 @ 160
Seated Leg Curl 1 x 10 @ 140, 1 x 10 @ 160, 1 x 10 @ 180
Seated leg extensions 1 x 10 @ 80, 1 x 10 @ 90, 1 x 10 @ 100
Leg press 1 x 8 @ 140, 1 x 8 @ 160, 1 x 8 @ 180

10/15/25
Machine Incline Press 1 x 4 @ 120, 1 x 5 @ 120, 1 x 4 @ 110
Kettlebell Clean & Press 1 x 5 @ 35, 1 x 6 @ 26, 1 x 6 @ 26
Dumbbell Lateral Raise 3 x 12 @ 15 lb
EZ-Bar Skull Crusher 3 x 10 @ 45 lb
Overhead Triceps Extension 3 x 10 @ 25 lb

10/17/25
Chest-Supported Row 3 x 8 @ 65 lb
Deadlift 3 x 5 @ 245 lb
Preacher Curl 3 x 10 @ 45 lb
Lat Pulldown 3 x 10 @ 100 lb
Assisted Pull-Up 3 x 6 @ 95 lb
Farmer's Carry 2 x 30

10/20/25
Preacher Curl 3 x 10 @ 47.5 lb
Lat Pulldown 3 x 10 @ 100 lb
Chest-Supported Row 3 x 8 @ 70 lb
Pull-Up / Negatives 3 x 5
Deadlift 3 x 5 @ 250 lb

10/24/25
Dumbbell Lateral Raise 3 x 12 @ 15 lb
Overhead Triceps Extension 3 x 10 @ 27.5 lb
EZ-Bar Skull Crusher 3 x 12 @ 45 lb
Machine Incline Press 3 x 6 @ 110 lb
Kettlebell Clean & Press 3 x 6 @ 35

10/25/25
Smith Machine Squat 3 x 5 @ 165 lb
Smith Machine Calf Raise 3 x 15 @ 165 lb
Leg Extension 3 x 10 @ 60 lb
Seated Leg Curl 5 x 10 @ 60lb
Stair stepper 10 min

10/28/25
KB Deadlift 3 x 10 @ 50 lb
KB Romanian Deadlift 3 x 12 @ 50 lb
KB Swing 3 x 15 @ 50 lb
Single-Arm KB Row 3 x 10 @ 50 lb
Bent-Over KB Row 3 x 12 @ 35 lb
KB High Pull 3 x 10 @ 35 lb
KB Hammer Curl 3 x 10 @ 35 lb
KB Bicep Curl 3 x 15 @ 15 lb
Farmer's Carry 3 x 30

10/29/25
Cable Overhead Triceps Extension 3 x 10 @ 20 lb
Overhead Press 3 x 6 @ 30 lb
Overhead Triceps Extension 3 x 10 @ 30 lb
Dumbbell Lateral Raise 3 x 10 @ 15 lb
Incline bench Press 3 x 6 @ 95 lb

10/30/25
Seated Leg Curl 3 x 10 @ 180 lb
Leg Extension 3 x 10 @ 105 lb
Smith Machine Calf Raise 3 x 15 @ 170 lb
Leg Press 3 x 8 @ 190 lb
Smith Machine Squat 3 x 5 @ 170 lb

11/1/25
Hammer curl 3 x 10 @ 20lbs
Lat Pulldown 3 x 10 @ 120 lb
Pull-Up / Negatives 3 x 5
Deadlift 3 x 5 @ 255 lb
Chest-Supported Row 3 x 8 @ 75 lb

11/4/25
Leg Extension 3 x 10 @ 110 lb
Seated Leg Curl 3 x 10 @ 195 lb
Smith Machine Calf Raise 3 x 15 @ 175 lb
Smith Machine Squat 3 x 5 @ 175 lb

11/5/25
Walk 10 min
Fan bike 5 min
Farmer's Carry 3 x 30
Overhead Triceps Extension 3 x 10 @ 30 lb
EZ-Bar Skull Crusher 3 x 10 @ 45 lb
Dumbbell Lateral Raise 3 x 10 @ 17.5 lb
Kettlebell Clean & Press 3 x 6 @ 40
Machine Incline Press 3 x 6 @ 115 lb

11/7/25
Chest-Supported Row 3 x 10 @ 45, 50, 55
Lat Pulldown 3 x 10 @ 122.5 lb
Pull-Up / Negatives 3 x 5
Deadlift 3 x 5 @ 260 lb

8/13/25
Smith machine squat 5 x 5 @ 90lbs
Leg curls seated 5 x 10 @ 90lbs
Incline press 5 x 5 @ 114lbs

8/14/25
Deadlift 4 x 6 @ 224lbs
Kettlebell Overhead Press 4 x 10 @ 26lbs
Assisted Pull-Up 5 x 5 @ 110lb
Kettlebell Hammer Curl 5 x 10 @ 26lbs
Ab Wheel Rollout 3 x 10

8/18/25
Smith Machine Squat 3 x 10 @ 90lbs
Kettlebell Swing 4 x 25 @ 35lbs
Chest-Supported Row 3 x 10 @ 30lbs
Incline Press 5 x 5 @ 114lbs
Seated Leg Curl 3 x 10 @ 90lbs

8/19/25
Deadlift 4 x 6 @ 224lbs
Overhead Kettlebell Press 4 x 10 @ 26lbs
Pull-Up 5 x 5 @ 110lb
Hammer Curl 3 x 10 @ 25lbs
Ab Wheel Rollout 3 x 10

8/21/25
Squat 3 x 10 @ 134lbs
Kettlebell Swing 4 x 25 @ 40lbs
Chest-Supported Row 3 x 10 @ 45lbs
Incline Press 3 x 10 @ 90lbs
Seated Leg Curl 1 x 10 @ 90, 1 x 10 @ 100, 1 x 10 @ 110

8/23/25
Deadlift 4 x 6 @ 224lbs
Kettlebell Clean and Press 4 x 10 @ 26lbs
Hammer Curl 3 x 10 @ 25lbs
Weighted crunches 1 x 50 @ 205lbs

8/25/25
Squat 3 x 10 @ 134lbs
Kettlebell Swing 4 x 25 @ 40lbs
Chest-Supported Row 3 x 10 @ 45lbs
Incline Press 3 x 12 @ 90lbs
Seated Leg Curl 1 x 10 @ 90, 1 x 10 @ 100, 1 x 10 @ 110

8/26/25
Deadlift 4 x 6 @ 224lbs
Kettlebell Clean and Press 4 x 10 @ 26lbs
Hammer Curl 3 x 10 @ 25lbs
Pull-Up 5 x 5 @ 95lb
Ab Wheel Rollout 3 x 10

8/29/25
Smith machine Squat 1 x 10 @ 90, 1 x 10 @ 110, 1 x 10 @ 130
Kettlebell Swing 2 x 50 @ 40lbs
Chest-Supported Row 3 x 12 @ 45lbs
Incline Press 3 x 10 @ 90lbs
Seated Leg Curl 1 x 10 @ 100, 1 x 10 @ 120, 1 x 10 @ 140

9/3/25
Deadlift 4 x 6 @ 224lbs
Kettlebell Clean and Press 4 x 10 @ 31lbs
Hammer Curl 4 x 10 @ 26lbs
Pull-Up 5 x 5 @ 95lb
Weighted sit-ups 2 x 25 @ 205 lbs

9/4/25
Smith machine Squat 1 x 10 @ 120, 2 x 10 @ 130
Kettlebell Swing 4 x 25 @ 53lbs
Chest-Supported Row 4 x 10 @ 45lbs
Incline Press 3 x 10 @ 90lbs
Seated Leg Curl 1 x 10 @ 100, 1 x 10 @ 120, 1 x 10 @ 140

9/8/25
Deadlift 4 x 6 @ 224lbs
Kettlebell Clean and Press 4 x 10 @ 31lbs
Hammer Curl 4 x 10 @ 26lbs
Negative pull-ups 1 x 15

9/10/25
Smith machine Squat 1 x 10 @ 120, 2 x 10 @ 130
Kettlebell Swing 4 x 25 @ 53lbs
Chest-Supported Row 4 x 10 @ 45lbs
Incline Press 3 x 10 @ 90lbs
Seated Leg Curl 1 x 10 @ 120, 1 x 10 @ 140, 1 x 10 @ 160

9/16/25
Deadlift 4 x 6 @ 224lbs
Kettlebell Clean and Press 4 x 10 @ 31lbs
Hammer Curl 4 x 10 @ 26lbs
Negative pull-ups 4 x 5

9/18/25
Smith machine Squat 1 x 10 @ 120, 1 x 10 @ 140, 1 x 10 @ 160
Chest-Supported Row 4 x 10 @ 45lbs
Incline Press 3 x 10 @ 90lbs
Seated Leg Curl 1 x 15 @ 120, 1 x 15 @ 140, 1 x 15 @ 160

9/26/25
Deadlift 5 x 5 @ 224lbs
Kettlebell Clean and Press 5 x 5 @ 35lbs
Hammer Curl 5 x 5 @ 26lbs

10/8/25
Smith machine Squat 2 x 5 @ 120, 2 x 5 @ 140, 1 x 5 @ 160
Chest-Supported Row 1 x 10 @ 45, 1 x 10 @ 50, 1 x 10 @ 55, 1 x 5 @ 60, 1 x 15 @ 65
Incline Press 2 x 5 @ 90, 2 x 5 @ 110, 1 x 5 @ 120
Seated Leg Curl 2 x 5 @ 120, 1 x 5 @ 130, 1 x 5 @ 140, 1 x 5 @ 150

10/9/25
Deadlift 5 x 5 @ 244lbs
Kettlebell Clean and Press 5 x 5 @ 35lbs
Hammer Curl 5 x 7 @ 26lbs
Negative pull-ups 1 x 15

10/11/25
Chest-Supported Row 1 x 10 @ 45, 1 x 10 @ 55, 1 x 5 @ 65, 1 x 5 @ 75
Seated Leg Curl 1 x 10 @ 120, 1 x 10 @ 140, 1 x 10 @ 160
Lat pulldowns 1 x 10 @ 100, 1 x 10 @ 120, 1 x 10 @ 140
Preacher curls 5 x 5 @ 32lbs
Leg extension 1 x 10 @ 80, 1 x 10 @ 90, 1 x 10 @ 100

6/9/25
Overhead Press 3 x 10 @ 30lbs
Curl 3 x 10 @ 30lbs
Bench Press 3 x 10 @ 95lbs
Skull Crushers 3 x 10 @ 45lbs
Dumbbell Lateral Raises 3 x 8 @ 20lbs
Cable Face Pulls 1 x 10 @ 25, 1 x 10 @ 30, 1 x 10 @ 35

6/10/25
Squat 3 x 8 @ 50lb
Leg Press 3 x 10 @ 200lbs
Calf Press 1 x 10 @ 220, 1 x 10 @ 240, 1 x 10 @ 260
Captains chair Leg Raises 4 x 10

6/11/25
Dumbbell Row 3 x 10 @ 55lb
Curls 3 x 10 @ 25lb
Hammer Curls 3 x 10 @ 25lb
Lat Pulldown 3 x 10 @ 100lb
Reverse Pec Deck 3 x 10 @ 85lb

6/12/25
Deadlift 1 x 8 @ 134, 2 x 8 @ 224
Step-ups 5 x 5
Kettlebell swings 3 x 25 @ 44lbs
Weighted crunches 2 x 25 @ 185lb

6/16/25
Overhead Press 3 x 10 @ 30lb
Skull Crushers 3 x 10 @ 45lb
Dumbbell Lateral Raises 3 x 10 @ 20lb
Bench Press 3 x 5 @ 114lb
Cable Face Pulls 1 x 10 @ 30, 1 x 10 @ 35, 1 x 10 @ 42.5

6/17/25
Squat 3 x 8 @ 70lb
Leg Press 3 x 10 @ 200lb
Calf Press 1 x 10 @ 220, 1 x 10 @ 240, 1 x 10 @ 260
Captains chair Leg Raises 4 x 10

6/19/25
Dumbbell Row 3 x 8 @ 60
Curls 3 x 10 @ 25lb
Hammer Curls 3 x 10 @ 25lb
Lat Pulldown 1 x 10 @ 100, 2 x 10 @ 120
Reverse Pec Deck 1 x 10 @ 85, 1 x 10 @ 100, 1 x 10 @ 115

6/20/25
Deadlift 1 x 8 @ 134, 2 x 8 @ 224
Step-ups 5 x 10
Kettlebell swings 3 x 25 @ 44lbs
Weighted crunches 2 x 25 @ 205lb

6/23/25
Overhead Press 3 x 10 @ 32.5lb
Skull Crushers 3 x 10 @ 45lb
Dumbbell Lateral Raises 1 x 10 @ 20, 2 x 10 @ 15
Bench Press 3 x 3 @ 134lb
Cable Face Pulls 1 x 10 @ 35, 1 x 10 @ 42.5, 1 x 10 @ 50
Sauna 10 min

6/24/25
Squat 3 x 8 @ 94lb
Leg Press 3 x 10 @ 200lb
Calf Press 1 x 10 @ 220, 1 x 10 @ 240, 1 x 10 @ 260
Captains chair Leg Raises 2 x 20

6/25/25
Dumbbell Row 3 x 10 @ 60
Curls 3 x 10 @ 25lb
Hammer Curls 3 x 10 @ 25lb
Lat Pulldown 1 x 10 @ 100, 1 x 10 @ 120, 1 x 10 @ 140
Reverse Pec Deck 1 x 10 @ 85, 1 x 10 @ 100, 1 x 10 @ 115

6/26/25
Deadlift 1 x 8 @ 134, 2 x 8 @ 224
Step-ups 5 x 10
Kettlebell swings 3 x 20 @ 62lbs
Weighted crunches 2 x 25 @ 205lb

6/30/25
Overhead Press 3 x 8 @ 32.5lb
Skull Crushers 3 x 10 @ 45lb
Dumbbell Lateral Raises 3 x 10 @ 15lb
Bench Press 1 x 8 @ 94, 2 x 8 @ 114
Cable Face Pulls 1 x 10 @ 35, 1 x 10 @ 42.5, 1 x 10 @ 50
Sauna 15 min

7/1/25
Squat 1 x 8 @ 94, 1 x 8 @ 114, 1 x 8 @ 134
Leg Press 1 x 10 @ 191.4, 1 x 10 @ 211.4, 1 x 10 @ 241.4
Calf Press 3 x 10 @ 241.4
Hanging Leg Raises 3 x 10

7/2/25
Dumbbell Row 2 x 5 @ 65, 1 x 10 @ 65
Curls 3 x 10 @ 25lb
Hammer Curls 3 x 10 @ 25lb
Lat Pulldown 1 x 10 @ 100, 2 x 10 @ 120
Reverse Pec Deck 1 x 10 @ 85, 1 x 10 @ 100, 1 x 10 @ 115

7/3/25
Yoga 15 min
Meditation 10 min

7/4/25
Deadlift 3 x 8 @ 224lb
Step-ups 3 x 10
Kettlebell swings 3 x 25 @ 62lbs
KB Weighted sit-ups 5 x 10 @ 15lbs

7/6/25
HIIT 5 min warmup
Sprint 30 sec

7/7/25
Overhead Press 3 x 10 @ 32.5lb
Skull Crushers 3 x 10 @ 45lb
Dumbbell Lateral Raises 3 x 10 @ 15lb
Bench Press 2 x 10 @ 94, 2 x 5 @ 114
Cable Face Pulls 1 x 10 @ 42.5, 1 x 10 @ 50, 1 x 10 @ 57.5

7/8/25
Squat 1 x 10 @ 94, 1 x 10 @ 114, 1 x 10 @ 134
Leg Press 1 x 10 @ 200, 1 x 10 @ 230, 1 x 10 @ 240
Calf Press 1 x 10 @ 240, 1 x 10 @ 260, 1 x 10 @ 280
Captains chair Leg Raises 3 x 20

7/9/25
Dumbbell Row 3 x 10 @ 65
Curls 3 x 10 @ 25lb
Hammer Curls 3 x 10 @ 25lb
Lat Pulldown 1 x 10 @ 100, 1 x 10 @ 120, 1 x 10 @ 140
Reverse Pec Deck 1 x 10 @ 85, 1 x 10 @ 100, 1 x 10 @ 115

7/10/25
Weighted step-ups 3 x 10 @ 15lb
Deadlift 3 x 8 @ 224lb
Kettlebell swings 3 x 25 @ 62lbs
KB Weighted sit-ups 5 x 10 @ 15lbs

7/14/25
Overhead Press 3 x 10 @ 30lb
Skull Crushers 3 x 10 @ 45lb
Dumbbell Lateral Raises 3 x 10 @ 15lb
Bench Press 2 x 10 @ 94, 1 x 10 @ 114
Cable Face Pulls 1 x 10 @ 42.5, 1 x 10 @ 50, 1 x 10 @ 57.5

7/15/25
Squat 1 x 10 @ 94, 2 x 10 @ 144
Leg Press 1 x 10 @ 200, 1 x 10 @ 230, 1 x 10 @ 240
Calf Press 1 x 10 @ 240, 1 x 10 @ 260, 1 x 10 @ 280
Captains chair Leg Raises 3 x 20

7/16/25
Dumbbell Row 3 x 10 @ 65
Curls 3 x 10 @ 25lb
Hammer Curls 3 x 10 @ 25lb
Lat Pulldown 1 x 10 @ 100, 1 x 10 @ 120, 1 x 10 @ 140
Reverse Pec Deck 1 x 10 @ 85, 1 x 10 @ 100, 1 x 10 @ 115

7/17/25
Weighted step-ups 3 x 10 @ 18lb
Deadlift 3 x 8 @ 224lb
Kettlebell swings 3 x 25 @ 62lbs
Weighted crunches 2 x 25 @ 205lb

7/21/25
Shoulder Press 1 x 10 @ 58, 1 x 10 @ 78, 1 x 10 @ 98
Skull Crushers 3 x 10 @ 45lb
Dumbbell Lateral Raises 3 x 10 @ 15lb
Bench Press 2 x 10 @ 94, 1 x 10 @ 114
Cable Face Pulls 1 x 10 @ 42.5, 1 x 10 @ 50, 1 x 10 @ 57.5

7/22/25
Squat 1 x 10 @ 107.6, 2 x 10 @ 177.6
Leg Press 1 x 10 @ 200, 1 x 10 @ 220, 1 x 10 @ 240
Calf Press 1 x 10 @ 240, 1 x 10 @ 260, 1 x 10 @ 280
Captains chair Leg Raises 3 x 20

7/23/25
Dumbbell Row 3 x 10 @ 65
Curls 3 x 10 @ 25lb
Hammer Curls 3 x 10 @ 25lb
Lat Pulldown 1 x 10 @ 100, 1 x 10 @ 120, 1 x 10 @ 140
Reverse Pec Deck 1 x 10 @ 85, 1 x 10 @ 100, 1 x 10 @ 115

7/26/25
Weighted step-ups 3 x 10 @ 20lb
Deadlift 3 x 8 @ 224lb
Kettlebell swings 3 x 25 @ 62lbs
Weighted crunches 2 x 25 @ 205lb

7/28/25
Overhead Press 3 x 10 @ 30lb
Skull Crushers 3 x 10 @ 45lb
Dumbbell Lateral Raises 3 x 10 @ 15lb
Chest Press 1 x 10 @ 100, 2 x 8 @ 115
Cable Face Pulls 1 x 10 @ 42.5, 1 x 10 @ 50, 1 x 10 @ 57.5

7/29/25
Squat 1 x 10 @ 134, 1 x 10 @ 154, 1 x 10 @ 174
Leg Press 1 x 10 @ 200, 1 x 10 @ 220, 1 x 10 @ 240
Calf Press 1 x 10 @ 240, 1 x 10 @ 260, 1 x 10 @ 280
Captains chair Leg Raises 3 x 20

7/31/25
Dumbbell Row 3 x 10 @ 65
Curls 3 x 10 @ 25lb
Hammer Curls 3 x 10 @ 25lb
Lat Pulldown 1 x 10 @ 100, 1 x 10 @ 120, 1 x 10 @ 140
Reverse Pec Deck 1 x 10 @ 85, 1 x 10 @ 100, 1 x 10 @ 115
`;

// Main execution
const workouts = parseWorkoutData(RAW_WORKOUT_DATA);
console.log(generateSQL(workouts));
