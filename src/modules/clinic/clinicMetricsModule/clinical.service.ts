import {Injectable, InternalServerErrorException, Logger, NotFoundException} from '@nestjs/common';

import {DatabaseService} from "../../database/database.service";

@Injectable()
export class ClinicalService {

    private readonly logger = new Logger(ClinicalService.name);

    constructor(
        private readonly databaseService: DatabaseService
    ) {}

    async getClinicalMetrics(practiceId: string , period?: string, startDate?: string, endDate?: string): Promise<any> {
        try {
            this.logger.log(`Fetching clinical metrics for practice: ${practiceId}`);

            // Validate practice ID exists
            const instaMDConfig = this.databaseService.getInstaMDConfig();
            if (!instaMDConfig) {
                throw new NotFoundException(`Practice with ID ${practiceId} not found`);
            }

            // Get database connection
            const dataSource = await this.databaseService.getInstaMdConnection();
            const queryRunner = dataSource.createQueryRunner();

            try {
                // Build query based on parameters
                let query = `
                    SELECT * 
                    FROM instamd.clinical_metrics_summary
                    WHERE practice_id = ?
                `;

                const params: any[] = [practiceId];

                // Add period filter if provided
                if (period) {
                    query += ` AND enrollment_period = ?`;
                    params.push(period);
                }

                // Add date range filters if provided
                if (startDate) {
                    query += ` AND summary_date >= ?`;
                    params.push(startDate);
                }

                if (endDate) {
                    query += ` AND summary_date <= ?`;
                    params.push(endDate);
                }

                // Order by date descending to get most recent first
                query += ` ORDER BY summary_date DESC`;

                // Execute query
                const results = await queryRunner.query(query, params);

                if (!results || results.length === 0) {
                    return {
                        clinical_summaries: []
                    };
                }

                // Return results in the exact format required
                return {
                    clinical_summaries: results
                };
            } finally {
                // Always release the query runner
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(`Error fetching clinical metrics: ${error.message}`);

            if (error instanceof NotFoundException) {
                throw error;
            }

            throw new InternalServerErrorException('Failed to retrieve clinical metrics');
        }
    }


    async getEnrollmentMetrics(practiceId: string , period?: string, startDate?: string, endDate?: string): Promise<any> {
        try {
            this.logger.log(`Fetching enrollment metrics for practice: ${practiceId}`);

            // Validate practice ID exists
            const instaMDConfig = this.databaseService.getInstaMDConfig();
            if (!instaMDConfig) {
                throw new NotFoundException(`Practice with ID ${practiceId} not found`);
            }

            // Get database connection
            const dataSource = await this.databaseService.getInstaMdConnection();
            const queryRunner = dataSource.createQueryRunner();

            try {
                // Build query based on parameters
                let query = `
                    SELECT * 
                    FROM instamd.enrollment_metrics_summary
                    WHERE practice_id = ?
                `;

                const params: any[] = [practiceId];

                // Add period filter if provided
                if (period) {
                    query += ` AND enrollment_period = ?`;
                    params.push(period);
                }

                // Add date range filters if provided
                if (startDate) {
                    query += ` AND summary_date >= ?`;
                    params.push(startDate);
                }

                if (endDate) {
                    query += ` AND summary_date <= ?`;
                    params.push(endDate);
                }

                // Order by date descending to get most recent first
                query += ` ORDER BY summary_date DESC`;

                // Execute query
                const results = await queryRunner.query(query, params);

                if (!results || results.length === 0) {
                    return {
                        clinical_summaries: []
                    };
                }

                // Return results in the exact format required
                return {
                    clinical_summaries: results
                };
            } finally {
                // Always release the query runner
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(`Error fetching enrollment metrics: ${error.message}`);

            if (error instanceof NotFoundException) {
                throw error;
            }

            throw new InternalServerErrorException('Failed to retrieve enrollment metrics');
        }
    }

    async getPatientsByMetric(
        practiceId: string,
        metricName: string,
        period?: string,
        page: number = 1,
        limit: number = 50
    ): Promise<any> {
        try {
            this.logger.log(`Fetching patients for metric ${metricName} in practice: ${practiceId}`);

            // Validate practice ID
            const practiceConfig = this.databaseService.getPracticeConfig(practiceId);
            if (!practiceConfig) {
                throw new NotFoundException(`Practice with ID ${practiceId} not found`);
            }

            // Get connection
            const dataSource = await this.databaseService.getConnection(practiceId);
            const queryRunner = dataSource.createQueryRunner();

            try {
                // Find the appropriate summary record
                let summaryQuery = `
                SELECT id 
                FROM clinical_metrics_summary
                WHERE practice_id = ?
            `;

                const summaryParams: any[] = [practiceId];

                if (period) {
                    summaryQuery += ` AND enrollment_period = ?`;
                    summaryParams.push(period);
                }

                // Get most recent summary first
                summaryQuery += ` ORDER BY summary_date DESC LIMIT 1`;

                const summaryResults = await queryRunner.query(summaryQuery, summaryParams);

                if (!summaryResults || summaryResults.length === 0) {
                    return {
                        total_patients: 0,
                        page,
                        limit,
                        total_pages: 0,
                        patients: []
                    };
                }

                const summaryId = summaryResults[0].id;

                // Determine which table to query based on metric name
                let tableName: string;

                if (metricName.startsWith('bp_')) {
                    tableName = 'clinical_metrics_bp_details_v1';
                } else if (metricName.startsWith('spo2_')) {
                    tableName = 'clinical_metrics_spo2_details';
                } else if (metricName.startsWith('weight_')) {
                    tableName = 'clinical_metrics_weight_details';
                } else if (metricName.startsWith('glucose_')) {
                    tableName = 'clinical_metrics_glucose_details';
                } else if (['critical_alert', 'escalation', 'total_alerts'].includes(metricName)) {
                    tableName = 'clinical_metrics_alert_details';
                }

                // Calculate total for pagination
                const countQuery = `
                SELECT COUNT(DISTINCT patient_sub) as total
                FROM ${tableName}
                WHERE clinical_metrics_summary_id = ?
                  AND metric_name = ?
            `;

                const countResult = await queryRunner.query(countQuery, [summaryId, metricName]);
                const totalPatients = countResult[0]?.total || 0;
                const totalPages = Math.ceil(totalPatients / limit);

                if (totalPatients === 0) {
                    return {
                        total_patients: 0,
                        page,
                        limit,
                        total_pages: 0,
                        patients: []
                    };
                }

                // Get patient details with pagination
                const offset = (page - 1) * limit;
                const patientsQuery = `
                    SELECT
                        d.patient_sub,
                        d.metric_value_detailed,
                        d.reading_timestamp,
                        p.firstName,
                        p.lastName
                    FROM ${tableName} d
                             LEFT JOIN patient p ON trim(d.patient_sub) = p.sub
                    WHERE d.clinical_metrics_summary_id = ?
                      AND d.metric_name = ?
                    GROUP BY d.patient_sub
                    ORDER BY d.patient_sub
                    LIMIT ?, ?
                `;

                const patients = await queryRunner.query(patientsQuery, [
                    summaryId,
                    metricName,
                    Number(offset),
                    Number(limit)
                ]);

                // Process BP-specific data if needed
                if (metricName.includes("bp")) {
                    for (const patient of patients) {
                        if (patient.metric_value_detailed) {
                            try {
                                const metaDict = JSON.parse(patient.metric_value_detailed);
                                patient.systolic = metaDict.sys || 0;
                                patient.diastolic = metaDict.dia || 0;
                                patient.heart_rate = metaDict.hr || 0;
                                patient.arrhythmia = metaDict.arrhythmia || 0;

                                // Free up memory
                                delete patient.metric_value_detailed;
                            } catch (e) {
                                this.logger.warn(`Error parsing BP data for patient ${patient.patient_sub}: ${e.message}`);
                            }
                        }
                    }
                }

                return {
                    total_patients: totalPatients,
                    page,
                    limit,
                    total_pages: totalPages,
                    patients
                };
            } finally {
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(`Error fetching patients by metric: ${error.message}`);
            throw error;
        }
    }

    async getPatientDetails(practiceId: string, patientSub: string): Promise<any> {
        try {
            this.logger.log(`Fetching patient details for practice: ${practiceId} and patient: ${patientSub}`);

            // Validate practice ID
            const practiceConfig = this.databaseService.getPracticeConfig(practiceId);
            if (!practiceConfig) {
                throw new NotFoundException(`Practice with ID ${practiceId} not found`);
            }
            let patientId = patientSub.trim();

            // Get connection
            const dataSource = await this.databaseService.getConnection(practiceId);
            const queryRunner = dataSource.createQueryRunner();

            try {
                // Connect to the database
                await queryRunner.connect();
                patientId = patientId.trim();
                // Query patient information from patient table with only relevant fields
                const patientQuery = `
                    SELECT
                        sub,
                        firstName,
                        lastName,
                        email,
                        gender,
                        phone_number,
                        address,
                        mrn,
                        home_address1,
                        home_city,
                        home_state,
                        home_pin,
                        p_timezone,
                        p_language,
                        enrollDate,
                        currentMedication,
                        height,
                        modules,
                        title,
                        specialty,
                        note,
                        lace_risk,
                        ascvd_risk,
                        stroke_risk,
                        register_status,
                        is_eligibled
                    FROM patient
                    WHERE TRIM(REPLACE(sub, '-', '_')) = ?
                `;
                const patientResults = await queryRunner.query(patientQuery, [patientId]);

                if (!patientResults || patientResults.length === 0) {
                    throw new NotFoundException(`Patient with ID ${patientSub} not found`);
                }

                // Return only the patient information
                return {
                    status: 'success',
                    data: patientResults[0],
                    metadata: {
                        timestamp: new Date().toISOString(),
                        practiceId: practiceId
                    }
                };

            } catch (error) {
                this.logger.error(`Error in database operations: ${error.message}`);
                throw error;
            } finally {
                // Always release the query runner
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(`Error fetching patient details: ${error.message}`);

            if (error instanceof NotFoundException) {
                throw error;
            }

            throw new InternalServerErrorException('Failed to retrieve patient details');
        }
    }

}
