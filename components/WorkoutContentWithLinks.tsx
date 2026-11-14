import React from 'react';
import { View } from 'react-native';
import Markdown, { MarkdownIt } from 'react-native-markdown-display';
import { useTheme } from '../theme/ThemeContext';

const markdown = MarkdownIt({ typographer: false, linkify: true });

function isYouTubeLink(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return ['youtube.com', 'youtu.be', 'youtube-nocookie.com'].some(
      domain => host === domain || host.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

interface MarkdownToken {
  type: string;
  markup: string;
  content: string;
  children: MarkdownToken[] | null;
  attrGet(name: string): string | null;
}

markdown.core.ruler.after(
  'linkify',
  'remove_youtube_links',
  (state: { tokens: MarkdownToken[] }) => {
    for (const token of state.tokens) {
      const children = token.children;
      if (!children) continue;
      for (let index = children.length - 1; index >= 0; index--) {
        const child = children[index];
        if (
          child.type !== 'link_open' ||
          !isYouTubeLink(child.attrGet('href') ?? '')
        )
          continue;
        const close = children.findIndex(
          (item, position) => position > index && item.type === 'link_close'
        );
        if (close < 0) continue;
        const label = children.slice(index + 1, close);
        const labelText = label.map(item => item.content).join('');
        children.splice(
          index,
          close - index + 1,
          ...(child.markup === 'linkify' ||
          child.markup === 'autolink' ||
          isYouTubeLink(labelText)
            ? []
            : label)
        );
      }
    }
  }
);

interface WorkoutContentWithLinksProps {
  text: string;
}

export const WorkoutContentWithLinks = React.memo(
  (props: WorkoutContentWithLinksProps) => {
    const { text } = props;
    const { colors } = useTheme();

    const markdownStyles = {
      body: {
        color: colors.text,
        fontSize: 16,
        lineHeight: 22,
      },
      heading1: {
        color: colors.text,
        fontSize: 20,
        fontWeight: 'bold' as const,
        marginTop: 8,
        marginBottom: 4,
      },
      heading2: {
        color: colors.text,
        fontSize: 18,
        fontWeight: 'bold' as const,
        marginTop: 6,
        marginBottom: 3,
      },
      heading3: {
        color: colors.text,
        fontSize: 16,
        fontWeight: 'bold' as const,
        marginTop: 4,
        marginBottom: 2,
      },
      paragraph: {
        color: colors.text,
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 8,
      },
      list_item: {
        color: colors.text,
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
        backgroundColor: colors.backgroundTertiary,
        color: colors.primary.main,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 3,
        fontFamily: 'monospace',
      },
      code_block: {
        backgroundColor: colors.backgroundTertiary,
        color: colors.primary.main,
        padding: 12,
        borderRadius: 6,
        fontFamily: 'monospace',
        marginVertical: 8,
      },
      blockquote: {
        borderLeftWidth: 4,
        borderLeftColor: colors.primary.main,
        paddingLeft: 12,
        marginVertical: 8,
        backgroundColor: colors.backgroundSecondary,
        paddingVertical: 8,
        paddingRight: 8,
      },
      strong: {
        fontWeight: 'bold' as const,
        color: colors.text,
      },
      em: {
        fontStyle: 'italic' as const,
        color: colors.text,
      },
      link: {
        color: colors.primary.main,
        textDecorationLine: 'underline' as const,
      },
    };

    return (
      <View style={{ flex: 1 }}>
        <Markdown style={markdownStyles} markdownit={markdown}>
          {text}
        </Markdown>
      </View>
    );
  }
);
