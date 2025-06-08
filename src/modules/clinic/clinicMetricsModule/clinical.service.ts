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
            const practiceConfig = this.databaseService.getPracticeConfig(practiceId);
            if (!practiceConfig) {
                throw new NotFoundException(`Practice with ID ${practiceId} not found`);
            }

            // Get database connection
            const dataSource = await this.databaseService.getConnection(practiceId);
            const queryRunner = dataSource.createQueryRunner();

            try {
                // Build query based on parameters
                let query = `
                    SELECT * 
                    FROM clinical_metrics_summary
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

                // Add filters
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

                // Calculate total for pagination
                const countQuery = `
            SELECT COUNT(DISTINCT patient_sub) as total
            FROM clinical_metrics_patient_details
            WHERE clinical_metrics_summary_id = ?
              AND metric_name = ?
        `;

                const countResult = await queryRunner.query(countQuery, [summaryId, metricName]);
                const totalPatients = countResult[0]?.total || 0;
                const totalPages = Math.ceil(totalPatients / limit);

                // Get patient details with pagination
                const offset = (page - 1) * limit;
                const patientsQuery = `
            SELECT 
                d.patient_sub,
                d.metric_value,
                d.reading_timestamp,
                p.firstName,
                p.lastName
            FROM clinical_metrics_patient_details d
            LEFT JOIN patient p ON Trim(d.patient_sub) = TRIM(replace(p.sub, '-', '_'))
            WHERE d.clinical_metrics_summary_id = ?
              AND d.metric_name = ?
            GROUP BY d.patient_sub
            ORDER BY d.patient_sub
            LIMIT ?, ?
        `;

                // Convert offset and limit to numbers to ensure they're treated correctly
                const patients = await queryRunner.query(patientsQuery, [
                    summaryId,
                    metricName,
                    Number(offset),
                    Number(limit)
                ]);

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

}
