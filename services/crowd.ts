
import { supabase } from "@/lib/supabase";

export interface CrowdReportInput {
    place_id: number;
    day_of_week: number;
    time_bucket: number;
    crowd_level: number; // 1 = Quiet, 2 = Medium, 3 = Busy
}

export async function addCrowdReport(input: CrowdReportInput) {
    const { error } = await supabase
        .from('place_crowd_reports')
        .insert([{
            place_id: input.place_id,
            day_of_week: input.day_of_week,
            time_bucket: input.time_bucket,
            crowd_level: input.crowd_level,
            source: 'user'
        }]);

    if (error) {
        console.error('Error submitting crowd report:', error);
        throw error;
    }
}

export interface CrowdStats {
    crowdLevel: number; // 1 | 2 | 3
    confidence: 'low' | 'high';
    reportCount: number;
}

export async function getCrowdStats(placeId: number): Promise<CrowdStats | null> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const timeBucket = now.getHours();

    const { data, error } = await supabase
        .from('place_crowd_reports')
        .select('crowd_level')
        .eq('place_id', placeId)
        .eq('day_of_week', dayOfWeek)
        .eq('time_bucket', timeBucket);

    if (error) {
        console.error('Error fetching crowd stats:', error);
        return null;
    }

    if (!data || data.length === 0) {
        return null;
    }

    const reportCount = data.length;

    // Calculate mode (most frequent crowd level)
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    data.forEach(r => {
        if (r.crowd_level >= 1 && r.crowd_level <= 3) {
            counts[r.crowd_level]++;
        }
    });

    let maxCount = 0;
    let crowdLevel = 1;

    Object.entries(counts).forEach(([level, count]) => {
        if (count > maxCount) {
            maxCount = count;
            crowdLevel = parseInt(level);
        }
    });

    return {
        crowdLevel,
        confidence: reportCount >= 10 ? 'high' : 'low',
        reportCount
    };
}
