import { ThemedText } from "@/components/themed-text";
import { BRAND_BLUE, isDark } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

export default function ReportNSFWScreen() {
    const router = useRouter();
    const screenBg = isDark ? "#000000" : "#F2F2F7";
    const groupBg = isDark ? "rgba(28, 28, 30, 0.6)" : "rgba(255, 255, 255, 0.7)";
    const textColor = useThemeColor({}, "text");
    const placeholderColor = isDark ? "#636366" : "#AEAEB2";
    const separatorColor = isDark ? "#38383A" : "#C6C6C8";

    const [username, setUsername] = useState("");
    const [reportType, setReportType] = useState<"place" | "image" | null>(null);
    const [placeName, setPlaceName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        if (!username || !reportType || !placeName) {
            Alert.alert("Missing Information", "Please fill in all fields to submit a report.");
            return;
        }

        setLoading(true);

        const subject = encodeURIComponent("NSFW Content Report");
        const body = encodeURIComponent(
            `Report Details:\n\n` +
            `Username: ${username}\n` +
            `Place Name: ${placeName}\n` +
            `Content Type: ${reportType === 'place' ? 'Place Info' : 'Image'}\n\n` +
            `Sent from OutWork App`
        );

        const mailtoUrl = `mailto:dev@out-work.online?subject=${subject}&body=${body}`;

        try {
            const supported = await Linking.canOpenURL(mailtoUrl);

            if (supported) {
                await Linking.openURL(mailtoUrl);

                // We assume success if they open the client, as we can't track actual sending
                setTimeout(() => {
                    setLoading(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert(
                        "Report Initiated",
                        "Please complete the sending process in your mail app.",
                        [
                            {
                                text: "Done",
                                onPress: () => router.back(),
                            },
                        ]
                    );
                }, 500);
            } else {
                setLoading(false);
                Alert.alert("Error", "No email client available");
            }
        } catch (err) {
            setLoading(false);
            Alert.alert("Error", "Could not open email client");
        }
    };

    const InputGroup = ({ children, title, delay = 0 }: { children: React.ReactNode; title?: string; delay?: number }) => (
        <Animated.View entering={FadeInDown.delay(delay).springify().damping(20)} style={styles.groupContainer}>
            {title && <ThemedText style={styles.groupTitle}>{title.toUpperCase()}</ThemedText>}
            <View style={styles.groupShadow}>
                <BlurView intensity={Platform.OS === "ios" ? 70 : 0} tint={isDark ? "dark" : "light"} style={styles.groupBlur}>
                    <View style={[styles.group, { backgroundColor: groupBg }]}>{children}</View>
                </BlurView>
            </View>
        </Animated.View>
    );

    return (
        <View style={[styles.container, { backgroundColor: screenBg }]}>
            <Stack.Screen
                options={{
                    headerTitle: "Report Content",
                    headerLargeTitle: true,
                    headerStyle: { backgroundColor: screenBg },
                    headerTintColor: BRAND_BLUE,
                    headerShadowVisible: false,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 0 }}>
                            <MaterialIcons name="close" size={24} color={BRAND_BLUE} />
                        </TouchableOpacity>
                    ),
                }}
            />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <Animated.View entering={FadeInUp.delay(100).springify()}>
                        <ThemedText style={styles.introText}>
                            Please provide details about the inappropriate content. We take these reports very seriously.
                        </ThemedText>
                    </Animated.View>

                    {/* Form Fields */}
                    <InputGroup title="Report Details" delay={200}>
                        <View style={[styles.inputRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: separatorColor }]}>
                            <ThemedText style={styles.label}>Username</ThemedText>
                            <TextInput
                                style={[styles.input, { color: textColor }]}
                                placeholder="Of the user who posted"
                                placeholderTextColor={placeholderColor}
                                value={username}
                                onChangeText={setUsername}
                            />
                        </View>
                        <View style={[styles.inputRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: separatorColor }]}>
                            <ThemedText style={styles.label}>Place Name</ThemedText>
                            <TextInput
                                style={[styles.input, { color: textColor }]}
                                placeholder="Where content was found"
                                placeholderTextColor={placeholderColor}
                                value={placeName}
                                onChangeText={setPlaceName}
                            />
                        </View>
                    </InputGroup>

                    <InputGroup title="Content Type" delay={300}>
                        <View style={styles.typeContainer}>
                            <TouchableOpacity
                                style={[styles.typeOption, reportType === 'place' && styles.typeOptionSelected]}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setReportType('place');
                                }}
                            >
                                <MaterialIcons name="place" size={24} color={reportType === 'place' ? '#fff' : BRAND_BLUE} />
                                <ThemedText style={[styles.typeText, reportType === 'place' && { color: '#fff' }]}>Place Info</ThemedText>
                            </TouchableOpacity>
                            <View style={[styles.verticalSeparator, { backgroundColor: separatorColor }]} />
                            <TouchableOpacity
                                style={[styles.typeOption, reportType === 'image' && styles.typeOptionSelected]}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setReportType('image');
                                }}
                            >
                                <MaterialIcons name="image" size={24} color={reportType === 'image' ? '#fff' : BRAND_BLUE} />
                                <ThemedText style={[styles.typeText, reportType === 'image' && { color: '#fff' }]}>Image</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </InputGroup>

                    {/* Submit Button */}
                    <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.submitButton, loading && { opacity: 0.7 }]}
                            onPress={handleSubmit}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <ThemedText style={styles.submitButtonText}>Submit Report</ThemedText>
                            )}
                        </TouchableOpacity>
                        <ThemedText style={styles.disclaimerText}>
                            Reports are sent directly to our moderation team at dev@out-work.online
                        </ThemedText>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingTop: 20,
        paddingBottom: 40,
        marginTop: 40,
    },
    introText: {
        fontSize: 15,
        opacity: 0.6,
        marginBottom: 24,
        marginHorizontal: 20,
        fontWeight: "500",
        lineHeight: 22,
    },
    groupContainer: {
        marginBottom: 24,
        marginHorizontal: 16,
    },
    groupShadow: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        borderRadius: 16,
    },
    groupBlur: {
        borderRadius: 16,
        overflow: "hidden",
    },
    group: {
        overflow: "hidden",
    },
    groupTitle: {
        fontSize: 13,
        opacity: 0.5,
        fontWeight: "700",
        marginLeft: 12,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 16,
        justifyContent: "space-between",
        minHeight: 56,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        width: 100,
    },
    input: {
        flex: 1,
        fontSize: 16,
        padding: 0,
        fontWeight: "500",
        textAlign: "right",
    },
    typeContainer: {
        flexDirection: 'row',
        height: 80,
    },
    typeOption: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    typeOptionSelected: {
        backgroundColor: BRAND_BLUE,
    },
    typeText: {
        fontSize: 14,
        fontWeight: '600',
        color: BRAND_BLUE
    },
    verticalSeparator: {
        width: StyleSheet.hairlineWidth,
        height: '100%'
    },
    buttonContainer: {
        marginTop: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 16
    },
    submitButton: {
        backgroundColor: "#FF3B30", // System Red for report action
        paddingVertical: 16,
        borderRadius: 20,
        width: "100%",
        alignItems: "center",
        shadowColor: "#FF3B30",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "700",
    },
    disclaimerText: {
        fontSize: 12,
        opacity: 0.4,
        textAlign: 'center',
        paddingHorizontal: 20
    }
});
