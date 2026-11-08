const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const dayjs = require('dayjs');
function harness() {
  const calls = [];
  const load = require('./helpers/loadTs.cjs')({
    'react-native': {
      AppState: { currentState: 'active' },
      Platform: { OS: 'ios' },
    },
    'expo-notifications': {
      cancelScheduledNotificationAsync: async id => calls.push(['cancel', id]),
      scheduleNotificationAsync: async request =>
        calls.push(['schedule', request.identifier]),
      SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
      AndroidNotificationPriority: { HIGH: 'high' },
    },
  });
  return {
    ...load(path.join(__dirname, '../services/notifications.ts')),
    calls,
  };
}
test('identical concurrent reminder plans produce one native scheduling pass', async () => {
  const h = harness();
  const settings = {
    enabled: true,
    scheduledReminder: true,
    scheduledReminderTime: '09:00',
    inactivityNudge: false,
    weeklySummary: false,
  };
  const records = [
    {
      id: 'today',
      name: 'Squat',
      completed: false,
      date: dayjs().format('YYYY-MM-DD'),
    },
  ];
  await Promise.all(
    Array.from({ length: 5 }, () =>
      h.evaluateAndScheduleNotifications(settings, records, true)
    )
  );
  assert.equal(h.calls.filter(c => c[0] === 'schedule').length, 1);
  const count = h.calls.length;
  await h.evaluateAndScheduleNotifications(
    settings,
    records.map(a => ({ ...a, notes: 'unrelated edit' })),
    true
  );
  assert.equal(h.calls.length, count);
  await h.evaluateAndScheduleNotifications(
    settings,
    records.map(a => ({ ...a, completed: true })),
    true
  );
  assert.ok(h.calls.length > count);
});
