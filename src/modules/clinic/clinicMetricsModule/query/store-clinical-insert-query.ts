export const insertQuery = `
                    INSERT INTO clinical_metrics_summary (
                        summary_date,
                        practice_id,
                        enrollment_period,
                        
                        -- Blood Pressure Metrics with patient counts
                        bp_total_readings,
                        bp_patients_count,
                        bp_abnormal_count,
                        bp_abnormal_percent,
                        bp_abnormal_patients_count,
                        bp_avg_sys,
                        bp_avg_dia,
                        bp_avg_hr,
                        bp_arrhythmia_count,
                        bp_arrhythmia_percent,
                        bp_arrhythmia_patients_count,
                        bp_normal_count,
                        bp_normal_percent,
                        bp_normal_patients_count,
                        bp_normal_avg_sys,
                        bp_normal_avg_dia,
                        bp_normal_avg_hr,
                        
                        -- BP Threshold Metrics with patient counts
                        bp_sys_gt_130_dia_gt_80_count,
                        bp_sys_gt_130_dia_gt_80_percent,
                        bp_sys_gt_130_dia_gt_80_patients,
                        bp_sys_gt_140_dia_gt_80_count,
                        bp_sys_gt_140_dia_gt_80_percent,
                        bp_sys_gt_140_dia_gt_80_patients,
                        bp_sys_gt_150_dia_gt_80_count,
                        bp_sys_gt_150_dia_gt_80_percent,
                        bp_sys_gt_150_dia_gt_80_patients,
                        bp_sys_gt_160_dia_gt_80_count,
                        bp_sys_gt_160_dia_gt_80_percent,
                        bp_sys_gt_160_dia_gt_80_patients,
                        bp_sys_lt_90_dia_lt_60_count,
                        bp_sys_lt_90_dia_lt_60_percent,
                        bp_sys_lt_90_dia_lt_60_patients,
                        bp_hr_abnormal_count,
                        bp_hr_abnormal_percent,
                        bp_hr_abnormal_patients_count,
                        
                        -- Oximeter Metrics with patient counts
                        spo2_total_readings,
                        spo2_patients_count,
                        spo2_90_92_count,
                        spo2_90_92_percent,
                        spo2_90_92_patients_count,
                        spo2_88_89_count,
                        spo2_88_89_percent,
                        spo2_88_89_patients_count,
                        spo2_below_88_count,
                        spo2_below_88_percent,
                        spo2_below_88_patients_count,
                        
                        -- Weight Metrics with patient counts
                        weight_total_readings,
                        weight_patients_count,
                        weight_gain_4pct_count,
                        weight_gain_4pct_percent,
                        weight_gain_4pct_patients_count,
                        
                        -- Glucose Metrics - Fasting with patient counts
                        glucose_fasting_total,
                        glucose_fasting_patients_count,
                        glucose_fasting_above_130_count,
                        glucose_fasting_above_130_percent,
                        glucose_fasting_above_130_patients,
                        glucose_fasting_above_160_count,
                        glucose_fasting_above_160_percent,
                        glucose_fasting_above_160_patients,
                        glucose_fasting_above_180_count,
                        glucose_fasting_above_180_percent,
                        glucose_fasting_above_180_patients,
                        glucose_fasting_below_70_count,
                        glucose_fasting_below_70_percent,
                        glucose_fasting_below_70_patients,
                        glucose_fasting_below_54_count,
                        glucose_fasting_below_54_percent,
                        glucose_fasting_below_54_patients,
                        
                        -- Glucose Metrics - Post Meal with patient counts
                        glucose_postmeal_total,
                        glucose_postmeal_patients_count,
                        glucose_postmeal_above_180_count,
                        glucose_postmeal_above_180_percent,
                        glucose_postmeal_above_180_patients,
                        glucose_postmeal_above_200_count,
                        glucose_postmeal_above_200_percent,
                        glucose_postmeal_above_200_patients,
                        
                        -- Glucose Metrics - Random with patient counts
                        glucose_random_total,
                        glucose_random_patients_count,
                        glucose_random_above_200_count,
                        glucose_random_above_200_percent,
                        glucose_random_above_200_patients,
                        glucose_random_below_70_count,
                        glucose_random_below_70_percent,
                        glucose_random_below_70_patients,
                        
                        -- Alert Metrics with patient counts
                        critical_alerts_count,
                        critical_alerts_percent,
                        critical_alerts_patients_count,
                        escalations_count,
                        escalations_percent,
                        escalations_patients_count
                    )
                    VALUES (
                        ?, ?, ?, 
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?
                    )
                `;
