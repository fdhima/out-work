
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';

type CrowdLevelModalProps = {
    visible: boolean;
    onClose: () => void;
    onSubmit: (level: number) => void;
};

const OPTIONS = [
    {
        level: 1,
        emoji: '🤫',
        label: 'Quiet',
        desc: 'Very few people',
        color: '#22c55e',
        bgLight: '#f0fdf4',
        bgDark: 'rgba(34,197,94,0.12)',
        borderLight: '#bbf7d0',
        borderDark: 'rgba(34,197,94,0.25)',
    },
    {
        level: 2,
        emoji: '😊',
        label: 'Moderate',
        desc: 'Some people around',
        color: '#f59e0b',
        bgLight: '#fffbeb',
        bgDark: 'rgba(245,158,11,0.12)',
        borderLight: '#fde68a',
        borderDark: 'rgba(245,158,11,0.25)',
    },
    {
        level: 3,
        emoji: '🔥',
        label: 'Busy',
        desc: 'Quite crowded',
        color: '#ef4444',
        bgLight: '#fef2f2',
        bgDark: 'rgba(239,68,68,0.12)',
        borderLight: '#fecaca',
        borderDark: 'rgba(239,68,68,0.25)',
    },
] as const;

export function CrowdLevelModal({ visible, onClose, onSubmit }: CrowdLevelModalProps) {
    const isDark = (useColorScheme() ?? 'light') === 'dark';
    const slideY = useRef(new Animated.Value(400)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const pulseScale = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
        if (visible) {
            // Slide sheet up + fade backdrop in
            slideY.setValue(400);
            backdropOpacity.setValue(0);
            Animated.parallel([
                Animated.spring(slideY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 55,
                    friction: 10,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();

            // Gentle icon pulse
            pulseAnim.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseScale, {
                        toValue: 1.12,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseScale, {
                        toValue: 1,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulseAnim.current.start();
        } else {
            pulseAnim.current?.stop();
        }
        return () => pulseAnim.current?.stop();
    }, [visible, slideY, backdropOpacity, pulseScale]);

    const bg = isDark ? '#1c1c1e' : '#ffffff';
    const titleColor = isDark ? '#ffffff' : '#111111';
    const subtitleColor = isDark ? '#8e8e93' : '#6c6c70';
    const labelColor = isDark ? '#ffffff' : '#111111';
    const descColor = isDark ? '#8e8e93' : '#666666';

    return (
        <Modal
            animationType="none"
            transparent
            visible={visible}
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                {/* Backdrop */}
                <Animated.View
                    style={[styles.backdrop, { opacity: backdropOpacity }]}
                    pointerEvents="box-none"
                >
                    {Platform.OS === 'ios' ? (
                        <BlurView
                            intensity={20}
                            style={StyleSheet.absoluteFill}
                            tint={isDark ? 'dark' : 'light'}
                        />
                    ) : (
                        <View
                            style={[
                                StyleSheet.absoluteFill,
                                { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' },
                            ]}
                        />
                    )}
                </Animated.View>

                {/* Tap outside to close */}
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />

                {/* Sheet */}
                <Animated.View
                    style={[
                        styles.sheet,
                        { backgroundColor: bg, transform: [{ translateY: slideY }] },
                    ]}
                >
                    {/* Drag handle */}
                    <View style={styles.handle} />

                    {/* Close button */}
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
                        <MaterialIcons
                            name="close"
                            size={20}
                            color={isDark ? '#8e8e93' : '#aaaaaa'}
                        />
                    </TouchableOpacity>

                    {/* Header */}
                    <Animated.Text
                        style={[styles.topEmoji, { transform: [{ scale: pulseScale }] }]}
                    >
                        👀
                    </Animated.Text>
                    <Text style={[styles.title, { color: titleColor }]}>
                        How is it right now?
                    </Text>
                    <Text style={[styles.subtitle, { color: subtitleColor }]}>
                        Help others find the perfect spot
                    </Text>

                    {/* Options */}
                    <View style={styles.optionsRow}>
                        {OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.level}
                                style={[
                                    styles.optionCard,
                                    {
                                        backgroundColor: isDark ? opt.bgDark : opt.bgLight,
                                        borderColor: isDark ? opt.borderDark : opt.borderLight,
                                    },
                                ]}
                                onPress={() => onSubmit(opt.level)}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                                <Text style={[styles.optionLabel, { color: labelColor }]}>
                                    {opt.label}
                                </Text>
                                <Text style={[styles.optionDesc, { color: descColor }]}>
                                    {opt.desc}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.hint, { color: subtitleColor }]}>
                        Reports are anonymous and expire after a few hours
                    </Text>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        paddingTop: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 16,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(128,128,128,0.3)',
        marginBottom: 16,
    },
    closeBtn: {
        position: 'absolute',
        right: 20,
        top: 20,
        padding: 4,
        zIndex: 1,
    },
    topEmoji: {
        fontSize: 44,
        marginBottom: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
        textAlign: 'center',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    optionsRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
        marginBottom: 16,
    },
    optionCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 6,
        borderRadius: 16,
        borderWidth: 1.5,
        gap: 4,
    },
    optionEmoji: {
        fontSize: 28,
        marginBottom: 2,
    },
    optionLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
    optionDesc: {
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 14,
    },
    hint: {
        fontSize: 11,
        textAlign: 'center',
        opacity: 0.8,
    },
});
