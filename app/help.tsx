import { ThemedText } from "@/components/themed-text";
import { BRAND_BLUE } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { isDark } from "@/constants/theme";
import {
    Alert,
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    UIManager,
    View
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const FAQ_ITEMS = [
    {
        id: 1,
        question: "How do I add a new work spot?",
        answer: "Go to the '{Post}' tab. You'll need to provide a name, description, photos, and location for the spot."
    },
    {
        id: 2,
        question: "Is this app free to use?",
        answer: "Yes! OutWork is completely free for finding and sharing the best remote work locations."
    },
    {
        id: 3,
        question: "How do I save a place?",
        answer: "Tap the heart icon on any place card or detail view. You can find all your saved places in the 'Favorites' section (coming soon)."
    },
    {
        id: 4,
        question: "Can I edit my profile?",
        answer: "Currently, you can update your avatar by tapping on it in the Settings tab. Name editing is temporarily disabled."
    },
    {
        id: 5,
        question: "How does the search work?",
        answer: "You can search by typing in the top bar. You can also move the map and tap 'Search this area' to find spots in a specific location."
    },
];

export default function HelpScreen() {
    const router = useRouter();
    const screenBg = isDark ? "#000000" : "#F2F2F7";
    const cardBg = isDark ? "#1C1C1E" : "#FFFFFF";
    const textColor = useThemeColor({}, "text");

    const [expandedId, setExpandedId] = useState<number | null>(null);

    const toggleExpand = (id: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <View style={[styles.container, { backgroundColor: screenBg }]}>
            <Stack.Screen
                options={{
                    headerTitle: "Help & FAQ",
                    headerLargeTitle: true,
                    headerStyle: { backgroundColor: screenBg },
                    headerTintColor: BRAND_BLUE,
                    headerShadowVisible: false,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 0 }}>
                            <MaterialIcons name="close" size={24} color={BRAND_BLUE} />
                        </TouchableOpacity>
                    )
                }}
            />

            <ScrollView contentContainerStyle={styles.content}>
                <Animated.View entering={FadeInUp.delay(100).springify()}>
                    <ThemedText style={styles.introText}>
                        Frequently Asked Questions
                    </ThemedText>
                </Animated.View>

                <View style={styles.list}>
                    {FAQ_ITEMS.map((item, index) => (
                        <Animated.View
                            key={item.id}
                            entering={FadeInDown.delay(index * 100).springify()}
                        >
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => toggleExpand(item.id)}
                                style={[styles.card, { backgroundColor: cardBg }]}
                            >
                                <View style={styles.cardHeader}>
                                    <ThemedText style={styles.question}>{item.question}</ThemedText>
                                    <MaterialIcons
                                        name={expandedId === item.id ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                                        size={24}
                                        color={BRAND_BLUE}
                                    />
                                </View>
                                {expandedId === item.id && (
                                    <View style={styles.answerContainer}>
                                        <ThemedText style={styles.answer}>{item.answer}</ThemedText>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>

                <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.contactContainer}>
                    <ThemedText style={styles.contactTitle}>Still need help?</ThemedText>
                    <TouchableOpacity style={styles.contactButton} activeOpacity={0.8}>
                        <ThemedText
                            style={styles.contactButtonText}
                            onPress={() => {
                                Alert.alert("Contact Support", "You can contact support at dev@out-work.online");
                            }}
                        >Contact Support</ThemedText>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
        marginTop: 40,
    },
    introText: {
        fontSize: 16,
        opacity: 0.6,
        marginBottom: 20,
        fontWeight: '500',
    },
    list: {
        gap: 12,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    question: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        paddingRight: 10,
    },
    answerContainer: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(150,150,150,0.1)',
        paddingTop: 12,
    },
    answer: {
        fontSize: 15,
        opacity: 0.7,
        lineHeight: 22,
    },
    contactContainer: {
        marginTop: 40,
        alignItems: 'center',
        gap: 12,
    },
    contactTitle: {
        fontSize: 16,
        fontWeight: '600',
        opacity: 0.8,
    },
    contactButton: {
        backgroundColor: BRAND_BLUE,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30,
        shadowColor: BRAND_BLUE,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    contactButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    }
});
