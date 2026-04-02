import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity, // used for the search clear button
  View,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useRef } from "react";

function ScalePill({ onPress, style, children }: { onPress: () => void; style: any; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, speed: 50, bounciness: 0 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start()}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

type Category = { id: string; label: string; icon: string };

type MapHeaderProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  categories: Category[];
  inputRef?: React.RefObject<TextInput>;
  openNow?: boolean;
  onOpenNowChange?: (value: boolean) => void;
};

export function MapHeader({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  inputRef,
  openNow = false,
  onOpenNowChange,
}: MapHeaderProps) {
  const textColor = useThemeColor({}, "text");
  const isDark = (useColorScheme() ?? "light") === "dark";

  const cardBg = isDark ? "#1c1c1e" : "#ffffff";
  const subColor = isDark ? "#8e8e93" : "#888888";
  const pillBorderColor = isDark ? "#3a3a3c" : "#e5e5ea";

  return (
    <View style={styles.headerContainer}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={[
          styles.searchBar,
          {
            backgroundColor: cardBg,
            shadowColor: isDark ? "#000" : "#b09070",
          },
        ]}>
          <MaterialIcons name="search" size={22} color={subColor} />

          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Where to work?"
            placeholderTextColor={subColor}
            value={searchQuery}
            onChangeText={onSearchChange}
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange("")} hitSlop={8}>
              <MaterialIcons name="close" size={18} color={subColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter pills + Open now toggle */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsScroll}
      >
        {/* Open now pill */}
        <ScalePill
          onPress={() => onOpenNowChange?.(!openNow)}
          style={[
            styles.pill,
            {
              backgroundColor: openNow ? '#22c55e' : cardBg,
              borderColor: openNow ? '#22c55e' : pillBorderColor,
              shadowColor: isDark ? "#000" : "#b09070",
            },
          ]}
        >
          <Text style={{ fontSize: 14 }}>🟢</Text>
          <ThemedText
            style={[
              styles.pillLabel,
              {
                color: openNow ? '#ffffff' : textColor,
                fontWeight: openNow ? "700" : "500",
              },
            ]}
          >
            Open now
          </ThemedText>
        </ScalePill>

        {categories.map(cat => {
          const isActive = selectedCategory === cat.id;
          const pillBgActive = isDark ? '#ffffff' : '#11181C';
          const pillBorderActive = isDark ? '#ffffff' : '#11181C';
          const labelColorActive = isDark ? '#000000' : '#ffffff';
          return (
            <ScalePill
              key={cat.id}
              onPress={() => onCategoryChange(isActive && cat.id !== "all" ? "all" : cat.id)}
              style={[
                styles.pill,
                {
                  backgroundColor: isActive ? pillBgActive : cardBg,
                  borderColor: isActive ? pillBorderActive : pillBorderColor,
                  shadowColor: isDark ? "#000" : "#b09070",
                },
              ]}
            >
              <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
              <ThemedText
                style={[
                  styles.pillLabel,
                  {
                    color: isActive ? labelColorActive : textColor,
                    fontWeight: isActive ? "700" : "500",
                  },
                ]}
              >
                {cat.label}
              </ThemedText>
            </ScalePill>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: Platform.OS === "android" ? 40 : 60,
    zIndex: 10,
    gap: 10,
    paddingBottom: 4,
  },
  searchRow: {
    paddingHorizontal: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "400",
    padding: 0,
  },
  pillsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  pillLabel: {
    fontSize: 13,
  },
});
