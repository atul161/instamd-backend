// Replace the single table creation with separate tables for each metric type
export const createBpDetailsTable = `CREATE TABLE if not exists clinical_metrics_bp_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clinical_metrics_summary_id INT NOT NULL,
    patient_sub VARCHAR(200) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value_detailed JSON NULL,
    reading_timestamp TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_bp_summary_id (clinical_metrics_summary_id),
    INDEX idx_bp_patient_sub (patient_sub),
    INDEX idx_bp_metric_name (metric_name),
    INDEX idx_bp_summary_metric (clinical_metrics_summary_id, metric_name),
    
    CONSTRAINT fk_bp_details_summary 
    FOREIGN KEY (clinical_metrics_summary_id) 
    REFERENCES clinical_metrics_summary(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

export const createSpo2DetailsTable = `CREATE TABLE if not exists clinical_metrics_spo2_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clinical_metrics_summary_id INT NOT NULL,
    patient_sub VARCHAR(200) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value_detailed JSON NULL,
    reading_timestamp TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_spo2_summary_id (clinical_metrics_summary_id),
    INDEX idx_spo2_patient_sub (patient_sub),
    INDEX idx_spo2_metric_name (metric_name),
    INDEX idx_spo2_summary_metric (clinical_metrics_summary_id, metric_name),
    
    CONSTRAINT fk_spo2_details_summary 
    FOREIGN KEY (clinical_metrics_summary_id) 
    REFERENCES clinical_metrics_summary(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

export const createWeightDetailsTable = `CREATE TABLE if not exists clinical_metrics_weight_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clinical_metrics_summary_id INT NOT NULL,
    patient_sub VARCHAR(200) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value_detailed JSON NULL,
    reading_timestamp TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_weight_summary_id (clinical_metrics_summary_id),
    INDEX idx_weight_patient_sub (patient_sub),
    INDEX idx_weight_metric_name (metric_name),
    INDEX idx_weight_summary_metric (clinical_metrics_summary_id, metric_name),
    
    CONSTRAINT fk_weight_details_summary 
    FOREIGN KEY (clinical_metrics_summary_id) 
    REFERENCES clinical_metrics_summary(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

export const createGlucoseDetailsTable = `CREATE TABLE if not exists clinical_metrics_glucose_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clinical_metrics_summary_id INT NOT NULL,
    patient_sub VARCHAR(200) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value_detailed JSON NULL,
    reading_timestamp TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_glucose_summary_id (clinical_metrics_summary_id),
    INDEX idx_glucose_patient_sub (patient_sub),
    INDEX idx_glucose_metric_name (metric_name),
    INDEX idx_glucose_summary_metric (clinical_metrics_summary_id, metric_name),
    
    CONSTRAINT fk_glucose_details_summary 
    FOREIGN KEY (clinical_metrics_summary_id) 
    REFERENCES clinical_metrics_summary(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

export const createAlertDetailsTable = `CREATE TABLE if not exists clinical_metrics_alert_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clinical_metrics_summary_id INT NOT NULL,
    patient_sub VARCHAR(200) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value_detailed JSON NULL,
    reading_timestamp TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_alert_summary_id (clinical_metrics_summary_id),
    INDEX idx_alert_patient_sub (patient_sub),
    INDEX idx_alert_metric_name (metric_name),
    INDEX idx_alert_summary_metric (clinical_metrics_summary_id, metric_name),
    
    CONSTRAINT fk_alert_details_summary 
    FOREIGN KEY (clinical_metrics_summary_id) 
    REFERENCES clinical_metrics_summary(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
