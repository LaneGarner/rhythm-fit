// Exercise database with comprehensive metadata for LLM understanding
// Updated to match simplified activity types: weight-training, calisthenics, cardio, mobility, recovery, sports, other

import { ActivityType } from '../types/activity';

export interface ExerciseDefinition {
  name: string;
  type: ActivityType;
  category: ExerciseCategory;
  muscleGroups: MuscleGroup[];
  equipment?: Equipment[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description?: string;
  variations?: string[];
}

export type ExerciseCategory =
  | 'Compound'
  | 'Isolation'
  | 'Cardiovascular'
  | 'Flexibility'
  | 'Balance'
  | 'Plyometric'
  | 'Core'
  | 'Strength'
  | 'Endurance'
  | 'Recovery'
  | 'Team Sport'
  | 'Individual Sport'
  | 'Mindfulness';

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Forearms'
  | 'Core'
  | 'Lower Back'
  | 'Glutes'
  | 'Quadriceps'
  | 'Hamstrings'
  | 'Calves'
  | 'Full Body'
  | 'Cardiovascular'
  | 'Arms'
  | 'Neck'
  | 'Hip Flexors'
  | 'Adductors'
  | 'Abductors'
  | 'Legs'
  | 'Balance'
  | 'None';

export type Equipment =
  | 'Barbell'
  | 'Dumbbell'
  | 'Kettlebell'
  | 'Cable Machine'
  | 'Smith Machine'
  | 'Resistance Band'
  | 'Bodyweight'
  | 'Treadmill'
  | 'Bike'
  | 'Rower'
  | 'Elliptical'
  | 'Medicine Ball'
  | 'TRX'
  | 'Foam Roller'
  | 'Yoga Mat'
  | 'Jump Rope'
  | 'Pull-up Bar'
  | 'Dip Bars'
  | 'Gymnastics Rings'
  | 'Weight Plate'
  | 'Bench'
  | 'Squat Rack'
  | 'Deadlift Platform'
  | 'Stair Climber'
  | 'Basketball'
  | 'Court'
  | 'Soccer Ball'
  | 'Field'
  | 'Tennis Racket'
  | 'Tennis Ball'
  | 'Volleyball'
  | 'Net'
  | 'Baseball'
  | 'Bat'
  | 'Hockey Stick'
  | 'Puck'
  | 'Rink'
  | 'Rugby Ball'
  | 'Climbing Gear'
  | 'Climbing Wall'
  | 'Boxing Gloves'
  | 'Punching Bag'
  | 'Golf Clubs'
  | 'Golf Ball'
  | 'Course'
  | 'Kayak'
  | 'Paddle'
  | 'Paddleboard'
  | 'Skateboard'
  | 'Surfboard'
  | 'Barre'
  | 'Light Weights'
  | 'Various'
  | 'None';

export const EXERCISE_DATABASE: ExerciseDefinition[] = [
  // ===== WEIGHT TRAINING =====

  // Compound Movements
  {
    name: 'Bench Press',
    type: 'weight-training',
    category: 'Compound',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    equipment: ['Barbell', 'Bench'],
    difficulty: 'Intermediate',
    description: 'Classic compound movement for chest development',
    variations: [
      'Incline Bench Press',
      'Decline Bench Press',
      'Dumbbell Bench Press',
      'Close Grip Bench Press',
    ],
  },
  {
    name: 'Overhead Press',
    type: 'weight-training',
    category: 'Compound',
    muscleGroups: ['Shoulders', 'Triceps'],
    equipment: ['Barbell', 'Dumbbell'],
    difficulty: 'Intermediate',
    description: 'Vertical pressing movement for shoulder strength',
    variations: [
      'Military Press',
      'Push Press',
      'Arnold Press',
      'Landmine Press',
    ],
  },
  {
    name: 'Deadlift',
    type: 'weight-training',
    category: 'Compound',
    muscleGroups: ['Back', 'Glutes', 'Hamstrings', 'Lower Back'],
    equipment: ['Barbell'],
    difficulty: 'Advanced',
    description: 'Fundamental movement for posterior chain development',
    variations: [
      'Romanian Deadlift',
      'Sumo Deadlift',
      'Trap Bar Deadlift',
      'Stiff Leg Deadlift',
    ],
  },
  {
    name: 'Squat',
    type: 'weight-training',
    category: 'Compound',
    muscleGroups: ['Quadriceps', 'Glutes', 'Core'],
    equipment: ['Barbell', 'Dumbbell'],
    difficulty: 'Intermediate',
    description: 'King of leg exercises for overall lower body strength',
    variations: [
      'Front Squat',
      'Back Squat',
      'Goblet Squat',
      'Box Squat',
      'Pause Squat',
    ],
  },
  {
    name: 'Bent Over Row',
    type: 'weight-training',
    category: 'Compound',
    muscleGroups: ['Back', 'Biceps'],
    equipment: ['Barbell', 'Dumbbell'],
    difficulty: 'Intermediate',
    description: 'Horizontal pulling movement for back thickness',
    variations: ['Pendlay Row', 'T-Bar Row', 'Cable Row', 'Single Arm Row'],
  },
  {
    name: 'Lunge',
    type: 'weight-training',
    category: 'Compound',
    muscleGroups: ['Quadriceps', 'Glutes', 'Core'],
    equipment: ['Dumbbell', 'Barbell'],
    difficulty: 'Intermediate',
    description: 'Unilateral leg exercise for balance and strength',
    variations: [
      'Walking Lunge',
      'Reverse Lunge',
      'Side Lunge',
      'Bulgarian Split Squat',
    ],
  },
  {
    name: 'Hip Thrust',
    type: 'weight-training',
    category: 'Compound',
    muscleGroups: ['Glutes', 'Hamstrings'],
    equipment: ['Barbell', 'Dumbbell'],
    difficulty: 'Intermediate',
    description: 'Glute-focused exercise for posterior chain development',
    variations: [
      'Single Leg Hip Thrust',
      'Glute Bridge',
      'Weighted Hip Thrust',
    ],
  },

  // Isolation Movements
  {
    name: 'Dumbbell Curl',
    type: 'weight-training',
    category: 'Isolation',
    muscleGroups: ['Biceps'],
    equipment: ['Dumbbell'],
    difficulty: 'Beginner',
    description: 'Isolation exercise for bicep development',
    variations: [
      'Hammer Curl',
      'Preacher Curl',
      'Concentration Curl',
      'Incline Curl',
    ],
  },
  {
    name: 'Tricep Extension',
    type: 'weight-training',
    category: 'Isolation',
    muscleGroups: ['Triceps'],
    equipment: ['Dumbbell', 'Cable Machine'],
    difficulty: 'Beginner',
    description: 'Isolation exercise for tricep development',
    variations: [
      'Overhead Extension',
      'Cable Extension',
      'Skull Crushers',
      'Diamond Push-Up',
    ],
  },
  {
    name: 'Lat Pulldown',
    type: 'weight-training',
    category: 'Isolation',
    muscleGroups: ['Back'],
    equipment: ['Cable Machine'],
    difficulty: 'Beginner',
    description: 'Machine-based back exercise',
    variations: ['Wide Grip', 'Close Grip', 'Reverse Grip', 'Single Arm'],
  },
  {
    name: 'Calf Raise',
    type: 'weight-training',
    category: 'Isolation',
    muscleGroups: ['Calves'],
    equipment: ['Dumbbell', 'Weight Plate'],
    difficulty: 'Beginner',
    description: 'Isolation exercise for calf development',
    variations: [
      'Standing Calf Raise',
      'Seated Calf Raise',
      'Single Leg Calf Raise',
    ],
  },
  {
    name: 'Lateral Raise',
    type: 'weight-training',
    category: 'Isolation',
    muscleGroups: ['Shoulders'],
    equipment: ['Dumbbell'],
    difficulty: 'Beginner',
    description: 'Isolation exercise for lateral deltoids',
    variations: [
      'Cable Lateral Raise',
      'Bent Over Lateral Raise',
      'Front Raise',
    ],
  },
  {
    name: 'Leg Extension',
    type: 'weight-training',
    category: 'Isolation',
    muscleGroups: ['Quadriceps'],
    equipment: ['Cable Machine'],
    difficulty: 'Beginner',
    description: 'Machine-based quad isolation',
    variations: ['Single Leg Extension', 'Drop Set Extension'],
  },
  {
    name: 'Leg Curl',
    type: 'weight-training',
    category: 'Isolation',
    muscleGroups: ['Hamstrings'],
    equipment: ['Cable Machine'],
    difficulty: 'Beginner',
    description: 'Machine-based hamstring isolation',
    variations: ['Lying Leg Curl', 'Seated Leg Curl', 'Standing Leg Curl'],
  },

  // ===== CALISTHENICS =====

  {
    name: 'Pull-Up',
    type: 'calisthenics',
    category: 'Compound',
    muscleGroups: ['Back', 'Biceps'],
    equipment: ['Pull-up Bar'],
    difficulty: 'Intermediate',
    description: 'Upper body pulling movement for back strength',
    variations: [
      'Chin-Up',
      'Assisted Pull-Up',
      'Wide Grip Pull-Up',
      'L-Sit Pull-Up',
    ],
  },
  {
    name: 'Push-Up',
    type: 'calisthenics',
    category: 'Compound',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    description: 'Classic bodyweight exercise for upper body strength',
    variations: [
      'Diamond Push-Up',
      'Wide Push-Up',
      'Decline Push-Up',
      'Pike Push-Up',
    ],
  },
  {
    name: 'Dip',
    type: 'calisthenics',
    category: 'Compound',
    muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
    equipment: ['Dip Bars'],
    difficulty: 'Intermediate',
    description: 'Bodyweight exercise for upper body pushing strength',
    variations: ['Ring Dips', 'Assisted Dips', 'Weighted Dips'],
  },
  {
    name: 'Muscle-Up',
    type: 'calisthenics',
    category: 'Compound',
    muscleGroups: ['Back', 'Chest', 'Biceps', 'Triceps'],
    equipment: ['Pull-up Bar', 'Gymnastics Rings'],
    difficulty: 'Advanced',
    description: 'Advanced calisthenics movement combining pull-up and dip',
    variations: ['Ring Muscle-Up', 'Bar Muscle-Up'],
  },
  {
    name: 'Handstand Push-Up',
    type: 'calisthenics',
    category: 'Compound',
    muscleGroups: ['Shoulders', 'Triceps'],
    equipment: ['Bodyweight'],
    difficulty: 'Advanced',
    description: 'Advanced shoulder pressing movement',
    variations: ['Wall-Assisted', 'Freestanding', 'Pike Push-Up'],
  },
  {
    name: 'Pistol Squat',
    type: 'calisthenics',
    category: 'Compound',
    muscleGroups: ['Quadriceps', 'Glutes', 'Core'],
    equipment: ['Bodyweight'],
    difficulty: 'Advanced',
    description: 'Single-leg bodyweight squat',
    variations: ['Assisted Pistol', 'Weighted Pistol'],
  },
  {
    name: 'L-Sit',
    type: 'calisthenics',
    category: 'Core',
    muscleGroups: ['Core', 'Hip Flexors'],
    equipment: ['Dip Bars', 'Pull-up Bar'],
    difficulty: 'Intermediate',
    description: 'Static core exercise requiring hip flexor strength',
    variations: ['Tuck L-Sit', 'Advanced L-Sit', 'V-Sit'],
  },
  {
    name: 'Plank',
    type: 'calisthenics',
    category: 'Core',
    muscleGroups: ['Core'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    description: 'Static core strengthening exercise',
    variations: ['Side Plank', 'Plank Up-Down', 'Plank with Leg Lift'],
  },
  {
    name: 'Russian Twist',
    type: 'calisthenics',
    category: 'Core',
    muscleGroups: ['Core'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    description: 'Rotational core exercise',
    variations: ['Weighted Russian Twist', 'Medicine Ball Russian Twist'],
  },
  {
    name: 'Bicycle Crunches',
    type: 'calisthenics',
    category: 'Core',
    muscleGroups: ['Core'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    description: 'Dynamic core exercise targeting obliques',
    variations: ['Slow Bicycle Crunches', 'Fast Bicycle Crunches'],
  },
  {
    name: 'Leg Raises',
    type: 'calisthenics',
    category: 'Core',
    muscleGroups: ['Core', 'Hip Flexors'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    description: 'Lower abdominal strengthening exercise',
    variations: [
      'Hanging Leg Raises',
      'Bent Knee Leg Raises',
      "Captain's Chair Leg Raises",
    ],
  },
  {
    name: 'Side Plank',
    type: 'calisthenics',
    category: 'Core',
    muscleGroups: ['Core'],
    equipment: ['Bodyweight'],
    difficulty: 'Beginner',
    description: 'Lateral core strengthening exercise',
    variations: [
      'Side Plank with Leg Lift',
      'Side Plank Dips',
      'Modified Side Plank',
    ],
  },
  {
    name: 'Planche',
    type: 'calisthenics',
    category: 'Compound',
    muscleGroups: ['Shoulders', 'Chest', 'Core'],
    equipment: ['Bodyweight'],
    difficulty: 'Advanced',
    description: 'Advanced static hold requiring immense upper body strength',
    variations: ['Tuck Planche', 'Advanced Tuck', 'Straddle Planche'],
  },

  // ===== YOGA POSES (Expanded) =====
  {
    name: 'Tree Pose',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Legs', 'Core', 'Balance'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Standing balance pose for focus and stability',
    variations: ['Half Lotus Tree', 'Extended Tree Pose'],
  },
  {
    name: 'Warrior I',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Legs', 'Core', 'Shoulders'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Standing pose for strength and flexibility',
    variations: ['Warrior II', 'Warrior III', 'Reverse Warrior'],
  },
  {
    name: 'Triangle Pose',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Legs', 'Core', 'Shoulders'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Lateral stretch for legs and torso',
    variations: ['Revolved Triangle', 'Extended Triangle'],
  },
  {
    name: 'Crow Pose',
    type: 'mobility',
    category: 'Balance',
    muscleGroups: ['Arms', 'Core', 'Balance'],
    equipment: ['None'],
    difficulty: 'Intermediate',
    description: 'Arm balance pose for core and upper body strength',
    variations: ['Side Crow', 'One-Legged Crow'],
  },
  {
    name: 'Bridge Pose',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Glutes', 'Back', 'Core'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Backbend for glute and spinal strength',
    variations: ['Supported Bridge', 'Wheel Pose'],
  },
  {
    name: 'Seated Forward Fold',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Hamstrings', 'Back'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Hamstring and back stretch',
    variations: ['Wide-Legged Forward Fold', 'Standing Forward Fold'],
  },
  {
    name: 'Boat Pose',
    type: 'mobility',
    category: 'Core',
    muscleGroups: ['Core', 'Hip Flexors'],
    equipment: ['None'],
    difficulty: 'Intermediate',
    description: 'Core strengthening balance pose',
    variations: ['Half Boat', 'Low Boat'],
  },
  {
    name: 'Camel Pose',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Back', 'Hip Flexors'],
    equipment: ['None'],
    difficulty: 'Intermediate',
    description: 'Deep backbend for spine and hips',
    variations: ['Supported Camel', 'One-Arm Camel'],
  },
  {
    name: 'Happy Baby',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Hip Flexors', 'Back'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Gentle hip opener and back stretch',
    variations: ['Reclined Happy Baby'],
  },
  // ===== MINDFULNESS & MEDITATION (Expanded) =====
  {
    name: 'Body Scan Meditation',
    type: 'recovery',
    category: 'Mindfulness',
    muscleGroups: ['None'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Guided awareness of body sensations',
    variations: ['Guided Body Scan', 'Self-Directed Body Scan'],
  },
  {
    name: 'Breathwork',
    type: 'recovery',
    category: 'Mindfulness',
    muscleGroups: ['None'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Conscious breathing for relaxation and focus',
    variations: [
      'Box Breathing',
      '4-7-8 Breathing',
      'Alternate Nostril Breathing',
    ],
  },
  {
    name: 'Walking Meditation',
    type: 'recovery',
    category: 'Mindfulness',
    muscleGroups: ['Full Body'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Mindful walking for awareness and calm',
    variations: ['Slow Walking', 'Outdoor Walking Meditation'],
  },
  {
    name: 'Guided Visualization',
    type: 'recovery',
    category: 'Mindfulness',
    muscleGroups: ['None'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Mental imagery for relaxation and focus',
    variations: ['Guided Journey', 'Goal Visualization'],
  },
  // ===== WEIGHT LIFTING VARIATIONS (Expanded) =====
  {
    name: 'Incline Bench Press',
    type: 'weight-training',
    category: 'Compound',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    equipment: ['Barbell', 'Bench'],
    difficulty: 'Intermediate',
    description: 'Bench press variation targeting upper chest',
    variations: ['Dumbbell Incline Bench Press', 'Smith Machine Incline Bench'],
  },
  {
    name: 'Decline Bench Press',
    type: 'weight-training',
    category: 'Compound',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    equipment: ['Barbell', 'Bench'],
    difficulty: 'Intermediate',
    description: 'Bench press variation targeting lower chest',
    variations: ['Dumbbell Decline Bench Press', 'Smith Machine Decline Bench'],
  },
  {
    name: 'Smith Machine Squat',
    type: 'weight-training',
    category: 'Compound',
    muscleGroups: ['Quadriceps', 'Glutes', 'Core'],
    equipment: ['Smith Machine', 'Barbell'],
    difficulty: 'Beginner',
    description: 'Squat variation using Smith Machine for stability',
    variations: ['Smith Machine Front Squat', 'Smith Machine Split Squat'],
  },
  {
    name: 'Cable Fly',
    type: 'weight-training',
    category: 'Isolation',
    muscleGroups: ['Chest'],
    equipment: ['Cable Machine'],
    difficulty: 'Beginner',
    description: 'Chest isolation using cable machine',
    variations: ['High Cable Fly', 'Low Cable Fly'],
  },
  {
    name: 'Hammer Curl',
    type: 'weight-training',
    category: 'Isolation',
    muscleGroups: ['Biceps'],
    equipment: ['Dumbbell'],
    difficulty: 'Beginner',
    description: 'Bicep curl variation with neutral grip',
    variations: ['Cross-Body Hammer Curl', 'Seated Hammer Curl'],
  },
  {
    name: 'Face Pull',
    type: 'weight-training',
    category: 'Isolation',
    muscleGroups: ['Shoulders', 'Back'],
    equipment: ['Cable Machine'],
    difficulty: 'Beginner',
    description: 'Rear delt and upper back exercise',
    variations: ['Rope Face Pull', 'Band Face Pull'],
  },
  // ===== CALISTHENICS (Expanded) =====
  {
    name: 'Archer Push-Up',
    type: 'calisthenics',
    category: 'Compound',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps', 'Core'],
    equipment: ['Bodyweight'],
    difficulty: 'Advanced',
    description: 'Push-up variation with unilateral emphasis',
    variations: ['Pseudo Planche Push-Up', 'Typewriter Push-Up'],
  },
  {
    name: 'Shrimp Squat',
    type: 'calisthenics',
    category: 'Compound',
    muscleGroups: ['Quadriceps', 'Glutes', 'Core'],
    equipment: ['Bodyweight'],
    difficulty: 'Advanced',
    description: 'Single-leg squat variation',
    variations: ['Assisted Shrimp Squat'],
  },
  {
    name: 'Dragon Flag',
    type: 'calisthenics',
    category: 'Core',
    muscleGroups: ['Core', 'Hip Flexors'],
    equipment: ['Bodyweight'],
    difficulty: 'Advanced',
    description: 'Core-intensive bodyweight movement',
    variations: ['Tuck Dragon Flag', 'Negative Dragon Flag'],
  },
  // ===== CARDIO (Expanded) =====

  {
    name: 'Running',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Cardiovascular', 'Full Body'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Fundamental cardiovascular exercise',
    variations: [
      'Jog',
      'Sprint',
      'Tempo Run',
      'Long Distance',
      'Fartlek',
      'Hill Running',
    ],
  },
  {
    name: 'Cycling',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Cardiovascular', 'Quadriceps', 'Calves'],
    equipment: ['Bike'],
    difficulty: 'Beginner',
    description: 'Low-impact cardiovascular exercise',
    variations: [
      'Stationary Bike',
      'Road Cycling',
      'Mountain Biking',
      'Indoor Cycling',
    ],
  },
  {
    name: 'Swimming',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Cardiovascular', 'Full Body'],
    equipment: ['None'],
    difficulty: 'Intermediate',
    description: 'Full-body cardiovascular exercise',
    variations: [
      'Freestyle',
      'Breaststroke',
      'Butterfly',
      'Backstroke',
      'Sidestroke',
    ],
  },
  {
    name: 'Rowing',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Cardiovascular', 'Back', 'Arms'],
    equipment: ['Rower'],
    difficulty: 'Intermediate',
    description: 'Full-body cardio with emphasis on back',
    variations: ['Indoor Rowing', 'Outdoor Rowing', 'Interval Rowing'],
  },
  {
    name: 'Jump Rope',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Cardiovascular', 'Calves', 'Core'],
    equipment: ['Jump Rope'],
    difficulty: 'Beginner',
    description: 'High-intensity cardio with coordination benefits',
    variations: ['Basic Jump', 'Double Unders', 'Crossovers', 'Side Swings'],
  },
  {
    name: 'Elliptical',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Cardiovascular', 'Full Body'],
    equipment: ['Elliptical'],
    difficulty: 'Beginner',
    description: 'Low-impact full-body cardio machine',
    variations: ['Forward Motion', 'Reverse Motion', 'Interval Training'],
  },
  {
    name: 'Stair Climber',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Cardiovascular', 'Quadriceps', 'Glutes'],
    equipment: ['Stair Climber'],
    difficulty: 'Intermediate',
    description: 'Vertical cardio exercise targeting legs',
    variations: ['Steady State', 'Interval Training', 'Side Stepping'],
  },
  {
    name: 'High-Intensity Interval Training (HIIT)',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Cardiovascular', 'Full Body'],
    equipment: ['None'],
    difficulty: 'Advanced',
    description: 'Alternating high and low intensity periods',
    variations: ['Tabata', 'Circuit Training', 'AMRAP'],
  },
  {
    name: 'Sprinting',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Cardiovascular', 'Legs'],
    equipment: ['None'],
    difficulty: 'Intermediate',
    description: 'Short-distance, high-intensity running',
    variations: ['Hill Sprints', 'Interval Sprints'],
  },
  {
    name: 'Mountain Climbers',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Cardiovascular', 'Core', 'Shoulders'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Dynamic full-body cardio movement',
    variations: ['Cross-Body Mountain Climbers', 'Slow Mountain Climbers'],
  },
  {
    name: 'Battle Ropes',
    type: 'cardio',
    category: 'Cardiovascular',
    muscleGroups: ['Arms', 'Shoulders', 'Core', 'Cardiovascular'],
    equipment: ['Various'],
    difficulty: 'Intermediate',
    description: 'High-intensity rope training for cardio and strength',
    variations: ['Alternating Waves', 'Double Waves', 'Slams'],
  },

  // ===== MOBILITY & RECOVERY (Expanded) =====

  {
    name: 'Yoga',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Full Body'],
    equipment: ['Yoga Mat'],
    difficulty: 'Beginner',
    description: 'Mind-body practice for flexibility and mindfulness',
    variations: [
      'Hatha Yoga',
      'Vinyasa Flow',
      'Power Yoga',
      'Yin Yoga',
      'Restorative Yoga',
    ],
  },
  {
    name: 'Sun Salutation',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Full Body'],
    equipment: ['Yoga Mat'],
    difficulty: 'Beginner',
    description: 'Classic yoga warm-up sequence',
    variations: ['Surya Namaskara A', 'Surya Namaskara B'],
  },
  {
    name: 'Downward Dog',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Shoulders', 'Core', 'Calves'],
    equipment: ['Yoga Mat'],
    difficulty: 'Beginner',
    description:
      'Foundational yoga pose for shoulder and hamstring flexibility',
    variations: ['Three-Legged Dog', 'Puppy Dog'],
  },
  {
    name: 'Pigeon Pose',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Hip Flexors', 'Glutes'],
    equipment: ['Yoga Mat'],
    difficulty: 'Intermediate',
    description: 'Deep hip opener for flexibility',
    variations: ['Reclining Pigeon', 'King Pigeon'],
  },
  {
    name: "Child's Pose",
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Back', 'Shoulders'],
    equipment: ['Yoga Mat'],
    difficulty: 'Beginner',
    description: 'Restorative pose for back and shoulder flexibility',
    variations: ["Extended Child's Pose", 'Thread the Needle'],
  },
  {
    name: 'Cat-Cow Stretch',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Back', 'Core'],
    equipment: ['Yoga Mat'],
    difficulty: 'Beginner',
    description: 'Dynamic spinal mobility exercise',
    variations: ['Seated Cat-Cow', 'Standing Cat-Cow'],
  },
  {
    name: 'Hip Flexor Stretch',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Hip Flexors'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Stretch for tight hip flexors',
    variations: ['Kneeling Hip Flexor Stretch', 'Standing Hip Flexor Stretch'],
  },
  {
    name: 'Hamstring Stretch',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Hamstrings'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Stretch for tight hamstrings',
    variations: [
      'Seated Hamstring Stretch',
      'Standing Hamstring Stretch',
      'Lying Hamstring Stretch',
    ],
  },
  {
    name: 'Shoulder Stretch',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Shoulders', 'Chest'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Stretch for tight shoulders and chest',
    variations: ['Doorway Stretch', 'Cross-Body Stretch', 'Overhead Stretch'],
  },
  {
    name: 'Thoracic Extension',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Back'],
    equipment: ['Foam Roller'],
    difficulty: 'Intermediate',
    description: 'Mobility exercise for thoracic spine',
    variations: ['Foam Roller Extension', 'Wall Extension'],
  },
  {
    name: 'Neck Stretch',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Neck'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Stretch for neck mobility and tension relief',
    variations: ['Lateral Neck Stretch', 'Forward Neck Stretch'],
  },
  {
    name: 'Wrist Mobility',
    type: 'mobility',
    category: 'Flexibility',
    muscleGroups: ['Forearms'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Exercises for wrist flexibility and strength',
    variations: ['Wrist Circles', 'Palm Lifts'],
  },
  {
    name: 'Percussion Massage',
    type: 'recovery',
    category: 'Recovery',
    muscleGroups: ['Full Body'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Massage gun or manual percussion for muscle recovery',
    variations: ['Quads', 'Back', 'Shoulders'],
  },

  // ===== RECOVERY =====

  {
    name: 'Foam Rolling',
    type: 'recovery',
    category: 'Recovery',
    muscleGroups: ['Full Body'],
    equipment: ['Foam Roller'],
    difficulty: 'Beginner',
    description: 'Self-myofascial release technique',
    variations: ['IT Band Roll', 'Quad Roll', 'Back Roll', 'Calf Roll'],
  },
  {
    name: 'Sauna',
    type: 'recovery',
    category: 'Recovery',
    muscleGroups: ['Full Body'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Heat therapy for muscle recovery and relaxation',
    variations: ['Traditional Sauna', 'Infrared Sauna', 'Steam Room'],
  },
  {
    name: 'Cold Plunge',
    type: 'recovery',
    category: 'Recovery',
    muscleGroups: ['Full Body'],
    equipment: ['None'],
    difficulty: 'Intermediate',
    description: 'Cold therapy for muscle recovery and inflammation reduction',
    variations: ['Ice Bath', 'Cold Shower', 'Cryotherapy'],
  },
  {
    name: 'Stretching',
    type: 'recovery',
    category: 'Recovery',
    muscleGroups: ['Full Body'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Static stretching for muscle recovery',
    variations: ['Static Stretch', 'Dynamic Stretch', 'PNF Stretching'],
  },
  {
    name: 'Meditation',
    type: 'recovery',
    category: 'Mindfulness',
    muscleGroups: ['None'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Mental recovery and stress reduction practice',
    variations: [
      'Mindfulness Meditation',
      'Transcendental Meditation',
      'Loving-Kindness Meditation',
    ],
  },
  {
    name: 'Walking',
    type: 'recovery',
    category: 'Recovery',
    muscleGroups: ['Full Body'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Low-intensity movement for active recovery',
    variations: ['Leisurely Walk', 'Nature Walk', 'Treadmill Walk'],
  },

  // ===== SPORTS =====

  // Team Sports
  {
    name: 'Basketball',
    type: 'sports',
    category: 'Team Sport',
    muscleGroups: ['Full Body', 'Cardiovascular'],
    equipment: ['Basketball', 'Court'],
    difficulty: 'Intermediate',
    description:
      'High-intensity team sport with cardiovascular and skill components',
    variations: [
      'Pickup Basketball',
      'Competitive Basketball',
      'Shooting Practice',
    ],
  },
  {
    name: 'Soccer',
    type: 'sports',
    category: 'Team Sport',
    muscleGroups: ['Full Body', 'Cardiovascular', 'Legs'],
    equipment: ['Soccer Ball', 'Field'],
    difficulty: 'Intermediate',
    description: 'Endurance-based team sport with technical skills',
    variations: ['Pickup Soccer', 'Competitive Soccer', 'Skills Training'],
  },
  {
    name: 'Tennis',
    type: 'sports',
    category: 'Individual Sport',
    muscleGroups: ['Full Body', 'Cardiovascular', 'Arms'],
    equipment: ['Tennis Racket', 'Tennis Ball', 'Court'],
    difficulty: 'Intermediate',
    description: 'Individual sport requiring coordination and endurance',
    variations: ['Singles', 'Doubles', 'Practice Session'],
  },
  {
    name: 'Golf',
    type: 'sports',
    category: 'Individual Sport',
    muscleGroups: ['Core', 'Shoulders', 'Arms'],
    equipment: ['Golf Clubs', 'Golf Ball', 'Course'],
    difficulty: 'Beginner',
    description: 'Precision sport requiring technique and mental focus',
    variations: ['Driving Range', 'Full Round', 'Putting Practice'],
  },
  {
    name: 'Volleyball',
    type: 'sports',
    category: 'Team Sport',
    muscleGroups: ['Full Body', 'Cardiovascular', 'Arms'],
    equipment: ['Volleyball', 'Net', 'Court'],
    difficulty: 'Intermediate',
    description: 'Team sport requiring jumping and coordination',
    variations: ['Indoor Volleyball', 'Beach Volleyball', 'Practice Session'],
  },
  {
    name: 'Baseball',
    type: 'sports',
    category: 'Team Sport',
    muscleGroups: ['Full Body', 'Arms', 'Core'],
    equipment: ['Baseball', 'Bat', 'Field'],
    difficulty: 'Intermediate',
    description: 'Team sport with explosive movements and coordination',
    variations: ['Pickup Game', 'Competitive Baseball', 'Batting Practice'],
  },
  {
    name: 'Hockey',
    type: 'sports',
    category: 'Team Sport',
    muscleGroups: ['Full Body', 'Cardiovascular', 'Legs'],
    equipment: ['Hockey Stick', 'Puck', 'Rink'],
    difficulty: 'Advanced',
    description: 'High-intensity team sport on ice',
    variations: ['Ice Hockey', 'Street Hockey', 'Practice Session'],
  },
  {
    name: 'Rugby',
    type: 'sports',
    category: 'Team Sport',
    muscleGroups: ['Full Body', 'Cardiovascular'],
    equipment: ['Rugby Ball', 'Field'],
    difficulty: 'Advanced',
    description: 'High-contact team sport requiring strength and endurance',
    variations: ['Touch Rugby', 'Full Contact Rugby', 'Skills Training'],
  },

  // Individual Sports
  {
    name: 'Rock Climbing',
    type: 'sports',
    category: 'Individual Sport',
    muscleGroups: ['Full Body', 'Arms', 'Core'],
    equipment: ['Climbing Gear', 'Climbing Wall'],
    difficulty: 'Intermediate',
    description: 'Full-body sport requiring strength and problem-solving',
    variations: ['Indoor Climbing', 'Outdoor Climbing', 'Bouldering'],
  },
  {
    name: 'Boxing',
    type: 'sports',
    category: 'Individual Sport',
    muscleGroups: ['Full Body', 'Cardiovascular', 'Arms'],
    equipment: ['Boxing Gloves', 'Punching Bag'],
    difficulty: 'Intermediate',
    description: 'Combat sport requiring coordination and endurance',
    variations: ['Heavy Bag Work', 'Shadow Boxing', 'Sparring'],
  },
  {
    name: 'Martial Arts',
    type: 'sports',
    category: 'Individual Sport',
    muscleGroups: ['Full Body', 'Cardiovascular'],
    equipment: ['None'],
    difficulty: 'Intermediate',
    description: 'Combat sport with various disciplines',
    variations: ['Karate', 'Judo', 'Taekwondo', 'Brazilian Jiu-Jitsu'],
  },
  {
    name: 'Swimming (Competitive)',
    type: 'sports',
    category: 'Individual Sport',
    muscleGroups: ['Full Body', 'Cardiovascular'],
    equipment: ['None'],
    difficulty: 'Intermediate',
    description: 'Competitive swimming with various strokes',
    variations: ['Freestyle', 'Breaststroke', 'Butterfly', 'Backstroke'],
  },
  {
    name: 'Track and Field',
    type: 'sports',
    category: 'Individual Sport',
    muscleGroups: ['Full Body', 'Cardiovascular'],
    equipment: ['None'],
    difficulty: 'Intermediate',
    description: 'Various athletic events',
    variations: ['Sprinting', 'Long Distance', 'Jumping', 'Throwing'],
  },
  {
    name: 'Frisbee',
    type: 'sports',
    category: 'Individual Sport',
    muscleGroups: ['Arms', 'Cardiovascular', 'Full Body'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Throwing and catching disc sport',
    variations: ['Ultimate Frisbee', 'Freestyle Frisbee'],
  },
  {
    name: 'Table Tennis',
    type: 'sports',
    category: 'Individual Sport',
    muscleGroups: ['Arms', 'Core', 'Cardiovascular'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Racquet sport for agility and coordination',
    variations: ['Singles', 'Doubles'],
  },
  {
    name: 'Jump Shot Practice',
    type: 'sports',
    category: 'Individual Sport',
    muscleGroups: ['Arms', 'Legs', 'Core'],
    equipment: ['Basketball', 'Court'],
    difficulty: 'Beginner',
    description: 'Basketball skill practice for shooting',
    variations: ['Free Throws', 'Three-Point Shots'],
  },

  // ===== OTHER =====

  {
    name: 'Dancing',
    type: 'other',
    category: 'Cardiovascular',
    muscleGroups: ['Full Body', 'Cardiovascular'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Rhythmic movement for fitness and fun',
    variations: ['Zumba', 'Hip Hop', 'Ballet', 'Salsa', 'Ballroom'],
  },
  {
    name: 'Hiking',
    type: 'other',
    category: 'Endurance',
    muscleGroups: ['Full Body', 'Cardiovascular', 'Legs'],
    equipment: ['None'],
    difficulty: 'Beginner',
    description: 'Outdoor activity combining cardio and nature',
    variations: ['Day Hike', 'Backpacking', 'Trail Running'],
  },
  {
    name: 'Kayaking',
    type: 'other',
    category: 'Endurance',
    muscleGroups: ['Arms', 'Core', 'Shoulders'],
    equipment: ['Kayak', 'Paddle'],
    difficulty: 'Intermediate',
    description: 'Water sport requiring upper body strength',
    variations: [
      'Recreational Kayaking',
      'White Water Kayaking',
      'Sea Kayaking',
    ],
  },
  {
    name: 'Paddleboarding',
    type: 'other',
    category: 'Balance',
    muscleGroups: ['Core', 'Legs', 'Arms'],
    equipment: ['Paddleboard', 'Paddle'],
    difficulty: 'Intermediate',
    description: 'Water sport requiring balance and core strength',
    variations: ['Stand Up Paddleboarding', 'Yoga on Paddleboard'],
  },
  {
    name: 'Skateboarding',
    type: 'other',
    category: 'Balance',
    muscleGroups: ['Legs', 'Core', 'Balance'],
    equipment: ['Skateboard'],
    difficulty: 'Intermediate',
    description: 'Balance sport requiring coordination',
    variations: ['Street Skateboarding', 'Vert Skateboarding', 'Longboarding'],
  },
  {
    name: 'Surfing',
    type: 'other',
    category: 'Balance',
    muscleGroups: ['Full Body', 'Core', 'Arms'],
    equipment: ['Surfboard'],
    difficulty: 'Advanced',
    description: 'Water sport requiring balance and wave reading',
    variations: ['Shortboarding', 'Longboarding', 'Bodyboarding'],
  },
  {
    name: 'CrossFit',
    type: 'other',
    category: 'Strength',
    muscleGroups: ['Full Body'],
    equipment: ['Various'],
    difficulty: 'Advanced',
    description: 'High-intensity functional fitness program',
    variations: [
      'WOD (Workout of the Day)',
      'CrossFit Games',
      'CrossFit Classes',
    ],
  },
  {
    name: 'Pilates',
    type: 'other',
    category: 'Core',
    muscleGroups: ['Core', 'Full Body'],
    equipment: ['Yoga Mat'],
    difficulty: 'Beginner',
    description:
      'Low-impact exercise focusing on core strength and flexibility',
    variations: ['Mat Pilates', 'Reformer Pilates', 'Cadillac Pilates'],
  },
  {
    name: 'Barre',
    type: 'other',
    category: 'Strength',
    muscleGroups: ['Legs', 'Core', 'Arms'],
    equipment: ['Barre', 'Light Weights'],
    difficulty: 'Beginner',
    description: 'Ballet-inspired workout combining strength and flexibility',
    variations: ['Classic Barre', 'Cardio Barre', 'Barre Fusion'],
  },
];

// Helper functions for LLM to use
export const getExercisesByType = (
  type: ActivityType
): ExerciseDefinition[] => {
  return EXERCISE_DATABASE.filter(exercise => exercise.type === type);
};

export const getExercisesByMuscleGroup = (
  muscleGroup: MuscleGroup
): ExerciseDefinition[] => {
  return EXERCISE_DATABASE.filter(exercise =>
    exercise.muscleGroups.includes(muscleGroup)
  );
};

export const getExercisesByCategory = (
  category: ExerciseCategory
): ExerciseDefinition[] => {
  return EXERCISE_DATABASE.filter(exercise => exercise.category === category);
};

export const getExercisesByDifficulty = (
  difficulty: ExerciseDefinition['difficulty']
): ExerciseDefinition[] => {
  return EXERCISE_DATABASE.filter(
    exercise => exercise.difficulty === difficulty
  );
};

export const findExerciseByName = (
  name: string
): ExerciseDefinition | undefined => {
  return EXERCISE_DATABASE.find(
    exercise => exercise.name.toLowerCase() === name.toLowerCase()
  );
};

export const searchExercises = (query: string): ExerciseDefinition[] => {
  const lowerQuery = query.toLowerCase();
  return EXERCISE_DATABASE.filter(
    exercise =>
      exercise.name.toLowerCase().includes(lowerQuery) ||
      exercise.muscleGroups.some(mg => mg.toLowerCase().includes(lowerQuery)) ||
      exercise.category.toLowerCase().includes(lowerQuery)
  );
};

// Export simple arrays for backward compatibility
export const ACTIVITY_TYPES: ActivityType[] = Array.from(
  new Set(EXERCISE_DATABASE.map(ex => ex.type))
);

export const COMMON_EXERCISES: string[] = EXERCISE_DATABASE.map(ex => ex.name);
