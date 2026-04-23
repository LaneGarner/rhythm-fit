/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'RhythmWidget',
  displayName: 'Rhythm',
  deploymentTarget: '16.1',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
  colors: {
    $accent: { color: '#FF6B35', darkColor: '#FF8C5A' },
    $rest: { color: '#F5A623', darkColor: '#F5A623' },
    $warning: { color: '#E53935', darkColor: '#E53935' },
  },
};
