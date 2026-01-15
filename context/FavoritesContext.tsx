import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { addFavoriteApi, getMyFavorites, removeFavoriteApi } from '@/services/favorites';

interface FavoritesContextType {
    favorites: number[]; // Set of place IDs
    toggleFavorite: (id: number) => Promise<void>;
    isFavorite: (id: number) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    const [favorites, setFavorites] = useState<number[]>([]);
    const { session } = useAuth();

    useEffect(() => {
        if (session?.user) {
            syncFavorites();
        } else {
            loadLocalFavorites();
        }
    }, [session]);

    const loadLocalFavorites = async () => {
        try {
            const stored = await AsyncStorage.getItem('favorites');
            if (stored) {
                setFavorites(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to load local favorites", e);
        }
    };

    const syncFavorites = async () => {
        try {
            // 1. Get local favorites
            const localStored = await AsyncStorage.getItem('favorites');
            const localFavorites: number[] = localStored ? JSON.parse(localStored) : [];

            // 2. Get remote favorites
            const remoteFavoritesPromise = getMyFavorites();

            const remoteFavorites = await remoteFavoritesPromise;

            // 3. Find favorites that are local but not remote (need syncing)
            // Only sync if we haven't synced before (optimisation could be better but this is safe)
            const toSync = localFavorites.filter(id => !remoteFavorites.includes(id));

            // 4. Sync them
            if (toSync.length > 0) {
                await Promise.all(toSync.map(id => addFavoriteApi(id).catch(e => console.warn(`Failed to sync favorite ${id}`, e))));
            }

            // 5. Final merged list (re-fetch or just merge?)
            // Merging is safer if API adds succeeded
            const finalFavorites = [...new Set([...remoteFavorites, ...toSync])];
            setFavorites(finalFavorites);

            // 6. Clear local storage to rely on backend
            if (localFavorites.length > 0) {
                await AsyncStorage.removeItem('favorites');
            }

        } catch (e) {
            console.error("Failed to sync favorites", e);
        }
    };

    const toggleFavorite = async (id: number) => {
        try {
            const isLiked = favorites.includes(id);
            let newFavorites;

            if (isLiked) {
                newFavorites = favorites.filter(favId => favId !== id);
            } else {
                newFavorites = [...favorites, id];
            }

            // Optimistic Update
            setFavorites(newFavorites);

            if (session?.user) {
                // Backend Update
                if (isLiked) {
                    await removeFavoriteApi(id);
                } else {
                    await addFavoriteApi(id);
                }
            } else {
                // Local Update
                await AsyncStorage.setItem('favorites', JSON.stringify(newFavorites));
            }
        } catch (e) {
            console.error("Failed to toggle favorite", e);
            // Revert could be here
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
