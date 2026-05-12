import { SymbolView, AndroidSymbol } from 'expo-symbols';
import { Text, View, StyleSheet, ScrollView } from 'react-native';

const LUNCH_SYMBOLS: { name: AndroidSymbol; label: string }[] = [
  { name: 'lunch_dining', label: 'lunch_dining' },
  { name: 'meal_lunch', label: 'meal_lunch' },
];

export default function LunchScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>🍽️ Lunch Icons</Text>
      <Text style={styles.subtitle}>Android Material Symbols</Text>

      <View style={styles.grid}>
        {LUNCH_SYMBOLS.map(({ name, label }) => (
          <View key={name} style={styles.card}>
            <SymbolView
              name={{ android: name, web: name }}
              style={styles.symbol}
              resizeMode="scaleAspectFit"
              tintColor="#FF6B35"
            />
            <Text style={styles.label}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Sized variants</Text>
      <View style={styles.row}>
        {[24, 32, 48, 64, 80].map((size) => (
          <SymbolView
            key={size}
            name={{ android: 'lunch_dining', web: 'lunch_dining' }}
            style={{ width: size, height: size }}
            resizeMode="scaleAspectFit"
            tintColor="#FF6B35"
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Tinted variants</Text>
      <View style={styles.row}>
        {['#FF6B35', '#E74C3C', '#2ECC71', '#3498DB', '#F1C40F', '#9B59B6'].map((color) => (
          <SymbolView
            key={color}
            name={{ android: 'meal_lunch', web: 'meal_lunch' }}
            style={styles.symbol}
            resizeMode="scaleAspectFit"
            tintColor={color}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  container: {
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  heading: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 20,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    gap: 24,
    marginVertical: 16,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  symbol: {
    width: 48,
    height: 48,
    margin: 8,
  },
  label: {
    color: '#e0e0e0',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
