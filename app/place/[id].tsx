import { PlaceDetailed } from "../components/PlaceDetailed";
import { getPlaceEnhancedById, PlaceEnhanced } from "@/services/places";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { ThemedView } from "@/components/themed-view";

export default function PlaceScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [place, setPlace] = useState<PlaceEnhanced | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPlace() {
            if (!id) return;
            try {
                const data = await getPlaceEnhancedById(Number(id));
                setPlace(data);
            } catch (e) {
                console.error("Failed to fetch place", e);
            } finally {
                setLoading(false);
            }
        }
        fetchPlace();
    }, [id]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!place) {
        return null; // Handle error or not found
    }

    return (
        <ThemedView style={{ flex: 1 }}>
            <Stack.Screen options={{ headerShown: false }} />
            <PlaceDetailed
                selectedPlace={place}
                onClose={() => router.back()}
            />
        </ThemedView>
    );
}
