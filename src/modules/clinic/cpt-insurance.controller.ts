// cpt-insurance.controller.ts
import { Controller, Get, Logger, NotFoundException, Param, Query } from '@nestjs/common';
import {
    CptInsuranceMetricsResponseDto,
    CptInsuranceMetricsSummaryResponseDto,
    CptInsuranceTrendResponseDto,
    InsuranceCategoriesResponseDto
} from "./clinicMetricsModule/dto/cpt-insurance.dto";
import {CptInsuranceService} from "./cpt-insurance.service";

@Controller('cpt-insurance-metrics')
export class CptInsuranceController {
    private readonly logger = new Logger(CptInsuranceController.name);

    constructor(
        private readonly cptInsuranceService: CptInsuranceService
    ) {}

    /**
     * Get list of distinct insurance categories for a practice
     * @param practiceId The ID of the practice
     * @returns List of distinct insurance categories
     */
    @Get(':practiceId/insurance-categories')
    async getInsuranceCategories(
        @Param('practiceId') practiceId: string
    ): Promise<InsuranceCategoriesResponseDto> {
        if (!practiceId) {
            throw new NotFoundException('Invalid practice ID');
        }

        this.logger.log(`Fetching insurance categories for practice: ${practiceId}`);

        return await this.cptInsuranceService.getInsuranceCategories(practiceId);
    }

    /**
     * Get CPT billable metrics with insurance for a specific practice
     * @param practiceId The ID of the practice
     * @param insuranceCategory Optional filter by insurance category
     * @param monthYear Optional filter by month-year (YYYY-MM)
     * @returns CPT billable metrics with insurance data
     */
    @Get(':practiceId')
    async getCptInsuranceMetrics(
        @Param('practiceId') practiceId: string,
        @Query('insuranceCategory') insuranceCategory?: string,
        @Query('monthYear') monthYear?: string
    ): Promise<CptInsuranceMetricsResponseDto> {
        if (!practiceId) {
            throw new NotFoundException('Invalid practice ID');
        }

        this.logger.log(`Fetching CPT insurance metrics for practice: ${practiceId}, category: ${insuranceCategory}, month: ${monthYear}`);

        return await this.cptInsuranceService.getCptInsuranceMetrics(practiceId, insuranceCategory, monthYear);
    }

    /**
     * Get monthly trend for a specific insurance category
     * @param practiceId The ID of the practice
     * @param insuranceCategory The insurance category to analyze (via query param)
     * @returns Monthly trend data for the insurance category
     */
    @Get(':practiceId/trend')
    async getInsuranceCategoryTrend(
        @Param('practiceId') practiceId: string,
        @Query('insuranceCategory') insuranceCategory: string
    ): Promise<CptInsuranceTrendResponseDto> {
        if (!practiceId) {
            throw new NotFoundException('Invalid practice ID');
        }

        if (!insuranceCategory) {
            throw new NotFoundException('Insurance category is required');
        }

        this.logger.log(`Fetching trend for practice: ${practiceId}, category: ${insuranceCategory}`);

        return await this.cptInsuranceService.getInsuranceCategoryTrend(practiceId, insuranceCategory);
    }

    /**
     * Get summary of CPT billable metrics with insurance for a specific practice
     * @param practiceId The ID of the practice
     * @param insuranceCategory Optional filter by insurance category
     * @returns Aggregated summary of CPT billable metrics with insurance
     */
    @Get(':practiceId/summary')
    async getCptInsuranceMetricsSummary(
        @Param('practiceId') practiceId: string,
        @Query('insuranceCategory') insuranceCategory?: string
    ): Promise<CptInsuranceMetricsSummaryResponseDto> {
        if (!practiceId) {
            throw new NotFoundException('Invalid practice ID');
        }

        this.logger.log(`Fetching CPT insurance metrics summary for practice: ${practiceId}, category: ${insuranceCategory}`);

        return await this.cptInsuranceService.getCptInsuranceMetricsSummary(practiceId, insuranceCategory);
    }

    /**
     * Get latest CPT billable metrics with insurance for a specific practice
     * @param practiceId The ID of the practice
     * @param insuranceCategory Optional filter by insurance category
     * @returns Latest month's CPT billable metrics with insurance
     */
    @Get(':practiceId/latest')
    async getLatestCptInsuranceMetrics(
        @Param('practiceId') practiceId: string,
        @Query('insuranceCategory') insuranceCategory?: string
    ): Promise<CptInsuranceMetricsResponseDto> {
        if (!practiceId) {
            throw new NotFoundException('Invalid practice ID');
        }

        this.logger.log(`Fetching latest CPT insurance metrics for practice: ${practiceId}, category: ${insuranceCategory}`);

        return await this.cptInsuranceService.getLatestCptInsuranceMetrics(practiceId, insuranceCategory);
    }

    /**
     * Get comparison between multiple insurance categories
     * @param practiceId The ID of the practice
     * @param categories Comma-separated list of insurance categories to compare
     * @param monthYear Optional filter by month-year (YYYY-MM)
     * @returns Comparison data between insurance categories
     */
    @Get(':practiceId/compare')
    async compareInsuranceCategories(
        @Param('practiceId') practiceId: string,
        @Query('categories') categories: string,
        @Query('monthYear') monthYear?: string
    ): Promise<CptInsuranceMetricsResponseDto> {
        if (!practiceId) {
            throw new NotFoundException('Invalid practice ID');
        }

        if (!categories) {
            throw new NotFoundException('Insurance categories are required for comparison');
        }

        const categoryList = categories.split(',').map(cat => cat.trim());

        this.logger.log(`Comparing insurance categories for practice: ${practiceId}, categories: ${categoryList.join(', ')}, month: ${monthYear}`);

        return await this.cptInsuranceService.compareInsuranceCategories(practiceId, categoryList, monthYear);
    }
}
