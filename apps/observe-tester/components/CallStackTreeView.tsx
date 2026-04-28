import type { CallStackFrame, CallStackTree } from 'expo-app-metrics';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/utils/theme';

export function CallStackTreeView({ tree }: { tree: CallStackTree }) {
  const theme = useTheme();
  const stacks = tree.callStacks ?? [];

  if (stacks.length === 0) {
    return (
      <Text style={[styles.empty, { color: theme.text.secondary }]}>No call stacks captured</Text>
    );
  }

  return (
    <View>
      {stacks.map((stack, index) => (
        <View
          key={index}
          style={[
            styles.thread,
            {
              backgroundColor: theme.background.element,
              borderColor: theme.border.default,
            },
          ]}>
          <Text style={[styles.threadTitle, { color: theme.text.default }]}>
            Thread {index + 1}
            {stack.threadAttributed ? (
              <Text style={[styles.attributed, { color: theme.text.danger }]}> · attributed</Text>
            ) : null}
          </Text>
          {(stack.callStackRootFrames ?? []).map((frame, frameIndex) => (
            <FrameRow key={frameIndex} frame={frame} depth={0} />
          ))}
        </View>
      ))}
    </View>
  );
}

function FrameRow({ frame, depth }: { frame: CallStackFrame; depth: number }) {
  const theme = useTheme();
  return (
    <View>
      <Text
        style={[styles.frame, { color: theme.text.default, paddingLeft: 8 + depth * 12 }]}
        numberOfLines={1}>
        <Text style={{ color: theme.text.tertiary }}>{formatAddress(frame.address)} </Text>
        <Text style={{ color: theme.text.default }}>{frame.binaryName ?? '(unknown)'}</Text>
        <Text style={{ color: theme.text.secondary }}>
          {formatOffset(frame.offsetIntoBinaryTextSegment)}
        </Text>
      </Text>
      {(frame.subFrames ?? []).map((subFrame, index) => (
        <FrameRow key={index} frame={subFrame} depth={depth + 1} />
      ))}
    </View>
  );
}

function formatAddress(address: number | null | undefined) {
  if (address == null) return '0x0000000000000000';
  return '0x' + address.toString(16).padStart(16, '0');
}

function formatOffset(offset: number | null | undefined) {
  if (offset == null) return '';
  return ' +0x' + offset.toString(16);
}

const styles = StyleSheet.create({
  thread: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  threadTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  attributed: {
    fontSize: 12,
    fontWeight: '600',
  },
  frame: {
    fontFamily: 'Menlo',
    fontSize: 11,
    paddingVertical: 2,
  },
  empty: {
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 12,
  },
});
