import { Alert, Linking } from 'react-native';

export const generateYouTubeSearchQuery = (props: {
  searchTerm: string;
  searchType: 'routine' | 'exercise';
}) => {
  const { searchTerm, searchType } = props;

  if (searchType === 'routine') {
    return `${searchTerm} routine`;
  } else {
    return `${searchTerm} exercise tutorial`;
  }
};

export const openYouTubeSearch = async (searchQuery: string) => {
  try {
    const encodedQuery = encodeURIComponent(searchQuery);

    // Try YouTube app first
    const youtubeAppUrl = `youtube://www.youtube.com/results?search_query=${encodedQuery}`;
    const canOpenYouTube = await Linking.canOpenURL(youtubeAppUrl);

    if (canOpenYouTube) {
      await Linking.openURL(youtubeAppUrl);
    } else {
      // Fallback to browser
      const browserUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`;
      await Linking.openURL(browserUrl);
    }

  } catch (error) {
    console.error('Error opening YouTube search:', error);
    Alert.alert('Error', 'Could not open YouTube search');
  }
};
