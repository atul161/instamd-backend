export const createClinicalSummaryTable=
     `CREATE TABLE clinical_metrics_summary
                        (
                            id                                 INT AUTO_INCREMENT PRIMARY KEY,
                            summary_date                       DATE         NOT NULL,
                            practice_id                        VARCHAR(200) NOT NULL,
                            enrollment_period                  VARCHAR(50)  NOT NULL,
                            total_patients                     INT           DEFAULT 0,

                            -- Blood Pressure Metrics
                            bp_total_readings                  INT           DEFAULT 0,

                            bp_patients_count                  INT           DEFAULT 0,
                            bp_abnormal_count                  INT           DEFAULT 0,
                            bp_abnormal_percent                DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            bp_abnormal_patients_count         INT           DEFAULT 0,
                            bp_avg_sys                         DECIMAL(5, 2) DEFAULT 0,
                            bp_avg_dia                         DECIMAL(5, 2) DEFAULT 0,
                            bp_avg_hr                          DECIMAL(5, 2) DEFAULT 0,
                            bp_arrhythmia_count                INT           DEFAULT 0,
                            bp_arrhythmia_percent              DECIMAL(5, 2) DEFAULT 0,
                            --  
                            bp_arrhythmia_patients_count       INT           DEFAULT 0,

                            -- Normal Blood Pressure Metrics
                            bp_normal_count                    INT           DEFAULT 0,
                            bp_normal_percent                  DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            bp_normal_patients_count           INT           DEFAULT 0,
                            bp_normal_avg_sys                  DECIMAL(5, 2) DEFAULT 0,
                            bp_normal_avg_dia                  DECIMAL(5, 2) DEFAULT 0,
                            bp_normal_avg_hr                   DECIMAL(5, 2) DEFAULT 0,

                            -- New BP Threshold Metrics
                            bp_sys_gt_130_dia_gt_80_count      INT           DEFAULT 0,
                            bp_sys_gt_130_dia_gt_80_percent    DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            bp_sys_gt_130_dia_gt_80_patients   INT           DEFAULT 0,
                            bp_sys_gt_140_dia_gt_80_count      INT           DEFAULT 0,
                            bp_sys_gt_140_dia_gt_80_percent    DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            bp_sys_gt_140_dia_gt_80_patients   INT           DEFAULT 0,
                            bp_sys_gt_150_dia_gt_80_count      INT           DEFAULT 0,
                            bp_sys_gt_150_dia_gt_80_percent    DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            bp_sys_gt_150_dia_gt_80_patients   INT           DEFAULT 0,
                            bp_sys_gt_160_dia_gt_80_count      INT           DEFAULT 0,
                            bp_sys_gt_160_dia_gt_80_percent    DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            bp_sys_gt_160_dia_gt_80_patients   INT           DEFAULT 0,
                            bp_sys_lt_90_dia_lt_60_count       INT           DEFAULT 0,
                            bp_sys_lt_90_dia_lt_60_percent     DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            bp_sys_lt_90_dia_lt_60_patients    INT           DEFAULT 0,
                            bp_hr_abnormal_count               INT           DEFAULT 0,
                            bp_hr_abnormal_percent             DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            bp_hr_abnormal_patients_count      INT           DEFAULT 0,

                            -- Pulse Oximeter Metrics
                            spo2_total_readings                INT           DEFAULT 0,
                            -- 
                            spo2_patients_count                INT           DEFAULT 0,
                            spo2_90_92_count                   INT           DEFAULT 0,
                            spo2_90_92_percent                 DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            spo2_90_92_patients_count          INT           DEFAULT 0,
                            spo2_88_89_count                   INT           DEFAULT 0,
                            spo2_88_89_percent                 DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            spo2_88_89_patients_count          INT           DEFAULT 0,
                            spo2_below_88_count                INT           DEFAULT 0,
                            spo2_below_88_percent              DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            spo2_below_88_patients_count       INT           DEFAULT 0,

                            -- Weight Metrics
                            weight_total_readings              INT           DEFAULT 0,
                            weight_patients_count              INT           DEFAULT 0,
                            weight_gain_4pct_count             INT           DEFAULT 0,
                            weight_gain_4pct_percent           DECIMAL(5, 2) DEFAULT 0,
                            weight_gain_4pct_patients_count    INT           DEFAULT 0,

                            -- Glucose Metrics - Fasting
                            glucose_fasting_total              INT           DEFAULT 0,
                            glucose_fasting_patients_count     INT           DEFAULT 0,
                            glucose_fasting_above_130_count    INT           DEFAULT 0,
                            glucose_fasting_above_130_percent  DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            glucose_fasting_above_130_patients INT           DEFAULT 0,
                            glucose_fasting_above_160_count    INT           DEFAULT 0,
                            glucose_fasting_above_160_percent  DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            glucose_fasting_above_160_patients INT           DEFAULT 0,
                            glucose_fasting_above_180_count    INT           DEFAULT 0,
                            glucose_fasting_above_180_percent  DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            glucose_fasting_above_180_patients INT           DEFAULT 0,
                            glucose_fasting_below_70_count     INT           DEFAULT 0,
                            glucose_fasting_below_70_percent   DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            glucose_fasting_below_70_patients  INT           DEFAULT 0,
                            glucose_fasting_below_54_count     INT           DEFAULT 0,
                            glucose_fasting_below_54_percent   DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            glucose_fasting_below_54_patients  INT           DEFAULT 0,

                            -- Glucose Metrics - Post Meal
                            glucose_postmeal_total             INT           DEFAULT 0,
                            -- 
                            glucose_postmeal_patients_count    INT           DEFAULT 0,
                            glucose_postmeal_above_180_count   INT           DEFAULT 0,
                            glucose_postmeal_above_180_percent DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            glucose_postmeal_above_180_patients INT          DEFAULT 0,
                            glucose_postmeal_above_200_count   INT           DEFAULT 0,
                            glucose_postmeal_above_200_percent DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            glucose_postmeal_above_200_patients INT          DEFAULT 0,

                            -- Glucose Metrics - Random
                            glucose_random_total               INT           DEFAULT 0,
                            -- 
                            glucose_random_patients_count      INT           DEFAULT 0,
                            glucose_random_above_200_count     INT           DEFAULT 0,
                            glucose_random_above_200_percent   DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            glucose_random_above_200_patients  INT           DEFAULT 0,
                            glucose_random_below_70_count      INT           DEFAULT 0,
                            glucose_random_below_70_percent    DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            glucose_random_below_70_patients   INT           DEFAULT 0,

                            -- Alert Metrics
                            critical_alerts_count              INT           DEFAULT 0,
                            critical_alerts_percent            DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            critical_alerts_patients_count     INT           DEFAULT 0,
                            escalations_count                  INT           DEFAULT 0,
                            escalations_percent                DECIMAL(5, 2) DEFAULT 0,
                            -- 
                            escalations_patients_count         INT           DEFAULT 0,

                            created_at                         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
                            updated_at                         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                            INDEX idx_practice_id (practice_id),
                            INDEX idx_summary_date (summary_date),
                            INDEX idx_enrollment_period (enrollment_period),
                            UNIQUE INDEX idx_practice_period_date (practice_id, enrollment_period, summary_date)
                        ) ENGINE = InnoDB
                          DEFAULT CHARSET = utf8mb4
                          COLLATE = utf8mb4_unicode_ci;
                    `
