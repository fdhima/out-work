import { ThemedText } from "@/components/themed-text";
import { BRAND_BLUE, isDark } from "@/constants/theme";
import { PlaceEnhanced } from "@/services/places";
import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Marker } from "react-native-maps";

interface MapMarkerProps {
    place: PlaceEnhanced;
    isSelected: boolean;
    isFavorite: boolean;
    onPress: (place: PlaceEnhanced) => void;
}

const MapMarker = memo(({ place, isSelected, isFavorite, onPress }: MapMarkerProps) => {
    const bg = isSelected ? BRAND_BLUE : "#fff";
    const text = isSelected ? "#fff" : "#000";
    const borderColor = isSelected
        ? BRAND_BLUE
        : (isFavorite ? '#ff4081' : (isDark ? "#333" : "#ddd"));

    return (
        <Marker
            coordinate={{
                latitude: place.latitude,
                longitude: place.longitude,
            }}
            onPress={(e) => {
                e.stopPropagation();
                onPress(place);
            }}
            tracksViewChanges
        >
            <View
                style={[
                    styles.mapPill,
                    {
                        backgroundColor: bg,
                        borderColor: borderColor,
                        borderWidth: isFavorite ? 2 : 1.5,
                        transform: [{ scale: isSelected ? 1.15 : 1 }],
                    },
                ]}
            >
                <ThemedText style={{ fontSize: 13, fontWeight: "700", color: text }}>
                    {place.rating_avg.toFixed(1)}
                </ThemedText>
            </View>
        </Marker>
    );
}, (prevProps, nextProps) =>
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.place.id === nextProps.place.id &&
    prevProps.place.latitude === nextProps.place.latitude &&
    prevProps.place.longitude === nextProps.place.longitude &&
    prevProps.place.rating_avg === nextProps.place.rating_avg
);

const styles = StyleSheet.create({
    mapPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1.5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
        minWidth: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default MapMarker;
