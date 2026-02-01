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

export default function FeedbackScreen() {
    const router = useRouter();
    const screenBg = isDark ? "#000000" : "#F2F2F7";
    const groupBg = isDark ? "rgba(28, 28, 30, 0.6)" : "rgba(255, 255, 255, 0.7)";
    const textColor = useThemeColor({}, "text");
    const placeholderColor = isDark ? "#636366" : "#AEAEB2";
    const separatorColor = isDark ? "#38383A" : "#C6C6C8";

    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        if (!subject || !message) {
            Alert.alert("Missing Information", "Please fill in all fields to send feedback.");
            return;
        }

        setLoading(true);

        const emailSubject = encodeURIComponent(`Feedback: ${subject}`);
        const body = encodeURIComponent(
            `Feedback Details:\n\n` +
            `${message}\n\n` +
            `Sent from OutWork App`
        );

        const mailtoUrl = `mailto:dev@out-work.online?subject=${emailSubject}&body=${body}`;

        try {
            const supported = await Linking.canOpenURL(mailtoUrl);

            if (supported) {
                await Linking.openURL(mailtoUrl);

                // We assume success if they open the client
                setTimeout(() => {
                    setLoading(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert(
                        "Feedback Initiated",
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
                    headerTitle: "Send Feedback",
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
                            We value your feedback! Let us know what you think or report any issues you encounter.
                        </ThemedText>
                    </Animated.View>

                    {/* Form Fields */}
                    <InputGroup title="Feedback Details" delay={200}>
                        <View style={[styles.inputRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: separatorColor }]}>
                            <ThemedText style={styles.label}>Subject</ThemedText>
                            <TextInput
                                style={[styles.input, { color: textColor }]}
                                placeholder="Short summary"
                                placeholderTextColor={placeholderColor}
                                value={subject}
                                onChangeText={setSubject}
                            />
                        </View>
                        <View style={[styles.inputRow, { alignItems: 'flex-start', height: 150 }]}>
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        color: textColor,
                                        textAlign: 'left',
                                        height: '100%',
                                        textAlignVertical: 'top',
                                        paddingTop: 16
                                    }
                                ]}
                                placeholder="Type your message here..."
                                placeholderTextColor={placeholderColor}
                                value={message}
                                onChangeText={setMessage}
                                multiline
                            />
                        </View>
                    </InputGroup>

                    {/* Submit Button */}
                    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.submitButton, loading && { opacity: 0.7 }]}
                            onPress={handleSubmit}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <ThemedText style={styles.submitButtonText}>Send Feedback</ThemedText>
                            )}
                        </TouchableOpacity>
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
        paddingHorizontal: 16,
        justifyContent: "space-between",
        minHeight: 56,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        width: 80,
    },
    input: {
        flex: 1,
        fontSize: 16,
        padding: 0,
        fontWeight: "500",
        textAlign: "right",
    },
    buttonContainer: {
        marginTop: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 16
    },
    submitButton: {
        backgroundColor: BRAND_BLUE,
        paddingVertical: 16,
        borderRadius: 20,
        width: "100%",
        alignItems: "center",
        shadowColor: BRAND_BLUE,
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
});
