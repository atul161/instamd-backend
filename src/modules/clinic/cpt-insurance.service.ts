// cpt-insurance.service.ts
import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import {DatabaseService} from "../database/database.service";
import {
    CptInsuranceMetricsDto,
    CptInsuranceMetricsResponseDto,
    CptInsuranceMetricsSummaryDto,
    CptInsuranceMetricsSummaryResponseDto,
    CptInsuranceTrendDto,
    CptInsuranceTrendResponseDto,
    InsuranceCategoriesResponseDto
} from './clinicMetricsModule/dto/cpt-insurance.dto';

@Injectable()
export class CptInsuranceService {
    private readonly logger = new Logger(CptInsuranceService.name);

    constructor(
        private readonly databaseService: DatabaseService
    ) {}

    async getInsuranceCategories(practiceId: string): Promise<InsuranceCategoriesResponseDto> {
        try {
            this.logger.log(`Fetching insurance categories for practice: ${practiceId}`);

            const instaMDConfig = this.databaseService.getInstaMDConfig();
            if (!instaMDConfig) {
                throw new NotFoundException(`Practice with ID ${practiceId} not found`);
            }

            const dataSource = await this.databaseService.getInstaMdConnection();
            const queryRunner = dataSource.createQueryRunner();

            try {
                const query = `
                    SELECT DISTINCT insurance_category
                    FROM instamd.cpt_billable_with_insurance_metrics_summary
                    WHERE practice_id = ?
                    ORDER BY insurance_category
                `;

                const results = await queryRunner.query(query, [practiceId]);

                const categories = results.map(row => row.insurance_category);

                return {
                    status: 'success',
                    data: categories,
                    metadata: {
                        total_categories: categories.length,
                        practice_id: practiceId,
                        timestamp: new Date().toISOString()
                    }
                };

            } finally {
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(`Error fetching insurance categories: ${error.message}`);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve insurance categories');
        }
    }

    async getCptInsuranceMetrics(
        practiceId: string,
        insuranceCategory?: string,
        monthYear?: string
    ): Promise<CptInsuranceMetricsResponseDto> {
        try {
            this.logger.log(`Fetching CPT insurance metrics for practice: ${practiceId}`);

            const instaMDConfig = this.databaseService.getInstaMDConfig();
            if (!instaMDConfig) {
                throw new NotFoundException(`Practice with ID ${practiceId} not found`);
            }

            const dataSource = await this.databaseService.getInstaMdConnection();
            const queryRunner = dataSource.createQueryRunner();

            try {
                let query = `
                    SELECT * 
                    FROM instamd.cpt_billable_with_insurance_metrics_summary
                    WHERE practice_id = ?
                `;

                const params: any[] = [practiceId];

                if (insuranceCategory) {
                    query += ` AND insurance_category = ?`;
                    params.push(insuranceCategory);
                }

                if (monthYear) {
                    query += ` AND month_year = ?`;
                    params.push(monthYear);
                }

                query += ` ORDER BY year_value DESC, month_start DESC, insurance_category ASC`;

                const results = await queryRunner.query(query, params);

                if (!results || results.length === 0) {
                    return {
                        status: 'success',
                        data: [],
                        metadata: {
                            total_records: 0,
                            practice_id: practiceId,
                            filters: {
                                insurance_category: insuranceCategory,
                                month_year: monthYear
                            },
                            timestamp: new Date().toISOString()
                        }
                    };
                }

                const transformedResults: CptInsuranceMetricsDto[] = results.map(row => ({
                    practice_id: row.practice_id,
                    month_year: row.month_year,
                    insurance_category: row.insurance_category,
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
                    total_unique_patients_in_category: row.total_unique_patients_in_category || 0,
                    calculation_date: row.calculation_date,
                    last_updated: row.last_updated,
                    created: row.created
                }));

                return {
                    status: 'success',
                    data: transformedResults,
                    metadata: {
                        total_records: transformedResults.length,
                        practice_id: practiceId,
                        filters: {
                            insurance_category: insuranceCategory,
                            month_year: monthYear
                        },
                        timestamp: new Date().toISOString()
                    }
                };

            } finally {
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(`Error fetching CPT insurance metrics: ${error.message}`);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve CPT insurance metrics');
        }
    }

    async getInsuranceCategoryTrend(
        practiceId: string,
        insuranceCategory: string
    ): Promise<CptInsuranceTrendResponseDto> {
        try {
            this.logger.log(`Fetching trend for practice: ${practiceId}, category: ${insuranceCategory}`);

            const instaMDConfig = this.databaseService.getInstaMDConfig();
            if (!instaMDConfig) {
                throw new NotFoundException(`Practice with ID ${practiceId} not found`);
            }

            const dataSource = await this.databaseService.getInstaMdConnection();
            const queryRunner = dataSource.createQueryRunner();

            try {
                const query = `
                    SELECT *
                    FROM instamd.cpt_billable_with_insurance_metrics_summary
                    WHERE practice_id = ? AND insurance_category = ?
                    ORDER BY year_value ASC, month_start ASC
                `;

                const params: any[] = [practiceId, insuranceCategory];
                const results = await queryRunner.query(query, params);

                // Always return data structure, even if empty
                const trendData: CptInsuranceTrendDto[] = results.map(row => ({
                    practice_id: row.practice_id,
                    month_year: row.month_year,
                    insurance_category: row.insurance_category,
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
                    total_unique_patients_in_category: row.total_unique_patients_in_category || 0,
                    calculation_date: row.calculation_date,
                    last_updated: row.last_updated,
                    created: row.created
                }));

                return {
                    status: 'success',
                    data: trendData,
                    metadata: {
                        total_records: trendData.length,
                        practice_id: practiceId,
                        insurance_category: insuranceCategory,
                        timestamp: new Date().toISOString()
                    }
                };

            } finally {
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(`Error fetching insurance category trend: ${error.message}`);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve insurance category trend');
        }
    }

    async getCptInsuranceMetricsSummary(
        practiceId: string,
        insuranceCategory?: string
    ): Promise<CptInsuranceMetricsSummaryResponseDto> {
        try {
            this.logger.log(`Fetching CPT insurance metrics summary for practice: ${practiceId}`);

            const instaMDConfig = this.databaseService.getInstaMDConfig();
            if (!instaMDConfig) {
                throw new NotFoundException(`Practice with ID ${practiceId} not found`);
            }

            const dataSource = await this.databaseService.getInstaMdConnection();
            const queryRunner = dataSource.createQueryRunner();

            try {
                let summaryQuery = `
                    SELECT 
                        practice_id,
                        COUNT(DISTINCT insurance_category) as total_insurance_categories,
                        SUM(unique_billable_total_patient_count) as total_unique_patients,
                        SUM(total_billable_rows_count) as total_billable_rows,
                        SUM(total_billable_all_cpt_flags_count) as total_billable_flags,
                        SUM(total_unique_patients_in_category) as total_patients_all_categories,
                        COUNT(DISTINCT month_year) as months_with_data,
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
                    FROM instamd.cpt_billable_with_insurance_metrics_summary
                    WHERE practice_id = ?
                `;

                const params: any[] = [practiceId];

                if (insuranceCategory) {
                    summaryQuery += ` AND insurance_category = ?`;
                    params.push(insuranceCategory);
                }

                summaryQuery += ` GROUP BY practice_id`;

                const summaryResults = await queryRunner.query(summaryQuery, params);

                if (!summaryResults || summaryResults.length === 0) {
                    return {
                        status: 'success',
                        data: {
                            practice_id: practiceId,
                            total_insurance_categories: 0,
                            total_unique_patients: 0,
                            total_billable_rows: 0,
                            total_billable_flags: 0,
                            total_patients_all_categories: 0,
                            months_with_data: 0,
                            latest_month: '',
                            insurance_category_filter: insuranceCategory,
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
                            practice_id: practiceId,
                            insurance_category_filter: insuranceCategory
                        }
                    };
                }

                const result = summaryResults[0];

                const summaryData: CptInsuranceMetricsSummaryDto = {
                    practice_id: practiceId,
                    total_insurance_categories: result.total_insurance_categories || 0,
                    total_unique_patients: result.total_unique_patients || 0,
                    total_billable_rows: result.total_billable_rows || 0,
                    total_billable_flags: result.total_billable_flags || 0,
                    total_patients_all_categories: result.total_patients_all_categories || 0,
                    months_with_data: result.months_with_data || 0,
                    latest_month: result.latest_month || '',
                    insurance_category_filter: insuranceCategory,
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
                        practice_id: practiceId,
                        insurance_category_filter: insuranceCategory
                    }
                };

            } finally {
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(`Error fetching CPT insurance metrics summary: ${error.message}`);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve CPT insurance metrics summary');
        }
    }

    async getLatestCptInsuranceMetrics(
        practiceId: string,
        insuranceCategory?: string
    ): Promise<CptInsuranceMetricsResponseDto> {
        try {
            this.logger.log(`Fetching latest CPT insurance metrics for practice: ${practiceId}`);

            // Get the latest month first
            const allMetrics = await this.getCptInsuranceMetrics(practiceId, insuranceCategory);

            if (!allMetrics.data || allMetrics.data.length === 0) {
                return allMetrics;
            }

            // Get the latest month from the data
            const latestMonth = allMetrics.data[0].month_year;

            // Filter data for the latest month only
            const latestData = allMetrics.data.filter(item => item.month_year === latestMonth);

            return {
                ...allMetrics,
                data: latestData,
                metadata: {
                    ...allMetrics.metadata,
                    total_records: latestData.length,
                    latest_month: latestMonth
                }
            };

        } catch (error) {
            this.logger.error(`Error fetching latest CPT insurance metrics: ${error.message}`);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve latest CPT insurance metrics');
        }
    }

    async compareInsuranceCategories(
        practiceId: string,
        categories: string[],
        monthYear?: string
    ): Promise<CptInsuranceMetricsResponseDto> {
        try {
            this.logger.log(`Comparing insurance categories for practice: ${practiceId}`);

            const instaMDConfig = this.databaseService.getInstaMDConfig();
            if (!instaMDConfig) {
                throw new NotFoundException(`Practice with ID ${practiceId} not found`);
            }

            const dataSource = await this.databaseService.getInstaMdConnection();
            const queryRunner = dataSource.createQueryRunner();

            try {
                let query = `
                    SELECT * 
                    FROM instamd.cpt_billable_with_insurance_metrics_summary
                    WHERE practice_id = ? AND insurance_category IN (${categories.map(() => '?').join(',')})
                `;

                const params: any[] = [practiceId, ...categories];

                if (monthYear) {
                    query += ` AND month_year = ?`;
                    params.push(monthYear);
                }

                query += ` ORDER BY year_value DESC, month_start DESC, insurance_category ASC`;

                const results = await queryRunner.query(query, params);

                if (!results || results.length === 0) {
                    return {
                        status: 'success',
                        data: [],
                        metadata: {
                            total_records: 0,
                            practice_id: practiceId,
                            filters: {
                                insurance_categories: categories,
                                month_year: monthYear
                            },
                            timestamp: new Date().toISOString()
                        }
                    };
                }

                const transformedResults: CptInsuranceMetricsDto[] = results.map(row => ({
                    practice_id: row.practice_id,
                    month_year: row.month_year,
                    insurance_category: row.insurance_category,
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
                    total_unique_patients_in_category: row.total_unique_patients_in_category || 0,
                    calculation_date: row.calculation_date,
                    last_updated: row.last_updated,
                    created: row.created
                }));

                return {
                    status: 'success',
                    data: transformedResults,
                    metadata: {
                        total_records: transformedResults.length,
                        practice_id: practiceId,
                        filters: {
                            insurance_categories: categories,
                            month_year: monthYear
                        },
                        timestamp: new Date().toISOString()
                    }
                };

            } finally {
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(`Error comparing insurance categories: ${error.message}`);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to compare insurance categories');
        }
    }
}
