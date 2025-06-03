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

}
