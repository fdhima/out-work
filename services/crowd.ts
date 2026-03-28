
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

export interface HourPattern {
    hour: number;
    avgLevel: number; // 1.0 – 3.0
    count: number;
}

/**
 * Returns the current crowd level using a ±2-hour window so reports
 * don't vanish after the exact hour they were submitted.
 */
export async function getCrowdStats(placeId: number): Promise<CrowdStats | null> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const timeBucket = now.getHours();

    // ±2-hour window around the current hour
    const buckets = [timeBucket - 2, timeBucket - 1, timeBucket, timeBucket + 1, timeBucket + 2]
        .filter(b => b >= 0 && b <= 23);

    const { data, error } = await supabase
        .from('place_crowd_reports')
        .select('crowd_level')
        .eq('place_id', placeId)
        .eq('day_of_week', dayOfWeek)
        .in('time_bucket', buckets);

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

/**
 * Returns the average crowd level per hour for the current day-of-week,
 * so the UI can render a "typical busy times" bar chart.
 */
export async function getCrowdPattern(placeId: number): Promise<HourPattern[]> {
    const dayOfWeek = new Date().getDay();

    const { data, error } = await supabase
        .from('place_crowd_reports')
        .select('time_bucket, crowd_level')
        .eq('place_id', placeId)
        .eq('day_of_week', dayOfWeek);

    if (error) {
        console.error('Error fetching crowd pattern:', error);
        return [];
    }

    if (!data || data.length === 0) return [];

    const byHour: Record<number, number[]> = {};
    data.forEach(r => {
        if (r.time_bucket >= 0 && r.time_bucket <= 23) {
            if (!byHour[r.time_bucket]) byHour[r.time_bucket] = [];
            byHour[r.time_bucket].push(r.crowd_level);
        }
    });

    return Object.entries(byHour)
        .map(([hour, levels]) => ({
            hour: parseInt(hour),
            avgLevel: levels.reduce((a, b) => a + b, 0) / levels.length,
            count: levels.length,
        }))
        .sort((a, b) => a.hour - b.hour);
}
