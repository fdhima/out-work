import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FavoritesContextType {
    favorites: number[]; // Set of place IDs
    toggleFavorite: (id: number) => Promise<void>;
    isFavorite: (id: number) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    const [favorites, setFavorites] = useState<number[]>([]);

    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        try {
            const stored = await AsyncStorage.getItem('favorites');
            if (stored) {
                setFavorites(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to load favorites", e);
        }
    };

    const toggleFavorite = async (id: number) => {
        try {
            let newFavorites;
            if (favorites.includes(id)) {
                newFavorites = favorites.filter(favId => favId !== id);
            } else {
                newFavorites = [...favorites, id];
            }
            setFavorites(newFavorites);
            await AsyncStorage.setItem('favorites', JSON.stringify(newFavorites));
        } catch (e) {
            console.error("Failed to toggle favorite", e);
        }
    };

    const isFavorite = (id: number) => favorites.includes(id);

    return (
        <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    const context = useContext(FavoritesContext);
    if (context === undefined) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
}
