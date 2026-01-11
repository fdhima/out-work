import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { MaterialIcons } from "@expo/vector-icons";
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
    <View style={[styles.headerContainer, { shadowColor: isDark ? "#000" : "#666" }]}>
      {/* Search Bar */}
      <View
        style={[
          styles.searchPill,
          {
            backgroundColor: isDark ? "#2c2c2e" : "#fff",
            borderColor: isDark ? "#444" : "#ddd",
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
        ) : (
          <View style={[styles.filterIconCircle, { borderColor: isDark ? "#555" : "#ddd" }]}>
            <MaterialIcons name="tune" size={14} color={isDark ? "#fff" : "#000"} />
          </View>
        )}
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;

          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onCategorySelect(cat.id)}
              style={[styles.categoryItem, isActive && styles.categoryItemActive]}
            >
              <MaterialIcons
                name={cat.icon as any}
                size={24}
                color={isActive ? textColor : isDark ? "#ccc" : "#666"}
              />
              <ThemedText style={[styles.categoryLabel, isActive && { fontWeight: "700" }]}>
                {cat.label}
              </ThemedText>
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
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
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
    gap: 10,  // Tighter gap
  },
  categoryItem: {
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    opacity: 0.9,
    marginRight: 24
  },
  categoryItemActive: {
    borderBottomColor: 'transparent',
    opacity: 1,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8
  },
})