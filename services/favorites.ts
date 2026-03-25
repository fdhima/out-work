import { supabase } from "@/lib/supabase";

export async function getMyFavorites(): Promise<number[]> {
    const { data, error } = await supabase
        .from('favorites')
        .select('place_id');

    if (error) {
        console.error('Error fetching favorites:', error);
        throw error;
    }

    return data.map((item: any) => item.place_id);
}

export async function addFavoriteApi(placeId: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
        .from('favorites')
        .insert({
            place_id: placeId,
            profile_id: user.id
        });

    if (error) throw error;
}

export async function removeFavoriteApi(placeId: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('place_id', placeId)
        .eq('profile_id', user.id);

    if (error) throw error;
}
