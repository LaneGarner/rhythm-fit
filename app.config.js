import 'dotenv/config';

export default {
  expo: {
    name: 'Rhythm - Workout Tracker and AI Fitness Coach',
    slug: 'rhythm',
    // ...other Expo config as needed
    extra: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    },
  },
};
