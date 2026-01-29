
import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { isDark } from '@/constants/theme';

type CrowdLevelModalProps = {
    visible: boolean;
    onClose: () => void;
    onSubmit: (level: number) => void;
};

export function CrowdLevelModal({ visible, onClose, onSubmit }: CrowdLevelModalProps) {
    const containerBg = isDark ? '#1a1a1a' : '#fff';
    const textColor = isDark ? '#fff' : '#000';

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                {Platform.OS === 'ios' ? (
                    <BlurView intensity={25} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.5)' }]} />
                )}

                <View style={[styles.modalView, { backgroundColor: containerBg }]}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <MaterialIcons name="close" size={24} color={textColor} />
                    </TouchableOpacity>

                    <ThemedText type="title" style={styles.modalTitle}>How is it right now?</ThemedText>
                    <ThemedText style={styles.modalSubtitle}>Help the community track crowd levels</ThemedText>

                    <View style={styles.optionsContainer}>
                        <TouchableOpacity style={styles.optionButton} onPress={() => onSubmit(1)}>
                            <View style={[styles.circle, { backgroundColor: '#4CAF50' }]} />
                            <ThemedText style={{ color: textColor, fontWeight: '600' }}>Quiet</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.optionButton} onPress={() => onSubmit(2)}>
                            <View style={[styles.circle, { backgroundColor: '#FFC107' }]} />
                            <ThemedText style={{ color: textColor, fontWeight: '600' }}>Medium</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.optionButton} onPress={() => onSubmit(3)}>
                            <View style={[styles.circle, { backgroundColor: '#F44336' }]} />
                            <ThemedText style={{ color: textColor, fontWeight: '600' }}>Busy</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalView: {
        width: '85%',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    closeButton: {
        position: 'absolute',
        right: 16,
        top: 16,
        zIndex: 1,
        padding: 4,
    },
    modalTitle: {
        fontSize: 20,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        opacity: 0.6,
        marginBottom: 24,
        textAlign: 'center',
    },
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
    },
    optionButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        // backgroundColor: 'rgba(0,0,0,0.03)', // optional subtle bg
    },
    circle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginBottom: 8,
    },
});
