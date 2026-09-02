import { View, type ColorValue } from 'react-native';

export type TabIconName = 'home' | 'tests' | 'profile';

export type TabIconProps = {
  name: TabIconName;
  /** Resolved tint from the navigator (hi-vis when active, dim when not). */
  color: ColorValue;
  /** Selected tab: the mark fills in, Material-style. */
  focused?: boolean;
  testID?: string;
};

/** 22 px box; every mark is drawn inside it so the three icons share an optical weight. */
const BOX = 22;
const STROKE = 2;

/**
 * The three tab marks, drawn from Views.
 *
 * `@expo/vector-icons` is not part of Expo SDK 57's dependency tree any more and this phase
 * adds no dependencies, so the bar uses geometry instead of a font: flat, sharp-cornered
 * shapes that match the hazard/plate vocabulary rather than a rounded icon set.
 */
export function TabIcon({ name, color, focused = false, testID }: TabIconProps) {
  const fill = focused ? color : 'transparent';
  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: BOX, height: BOX, alignItems: 'center', justifyContent: 'center' }}
    >
      {name === 'home' && (
        <>
          {/* Roof: the classic zero-width/zero-height border triangle. */}
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: 9,
              borderRightWidth: 9,
              borderBottomWidth: 7,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
            }}
          />
          <View
            style={{
              width: 14,
              height: 11,
              borderWidth: STROKE,
              borderTopWidth: 0,
              borderColor: color,
              backgroundColor: fill,
            }}
          />
        </>
      )}

      {name === 'tests' &&
        [0, 1, 2].map((row) => (
          <View
            key={row}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: row === 0 ? 0 : 4,
            }}
          >
            <View
              style={{
                width: 4,
                height: 4,
                borderWidth: STROKE,
                borderColor: color,
                backgroundColor: fill,
              }}
            />
            <View style={{ width: 12, height: STROKE, marginLeft: 4, backgroundColor: color }} />
          </View>
        ))}

      {name === 'profile' && (
        <>
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              borderWidth: STROKE,
              borderColor: color,
              backgroundColor: fill,
            }}
          />
          <View
            style={{
              width: 16,
              height: 8,
              marginTop: 2,
              borderWidth: STROKE,
              borderBottomWidth: 0,
              borderColor: color,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              backgroundColor: fill,
            }}
          />
        </>
      )}
    </View>
  );
}
