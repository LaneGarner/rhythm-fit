import 'dotenv/config';

export default {
  expo: {
    name: 'Rhythm',
    slug: 'rhythm',
    // ...other Expo config as needed
    extra: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    },
  },
};
