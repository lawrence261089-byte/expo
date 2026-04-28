import AppMetrics from 'expo-app-metrics';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { JSONView } from '@/components/JSONView';
import { useTheme } from '@/utils/theme';

export function PastDiagnosticPayloadsSection() {
  const theme = useTheme();
  const initialPayloads = useMemo(() => readPayloads(), []);
  const [payloads, setPayloads] = useState<unknown[] | null>(initialPayloads);

  if (typeof AppMetrics.getPastDiagnosticPayloads !== 'function') {
    return null;
  }

  return (
    <>
      <Text style={[styles.sectionTitle, { color: theme.text.default }]}>
        Past MetricKit diagnostics
      </Text>
      <Text style={[styles.sectionHint, { color: theme.text.secondary }]}>
        Raw diagnostic payloads MetricKit retained from previous launches. Empty on the simulator
        and on a fresh install.
      </Text>
      <Button title="Reload" onPress={() => setPayloads(readPayloads())} theme="secondary" />
      {payloads && payloads.length > 0 ? (
        payloads.map((payload, index) => (
          <View key={index} style={styles.payload}>
            <JSONView value={payload} />
          </View>
        ))
      ) : (
        <Text style={[styles.empty, { color: theme.text.secondary }]}>No payloads available.</Text>
      )}
    </>
  );
}

function readPayloads(): unknown[] {
  return AppMetrics.getPastDiagnosticPayloads?.() ?? [];
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    marginBottom: 16,
  },
  empty: {
    fontSize: 13,
    marginTop: 8,
  },
  payload: {
    marginTop: 12,
  },
});
