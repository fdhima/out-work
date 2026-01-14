import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from "react-native";

type Category = {
  id: string;
  label: string;
  icon: string;
};

type MapHeaderProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string | null;
  onCategorySelect: (id: string) => void;
  categories: Category[];
};

export function MapHeader({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategorySelect,
  categories,
}: MapHeaderProps) {
  const textColor = useThemeColor({}, "text");
  const isDark = (useColorScheme() ?? "light") === "dark";

  return (
    <View style={styles.headerContainer}>
      {/* Search Bar */}
      <View style={[styles.searchPillContainer,
      {
        shadowColor: isDark ? "#000" : "#000",
        borderWidth: 1,
        borderColor: isDark
          ? "rgba(255,255,255,0.1)"
          : "rgba(0,0,0,0.05)",
      },
      ]}>
        <BlurView
          intensity={60}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.searchPillBlur,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)",
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
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

          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => onSearchChange("")} hitSlop={8}>
              <MaterialIcons name="close" size={18} color={isDark ? "#fff" : "#000"} />
            </TouchableOpacity>
          ) : null}
        </BlurView>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;

          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onCategorySelect(cat.id)}
              activeOpacity={0.8}
            >
              <BlurView
                intensity={isActive ? 80 : 40}
                tint={isDark ? "dark" : "light"}
                style={[
                  styles.categoryPill,
                  {
                    borderColor: isActive
                      ? (isDark ? "#fff" : "#000")
                      : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"),
                    backgroundColor: isActive
                      ? (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.05)")
                      : "transparent",
                  }
                ]}
              >
                <MaterialIcons
                  name={cat.icon as any}
                  size={20}
                  color={isActive ? textColor : isDark ? "#ccc" : "#666"}
                />
                <ThemedText style={[styles.categoryLabel, isActive && { fontWeight: "700" }]}>
                  {cat.label}
                </ThemedText>
              </BlurView>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: Platform.OS === 'android' ? 40 : 60, // Notch height
    paddingBottom: 0,
    zIndex: 10,
    borderBottomWidth: 0,
    elevation: 0,
    marginBottom: 10
  },
  searchPillContainer: {
    marginHorizontal: 20,
    borderRadius: 50,
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
  iconButton: {
    padding: 4,
  },
  filterIconCircle: {
    padding: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 12,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    gap: 8,
    overflow: 'hidden',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});