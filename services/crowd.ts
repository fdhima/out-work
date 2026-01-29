
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
