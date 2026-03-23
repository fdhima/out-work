import { ThemedText } from "@/components/themed-text";
import { BRAND_BLUE, isDark } from "@/constants/theme";
import { PlaceEnhanced } from "@/services/places";
import React, { memo, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Marker } from "react-native-maps";

interface MapMarkerProps {
    place: PlaceEnhanced;
    isSelected: boolean;
    isFavorite: boolean;
    onPress: (place: PlaceEnhanced) => void;
}

const MapMarker = memo(({ place, isSelected, isFavorite, onPress }: MapMarkerProps) => {
    // tracksViewChanges should be true initially to render the custom view,
    // then false for performance. We flip it when isSelected changes.
    const [tracksViewChanges, setTracksViewChanges] = useState(true);
    const prevIsSelectedRef = useRef(isSelected);
    const prevIsFavoriteRef = useRef(isFavorite);

    // Detect prop changes synchronously so tracksViewChanges is true on the
    // same render that changes the marker's appearance, not a render later.
    const propsChanged =
        prevIsSelectedRef.current !== isSelected ||
        prevIsFavoriteRef.current !== isFavorite;
    prevIsSelectedRef.current = isSelected;
    prevIsFavoriteRef.current = isFavorite;

    useEffect(() => {
        setTracksViewChanges(true);
        const timer = setTimeout(() => {
            setTracksViewChanges(false);
        }, 300); // Give it enough time to render any changes
        return () => clearTimeout(timer);
    }, [isSelected, isFavorite]);

    const bg = isSelected ? BRAND_BLUE : "#fff";
    const text = isSelected ? "#fff" : "#000";
    const zIndex = isSelected ? 100 : 1;

    const borderColor = isSelected
        ? BRAND_BLUE
        : (isFavorite ? '#ff4081' : (isDark ? "#333" : "#ddd")); // Red/Pink for favorite

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
            tracksViewChanges={propsChanged || tracksViewChanges}
            zIndex={zIndex}
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
}, (prevProps, nextProps) => {
    return (
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.place.id === nextProps.place.id &&
        prevProps.place.latitude === nextProps.place.latitude &&
        prevProps.place.longitude === nextProps.place.longitude &&
        prevProps.place.rating_avg === nextProps.place.rating_avg
    );
});

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
        // Add a bit of transition smoothing if possible via layout
        minWidth: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default MapMarker;
