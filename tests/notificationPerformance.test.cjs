const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const dayjs = require('dayjs');
function harness() {
  const calls = [];
  const pending = new Map();
  const load = require('./helpers/loadTs.cjs')({
    'react-native': {
      AppState: { currentState: 'active' },
      Platform: { OS: 'ios' },
    },
    'expo-notifications': {
      getAllScheduledNotificationsAsync: async () => [...pending.values()],
      cancelScheduledNotificationAsync: async id => {
        calls.push(['cancel', id]);
        pending.delete(id);
      },
      scheduleNotificationAsync: async request => {
        calls.push(['schedule', request.identifier]);
        pending.set(request.identifier, request);
      },
      SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
      AndroidNotificationPriority: { HIGH: 'high' },
    },
  });
  return {
    ...load(path.join(__dirname, '../services/notifications.ts')),
    calls,
    pending,
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

test('an unfinished reminder uses the latest activity when scheduling begins', async () => {
  const h = harness();
  let activity = {
    id: 'bench',
    name: 'Bench Press',
    completed: false,
    sets: [{ completed: true }, { completed: false }],
  };
  const scheduling = h.scheduleUnfinishedWorkout(() => activity);
  activity = { ...activity, completed: true };
  await scheduling;
  assert.equal(h.pending.size, 0);
});

test('reconciliation removes pending reminders for finished exercises only', async () => {
  const h = harness();
  const partial = id => ({
    id,
    name: id,
    completed: false,
    sets: [{ completed: true }, { completed: false }],
  });
  await h.scheduleUnfinishedWorkout(() => partial('finished'));
  await h.scheduleUnfinishedWorkout(() => partial('still-going'));
  const unrelated = h.NOTIFICATION_IDS.restTimer;
  h.pending.set(unrelated, { identifier: unrelated });
  await h.reconcileUnfinishedWorkouts(
    () => [{ ...partial('finished'), completed: true }, partial('still-going')],
    true
  );
  const inProgress = h.NOTIFICATION_IDS.unfinishedWorkoutPrefix + 'still-going';
  assert.deepEqual([...h.pending.keys()], [inProgress, unrelated]);
});

test('reconciliation cancels a pending reminder after an overlapping schedule', async () => {
  const h = harness();
  const activity = {
    id: 'row',
    name: 'Row',
    completed: false,
    sets: [{ completed: true }, { completed: false }],
  };
  const scheduling = h.scheduleUnfinishedWorkout(() => activity);
  const reconciling = h.reconcileUnfinishedWorkouts(() => [activity], false);
  await Promise.all([scheduling, reconciling]);
  assert.equal(h.pending.size, 0);
});
