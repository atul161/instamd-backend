// cpt.service.ts
import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from "../../database/database.service";
import {
    CptBillableMetricsResponseDto,
    CptBillableMetricsDto,
    CptBillableMetricsSummaryResponseDto,
    CptBillableMetricsSummaryDto
} from './dto/cpt.dto';

@Injectable()
export class CptService {
    private readonly logger = new Logger(CptService.name);

    constructor(
        private readonly databaseService: DatabaseService
    ) {}

    async getCptBillableMetrics(practiceId: string): Promise<CptBillableMetricsResponseDto> {
        try {
            this.logger.log(`Fetching CPT billable metrics for practice: ${practiceId}`);

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
                    FROM instamd.cpt_billable_metrics_summary
                    WHERE practice_id = ?
                    ORDER BY year_value DESC, month_start ASC
                `;

                const params: any[] = [practiceId];

                // Execute query
                const results = await queryRunner.query(query, params);

                if (!results || results.length === 0) {
                    return {
                        status: 'success',
                        data: [],
                        metadata: {
                            total_records: 0,
                            practice_id: practiceId,
                            timestamp: new Date().toISOString()
                        }
                    };
                }

                // Transform results to match DTO
                const transformedResults: CptBillableMetricsDto[] = results.map(row => ({
                    id: row.id,
                    practice_id: row.practice_id,
                    month_year: row.month_year,
                    month_name: row.month_name,
                    year_value: row.year_value,
                    month_start: row.month_start,
                    month_end: row.month_end,
                    unique_billable_99453_patient_count: row.unique_billable_99453_patient_count || 0,
                    unique_billable_99454_patient_count: row.unique_billable_99454_patient_count || 0,
                    unique_billable_99457_patient_count: row.unique_billable_99457_patient_count || 0,
                    unique_billable_99458_1_patient_count: row.unique_billable_99458_1_patient_count || 0,
                    unique_billable_99458_2_patient_count: row.unique_billable_99458_2_patient_count || 0,
                    unique_billable_total_patient_count: row.unique_billable_total_patient_count || 0,
                    total_billable_99453_patient_count: row.total_billable_99453_patient_count || 0,
                    total_billable_99454_patient_count: row.total_billable_99454_patient_count || 0,
                    total_billable_99457_patient_count: row.total_billable_99457_patient_count || 0,
                    total_billable_99458_1_patient_count: row.total_billable_99458_1_patient_count || 0,
                    total_billable_99458_2_patient_count: row.total_billable_99458_2_patient_count || 0,
                    total_billable_rows_count: row.total_billable_rows_count || 0,
                    total_billable_all_cpt_flags_count: row.total_billable_all_cpt_flags_count || 0,
                    unique_billable_99453_99454_patient_count: row.unique_billable_99453_99454_patient_count || 0,
                    unique_billable_99453_99454_99457_patient_count: row.unique_billable_99453_99454_99457_patient_count || 0,
                    unique_billable_99453_99454_99457_99458_1_patient_count: row.unique_billable_99453_99454_99457_99458_1_patient_count || 0,
                    unique_billable_all_five_cpt_patient_count: row.unique_billable_all_five_cpt_patient_count || 0,
                    total_billable_99453_99454_patient_count: row.total_billable_99453_99454_patient_count || 0,
                    total_billable_99453_99454_99457_patient_count: row.total_billable_99453_99454_99457_patient_count || 0,
                    total_billable_99453_99454_99457_99458_1_patient_count: row.total_billable_99453_99454_99457_99458_1_patient_count || 0,
                    total_billable_all_five_cpt_patient_count: row.total_billable_all_five_cpt_patient_count || 0,
                    billing_cycles_with_billable_items: row.billing_cycles_with_billable_items || 0,
                    calculation_date: row.calculation_date,
                    last_updated: row.last_updated,
                    created_at: row.created_at,
                    updated_at: row.updated_at
                }));

                return {
                    status: 'success',
                    data: transformedResults,
                    metadata: {
                        total_records: transformedResults.length,
                        practice_id: practiceId,
                        timestamp: new Date().toISOString()
                    }
                };

            } finally {
                // Always release the query runner
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(`Error fetching CPT billable metrics: ${error.message}`);

            if (error instanceof NotFoundException) {
                throw error;
            }

            throw new InternalServerErrorException('Failed to retrieve CPT billable metrics');
        }
    }

    async getCptBillableMetricsSummary(practiceId: string): Promise<CptBillableMetricsSummaryResponseDto> {
        try {
            this.logger.log(`Fetching CPT billable metrics summary for practice: ${practiceId}`);

            // Validate practice ID exists
            const instaMDConfig = this.databaseService.getInstaMDConfig();
            if (!instaMDConfig) {
                throw new NotFoundException(`Practice with ID ${practiceId} not found`);
            }

            // Get database connection
            const dataSource = await this.databaseService.getInstaMdConnection();
            const queryRunner = dataSource.createQueryRunner();

            try {
                // Query to get aggregated summary data
                const summaryQuery = `
                    SELECT 
                        practice_id,
                        MAX(unique_billable_total_patient_count) as max_unique_patients,
                        SUM(total_billable_all_cpt_flags_count) as total_billable_items,
                        COUNT(*) as months_with_data,
                        MAX(month_year) as latest_month,
                        SUM(unique_billable_99453_patient_count) as total_unique_99453,
                        SUM(unique_billable_99454_patient_count) as total_unique_99454,
                        SUM(unique_billable_99457_patient_count) as total_unique_99457,
                        SUM(unique_billable_99458_1_patient_count) as total_unique_99458_1,
                        SUM(unique_billable_99458_2_patient_count) as total_unique_99458_2,
                        SUM(total_billable_99453_patient_count) as sum_total_99453,
                        SUM(total_billable_99454_patient_count) as sum_total_99454,
                        SUM(total_billable_99457_patient_count) as sum_total_99457,
                        SUM(total_billable_99458_1_patient_count) as sum_total_99458_1,
                        SUM(total_billable_99458_2_patient_count) as sum_total_99458_2
                    FROM instamd.cpt_billable_metrics_summary
                    WHERE practice_id = ?
                    GROUP BY practice_id
                `;

                const summaryResults = await queryRunner.query(summaryQuery, [practiceId]);

                if (!summaryResults || summaryResults.length === 0) {
                    return {
                        status: 'success',
                        data: {
                            practice_id: practiceId,
                            total_unique_patients: 0,
                            total_billable_items: 0,
                            months_with_data: 0,
                            latest_month: '',
                            cpt_code_breakdown: {
                                cpt_99453: { unique_patients: 0, total_billable: 0 },
                                cpt_99454: { unique_patients: 0, total_billable: 0 },
                                cpt_99457: { unique_patients: 0, total_billable: 0 },
                                cpt_99458_1: { unique_patients: 0, total_billable: 0 },
                                cpt_99458_2: { unique_patients: 0, total_billable: 0 }
                            }
                        },
                        metadata: {
                            timestamp: new Date().toISOString(),
                            practice_id: practiceId
                        }
                    };
                }

                const result = summaryResults[0];

                const summaryData: CptBillableMetricsSummaryDto = {
                    practice_id: practiceId,
                    total_unique_patients: result.max_unique_patients || 0,
                    total_billable_items: result.total_billable_items || 0,
                    months_with_data: result.months_with_data || 0,
                    latest_month: result.latest_month || '',
                    cpt_code_breakdown: {
                        cpt_99453: {
                            unique_patients: result.total_unique_99453 || 0,
                            total_billable: result.sum_total_99453 || 0
                        },
                        cpt_99454: {
                            unique_patients: result.total_unique_99454 || 0,
                            total_billable: result.sum_total_99454 || 0
                        },
                        cpt_99457: {
                            unique_patients: result.total_unique_99457 || 0,
                            total_billable: result.sum_total_99457 || 0
                        },
                        cpt_99458_1: {
                            unique_patients: result.total_unique_99458_1 || 0,
                            total_billable: result.sum_total_99458_1 || 0
                        },
                        cpt_99458_2: {
                            unique_patients: result.total_unique_99458_2 || 0,
                            total_billable: result.sum_total_99458_2 || 0
                        }
                    }
                };

                return {
                    status: 'success',
                    data: summaryData,
                    metadata: {
                        timestamp: new Date().toISOString(),
                        practice_id: practiceId
                    }
                };

            } finally {
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(`Error fetching CPT billable metrics summary: ${error.message}`);

            if (error instanceof NotFoundException) {
                throw error;
            }

            throw new InternalServerErrorException('Failed to retrieve CPT billable metrics summary');
        }
    }
}