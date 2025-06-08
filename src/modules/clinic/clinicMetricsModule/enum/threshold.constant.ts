// Constants for clinical thresholds
export const NORMAL_BP_RANGES = {
    sys_min: 90,
    sys_max: 130,
    dia_min: 60,
    dia_max: 80,
    hr_min: 60,
    hr_max: 100
};

export const  SPO2_RANGES = {
    normal: 93,          // >= 93% is normal
    moderate_low_min: 90, // 90-92% is moderate low
    moderate_low_max: 92,
    low_min: 88,         // 88-89% is low
    low_max: 89,
    critical_low: 88     // < 88% is critical
};

export const GLUCOSE_RANGES = {
    fasting: {
        normal_max: 130,
        high_min: 130,
        high_max: 160,
        very_high_min: 160,
        critical_min: 180,
        low_max: 70,
        severe_low_max: 54
    },
    post_meal: {
        normal_max: 180,
        high_min: 180,
        critical_min: 200
    },
    random: {
        normal_max: 200,
        high_min: 200,
        low_max: 70
    }
};

export const WEIGHT_CHANGE_THRESHOLD = 4.0; // % change to consider significant
