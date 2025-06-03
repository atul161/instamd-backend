import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Entity('clinical_metrics_summary')
@Index('idx_practice_id', ['practiceId'])
@Index('idx_summary_date', ['summaryDate'])
@Index('idx_enrollment_period', ['enrollmentPeriod'])
@Unique('idx_practice_period_date', ['practiceId', 'enrollmentPeriod', 'summaryDate'])
export class ClinicalMetricsSummary {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'summary_date', type: 'date' })
    summaryDate: Date;

    @Column({ name: 'practice_id', length: 200 })
    practiceId: string;

    @Column({ name: 'enrollment_period', length: 50 })
    enrollmentPeriod: string;

    // Blood Pressure Metrics
    @Column({ name: 'bp_total_readings', default: 0 })
    bpTotalReadings: number;

    @Column({ name: 'bp_abnormal_count', default: 0 })
    bpAbnormalCount: number;

    @Column({ name: 'bp_abnormal_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    bpAbnormalPercent: number;

    @Column({ name: 'bp_avg_sys', type: 'decimal', precision: 5, scale: 2, default: 0 })
    bpAvgSys: number;

    @Column({ name: 'bp_avg_dia', type: 'decimal', precision: 5, scale: 2, default: 0 })
    bpAvgDia: number;

    @Column({ name: 'bp_avg_hr', type: 'decimal', precision: 5, scale: 2, default: 0 })
    bpAvgHr: number;

    @Column({ name: 'bp_arrhythmia_count', default: 0 })
    bpArrhythmiaCount: number;

    @Column({ name: 'bp_arrhythmia_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    bpArrhythmiaPercent: number;

    @Column({ name: 'bp_normal_count', default: 0 })
    bpNormalCount: number;

    @Column({ name: 'bp_normal_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    bpNormalPercent: number;

    @Column({ name: 'bp_normal_avg_sys', type: 'decimal', precision: 5, scale: 2, default: 0 })
    bpNormalAvgSys: number;

    @Column({ name: 'bp_normal_avg_dia', type: 'decimal', precision: 5, scale: 2, default: 0 })
    bpNormalAvgDia: number;

    @Column({ name: 'bp_normal_avg_hr', type: 'decimal', precision: 5, scale: 2, default: 0 })
    bpNormalAvgHr: number;

    // BP Threshold Metrics
    @Column({ name: 'bp_sys_gt_130_dia_gt_80_count', default: 0 })
    bpSysGt130DiaGt80Count: number;

    @Column({ name: 'bp_sys_gt_130_dia_gt_80_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    bpSysGt130DiaGt80Percent: number;

    @Column({ name: 'bp_sys_gt_140_dia_gt_80_count', default: 0 })
    bpSysGt140DiaGt80Count: number;

    @Column({ name: 'bp_sys_gt_140_dia_gt_80_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    bpSysGt140DiaGt80Percent: number;

    @Column({ name: 'bp_sys_gt_150_dia_gt_80_count', default: 0 })
    bpSysGt150DiaGt80Count: number;

    @Column({ name: 'bp_sys_gt_150_dia_gt_80_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    bpSysGt150DiaGt80Percent: number;

    @Column({ name: 'bp_sys_gt_160_dia_gt_80_count', default: 0 })
    bpSysGt160DiaGt80Count: number;

    @Column({ name: 'bp_sys_gt_160_dia_gt_80_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    bpSysGt160DiaGt80Percent: number;

    @Column({ name: 'bp_sys_lt_90_dia_lt_60_count', default: 0 })
    bpSysLt90DiaLt60Count: number;

    @Column({ name: 'bp_sys_lt_90_dia_lt_60_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    bpSysLt90DiaLt60Percent: number;

    @Column({ name: 'bp_hr_abnormal_count', default: 0 })
    bpHrAbnormalCount: number;

    @Column({ name: 'bp_hr_abnormal_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    bpHrAbnormalPercent: number;

    // Pulse Oximeter Metrics
    @Column({ name: 'spo2_total_readings', default: 0 })
    spo2TotalReadings: number;

    @Column({ name: 'spo2_90_92_count', default: 0 })
    spo2_90_92_count: number;

    @Column({ name: 'spo2_90_92_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    spo2_90_92_percent: number;

    @Column({ name: 'spo2_88_89_count', default: 0 })
    spo2_88_89_count: number;

    @Column({ name: 'spo2_88_89_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    spo2_88_89_percent: number;

    @Column({ name: 'spo2_below_88_count', default: 0 })
    spo2Below88Count: number;

    @Column({ name: 'spo2_below_88_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    spo2Below88Percent: number;

    // Weight Metrics
    @Column({ name: 'weight_total_readings', default: 0 })
    weightTotalReadings: number;

    @Column({ name: 'weight_gain_4pct_count', default: 0 })
    weightGain4pctCount: number;

    @Column({ name: 'weight_gain_4pct_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    weightGain4pctPercent: number;

    // Glucose Metrics - Fasting
    @Column({ name: 'glucose_fasting_total', default: 0 })
    glucoseFastingTotal: number;

    @Column({ name: 'glucose_fasting_above_130_count', default: 0 })
    glucoseFastingAbove130Count: number;

    @Column({ name: 'glucose_fasting_above_130_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    glucoseFastingAbove130Percent: number;

    @Column({ name: 'glucose_fasting_above_160_count', default: 0 })
    glucoseFastingAbove160Count: number;

    @Column({ name: 'glucose_fasting_above_160_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    glucoseFastingAbove160Percent: number;

    @Column({ name: 'glucose_fasting_above_180_count', default: 0 })
    glucoseFastingAbove180Count: number;

    @Column({ name: 'glucose_fasting_above_180_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    glucoseFastingAbove180Percent: number;

    @Column({ name: 'glucose_fasting_below_70_count', default: 0 })
    glucoseFastingBelow70Count: number;

    @Column({ name: 'glucose_fasting_below_70_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    glucoseFastingBelow70Percent: number;

    @Column({ name: 'glucose_fasting_below_54_count', default: 0 })
    glucoseFastingBelow54Count: number;

    @Column({ name: 'glucose_fasting_below_54_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    glucoseFastingBelow54Percent: number;

    // Glucose Metrics - Post Meal
    @Column({ name: 'glucose_postmeal_total', default: 0 })
    glucosePostmealTotal: number;

    @Column({ name: 'glucose_postmeal_above_180_count', default: 0 })
    glucosePostmealAbove180Count: number;

    @Column({ name: 'glucose_postmeal_above_180_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    glucosePostmealAbove180Percent: number;

    @Column({ name: 'glucose_postmeal_above_200_count', default: 0 })
    glucosePostmealAbove200Count: number;

    @Column({ name: 'glucose_postmeal_above_200_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    glucosePostmealAbove200Percent: number;

    // Glucose Metrics - Random
    @Column({ name: 'glucose_random_total', default: 0 })
    glucoseRandomTotal: number;

    @Column({ name: 'glucose_random_above_200_count', default: 0 })
    glucoseRandomAbove200Count: number;

    @Column({ name: 'glucose_random_above_200_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    glucoseRandomAbove200Percent: number;

    @Column({ name: 'glucose_random_below_70_count', default: 0 })
    glucoseRandomBelow70Count: number;

    @Column({ name: 'glucose_random_below_70_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    glucoseRandomBelow70Percent: number;

    // Alert Metrics
    @Column({ name: 'critical_alerts_count', default: 0 })
    criticalAlertsCount: number;

    @Column({ name: 'critical_alerts_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    criticalAlertsPercent: number;

    @Column({ name: 'escalations_count', default: 0 })
    escalationsCount: number;

    @Column({ name: 'escalations_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
    escalationsPercent: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
