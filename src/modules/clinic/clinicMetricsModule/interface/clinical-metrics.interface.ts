// clinical-metrics.interface.ts (updated)

// Keep existing interfaces unchanged
export interface DeviceReading {
    id: number;
    patient_sub: string;
    device_name: string;
    detailed_value: string;
    timestamp: Date;
    manual_entry: boolean;
    entry_type: string;
    critical_alert: boolean;
}

export interface DeviceDataTransmission extends DeviceReading {}

export interface BpMetrics {
    total: number;
    abnormal_count: number;
    abnormal_percent: number;
    avg_sys: number;
    avg_dia: number;
    avg_hr: number;
    arrhythmia_count: number;
    arrhythmia_percent: number;
    normal_count: number;
    normal_percent: number;
    normal_avg_sys: number;
    normal_avg_dia: number;
    normal_avg_hr: number;
    sys_gt_130_dia_gt_80_count: number;
    sys_gt_130_dia_gt_80_percent: number;
    sys_gt_140_dia_gt_80_count: number;
    sys_gt_140_dia_gt_80_percent: number;
    sys_gt_150_dia_gt_80_count: number;
    sys_gt_150_dia_gt_80_percent: number;
    sys_gt_160_dia_gt_80_count: number;
    sys_gt_160_dia_gt_80_percent: number;
    sys_lt_90_dia_lt_60_count: number;
    sys_lt_90_dia_lt_60_percent: number;
    hr_abnormal_count: number;
    hr_abnormal_percent: number;
}

export interface OximeterMetrics {
    total: number;
    spo2_90_92_count: number;
    spo2_90_92_percent: number;
    spo2_88_89_count: number;
    spo2_88_89_percent: number;
    spo2_below_88_count: number;
    spo2_below_88_percent: number;
}

export interface WeightMetrics {
    total: number;
    weight_gain_4pct_count: number;
    weight_gain_4pct_percent: number;
}

export interface GlucoseFastingMetrics {
    total: number;
    above_130_count: number;
    above_130_percent: number;
    above_160_count: number;
    above_160_percent: number;
    above_180_count: number;
    above_180_percent: number;
    below_70_count: number;
    below_70_percent: number;
    below_54_count: number;
    below_54_percent: number;
}

export interface GlucosePostMealMetrics {
    total: number;
    above_180_count: number;
    above_180_percent: number;
    above_200_count: number;
    above_200_percent: number;
}

export interface GlucoseRandomMetrics {
    total: number;
    above_200_count: number;
    above_200_percent: number;
    below_70_count: number;
    below_70_percent: number;
}

export interface GlucoseMetrics {
    fasting: GlucoseFastingMetrics;
    post_meal: GlucosePostMealMetrics;
    random: GlucoseRandomMetrics;
}

export interface AlertMetrics {
    total_readings: number;
    critical_alerts_count: number;
    critical_alerts_percent: number;
    escalations_count: number;
    escalations_percent: number;
    total_alerts_count: number;
    total_alerts_percent: number;
    total_alerts_patients_count: number;
}

// Add new interfaces for patient details

export interface PatientMetricDetail {
    patient_sub: string;
    metric_value_detailed: object;
    reading_timestamp?: Date;
}

// Interface for BP patient details
export interface BpPatientDetails {
    bp_readings: PatientMetricDetail[];
    bp_abnormal: PatientMetricDetail[];
    bp_arrhythmia: PatientMetricDetail[];
    bp_normal: PatientMetricDetail[];
    bp_sys_gt_130_dia_gt_80: PatientMetricDetail[];
    bp_sys_gt_140_dia_gt_80: PatientMetricDetail[];
    bp_sys_gt_150_dia_gt_80: PatientMetricDetail[];
    bp_sys_gt_160_dia_gt_80: PatientMetricDetail[];
    bp_sys_lt_90_dia_lt_60: PatientMetricDetail[];
    bp_hr_abnormal: PatientMetricDetail[];
}

// Interface for oximeter patient details
export interface OximeterPatientDetails {
    spo2_readings: PatientMetricDetail[];
    spo2_90_92: PatientMetricDetail[];
    spo2_88_89: PatientMetricDetail[];
    spo2_below_88: PatientMetricDetail[];
}

// Interface for weight patient details
export interface WeightPatientDetails {
    weight_readings: PatientMetricDetail[];
    weight_gain_4pct: PatientMetricDetail[];
}

// Interface for glucose patient details
export interface GlucoseFastingPatientDetails {
    readings: PatientMetricDetail[];
    above_130: PatientMetricDetail[];
    above_160: PatientMetricDetail[];
    above_180: PatientMetricDetail[];
    below_70: PatientMetricDetail[];
    below_54: PatientMetricDetail[];
}

export interface GlucosePostMealPatientDetails {
    readings: PatientMetricDetail[];
    above_180: PatientMetricDetail[];
    above_200: PatientMetricDetail[];
}

export interface GlucoseRandomPatientDetails {
    readings: PatientMetricDetail[];
    above_200: PatientMetricDetail[];
    below_70: PatientMetricDetail[];
}

export interface GlucosePatientDetails {
    fasting: GlucoseFastingPatientDetails;
    post_meal: GlucosePostMealPatientDetails;
    random: GlucoseRandomPatientDetails;
}

// Interface for alert patient details
export interface AlertPatientDetails {
    critical_alerts: PatientMetricDetail[];
    total_alerts: PatientMetricDetail[];
    escalations: PatientMetricDetail[];
}

// Interface for API response with pagination
export interface PatientMetricsResponse {
    total_patients: number;
    patients: PatientMetricDetail[];
    page: number;
    limit: number;
    total_pages: number;
}

// Extended interfaces for combined metrics and patient details
export interface BpMetricsWithPatients {
    metrics: BpMetrics;
    patientDetails: BpPatientDetails;
}

export interface OximeterMetricsWithPatients {
    metrics: OximeterMetrics;
    patientDetails: OximeterPatientDetails;
}

export interface WeightMetricsWithPatients {
    metrics: WeightMetrics;
    patientDetails: WeightPatientDetails;
}

export interface GlucoseMetricsWithPatients {
    metrics: GlucoseMetrics;
    patientDetails: GlucosePatientDetails;
}

export interface AlertMetricsWithPatients {
    metrics: AlertMetrics;
    patientDetails: AlertPatientDetails;
}
