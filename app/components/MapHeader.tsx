import { useThemeColor } from "@/hooks/use-theme-color";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from "react-native";

type MapHeaderProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  /** Whether any non-default filter is active (shows badge on filter button). */
  hasActiveFilter?: boolean;
  onFilterPress: () => void;
};

export function MapHeader({
  searchQuery,
  onSearchChange,
  hasActiveFilter = false,
  onFilterPress,
}: MapHeaderProps) {
  const textColor = useThemeColor({}, "text");
  const isDark = (useColorScheme() ?? "light") === "dark";

  return (
    <View style={styles.headerContainer}>
      <View style={styles.searchRow}>
        {/* Search bar pill */}
        <View style={[
          styles.searchPillContainer,
          {
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
          },
        ]}>
          <BlurView
            intensity={60}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.searchPillBlur,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)",
              },
            ]}
          >
            <MaterialIcons name="search" size={20} color={isDark ? "#fff" : "#000"} />

            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Where to work?"
              placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
              value={searchQuery}
              onChangeText={onSearchChange}
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => onSearchChange("")} hitSlop={8}>
                <MaterialIcons name="close" size={18} color={isDark ? "#fff" : "#000"} />
              </TouchableOpacity>
            )}
          </BlurView>
        </View>

        {/* Filter button */}
        <TouchableOpacity
          onPress={onFilterPress}
          activeOpacity={0.8}
          style={[
            styles.filterBtnWrapper,
            {
              borderColor: hasActiveFilter
                ? (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)')
                : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
            },
          ]}
        >
          <BlurView
            intensity={60}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.filterBtnBlur,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
              },
            ]}
          >
            <MaterialIcons name="tune" size={20} color={isDark ? '#fff' : '#000'} />
            {hasActiveFilter && <View style={styles.filterBadge} />}
          </BlurView>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: 0,
    zIndex: 10,
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    gap: 12,
  },
  searchPillContainer: {
    flex: 1,
    borderRadius: 50,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  searchPillBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
  },
  filterBtnWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filterBtnBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});
