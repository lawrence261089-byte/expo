import AppMetrics, { type Session } from 'expo-app-metrics';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/utils/theme';

export default function SessionsList() {
  const theme = useTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const currentMainStart = sessions.find((s) => s.type === 'main')?.startDate;
  const isActive = (s: Session) =>
    !s.endDate && currentMainStart != null && s.startDate >= currentMainStart;

  const refresh = useCallback(async () => {
    const result = await AppMetrics.getAllSessions();
    const sorted = [...result].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    setSessions(sorted);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'ios') {
        refresh();
      }
    }, [refresh])
  );

  if (typeof AppMetrics.getAllSessions !== 'function') {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background.screen }]}>
        <Text style={[styles.emptyText, { color: theme.text.default }]}>
          Sessions are not implemented on this platform yet
        </Text>
      </View>
    );
  }

  const sections = groupByDay(sessions);

  const title = sessions.length > 0 ? `Sessions (${sessions.length})` : 'Sessions';

  return (
    <>
      <Stack.Screen options={{ title }} />
      <SectionList
        style={[styles.container, { backgroundColor: theme.background.screen }]}
        contentContainerStyle={styles.contentContainer}
        sections={sections}
        keyExtractor={(session) => session.id}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.text.default }]}>No sessions</Text>
        }
        renderSectionHeader={({ section }) => (
          <Text
            style={[
              styles.sectionHeader,
              section !== sections[0] && styles.sectionHeaderSpaced,
              { color: theme.text.default },
            ]}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => <SessionRow session={item} isActive={isActive(item)} />}
      />
    </>
  );
}

function groupByDay(sessions: Session[]): { title: string; data: Session[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sectionsByKey = new Map<string, { title: string; data: Session[] }>();
  for (const session of sessions) {
    const date = new Date(session.startDate);
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    let title: string;
    if (day.getTime() === today.getTime()) {
      title = 'Today';
    } else if (day.getTime() === yesterday.getTime()) {
      title = 'Yesterday';
    } else {
      title = sectionDateFormatter.format(date);
    }

    const key = day.toISOString();
    const existing = sectionsByKey.get(key);
    if (existing) {
      existing.data.push(session);
    } else {
      sectionsByKey.set(key, { title, data: [session] });
    }
  }
  return Array.from(sectionsByKey.values());
}

function SessionRow({ session, isActive }: { session: Session; isActive: boolean }) {
  const theme = useTheme();
  const startDate = new Date(session.startDate);
  const endDate = session.endDate ? new Date(session.endDate) : null;
  const duration = endDate ? formatDuration(endDate.getTime() - startDate.getTime()) : null;
  const shortId = session.id.slice(0, 8);

  return (
    <Pressable
      onPress={() => router.push(`/sessions/${session.id}`)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.background.element,
          borderColor: theme.border.default,
        },
        isActive && {
          borderLeftWidth: 3,
          borderLeftColor: theme.icon.success,
        },
        pressed && styles.rowPressed,
      ]}>
      <View style={styles.rowHeader}>
        <Text style={[styles.rowTitle, { color: theme.text.default }]}>
          {formatDate(startDate)}
        </Text>
        <View style={styles.badges}>
          {session.type === 'main' && session.crashReport ? (
            <View style={[styles.badge, { backgroundColor: theme.background.danger }]}>
              <Text style={[styles.badgeText, { color: theme.text.danger }]}>Crashed</Text>
            </View>
          ) : null}
          <View style={[styles.badge, { backgroundColor: theme.background.info }]}>
            <Text style={[styles.badgeText, { color: theme.text.info }]}>
              {capitalize(session.type)}
            </Text>
          </View>
        </View>
      </View>
      <Text style={[styles.rowMeta, { color: theme.text.secondary }]}>
        {shortId}
        {duration ? ` · ${duration}` : isActive ? ' · active' : ''} · {session.metrics.length}{' '}
        metric{session.metrics.length === 1 ? '' : 's'}
      </Text>
    </Pressable>
  );
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const sectionDateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDate(date: Date) {
  return dateFormatter.format(date);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDuration(ms: number) {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  if (minutes < 60) {
    if (remSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) {
    if (remMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remMinutes}m`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (remHours === 0) {
    return `${days}d`;
  }
  return `${days}d ${remHours}h`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: Platform.select({ ios: 30, android: 150 }),
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionHeaderSpaced: {
    marginTop: 16,
  },
  row: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  rowMeta: {
    fontSize: 13,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});
