export const createPatientDetailsTable = `CREATE TABLE clinical_metrics_patient_details (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        clinical_metrics_summary_id INT NOT NULL,
                        patient_sub VARCHAR(200) NOT NULL,
                        metric_name VARCHAR(100) NOT NULL,
     
                        metric_value_detailed JSON NULL,
                        reading_timestamp TIMESTAMP NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        
                        INDEX idx_summary_id (clinical_metrics_summary_id),
                        INDEX idx_patient_sub (patient_sub),
                        INDEX idx_metric_name (metric_name),
                        INDEX idx_summary_metric (clinical_metrics_summary_id, metric_name),
                        
                        CONSTRAINT fk_patient_details_summary 
                        FOREIGN KEY (clinical_metrics_summary_id) 
                        REFERENCES clinical_metrics_summary(id)
                        ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
