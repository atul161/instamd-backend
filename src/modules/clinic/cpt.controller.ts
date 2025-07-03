// cpt.controller.ts
import { Controller, Get, Logger, NotFoundException, Param } from '@nestjs/common';
import {CptService} from "./clinicMetricsModule/cpt.service";
import {CptBillableMetricsResponseDto, CptBillableMetricsSummaryResponseDto} from "./clinicMetricsModule/dto/cpt.dto";

@Controller('cpt-metrics')
export class CptController {
    private readonly logger = new Logger(CptController.name);

    constructor(
        private readonly cptService: CptService
    ) {}

    /**
     * Get CPT billable metrics for a specific practice (all 12 months)
     * @param practiceId The ID of the practice
     * @returns All CPT billable metrics data for the practice
     */
    @Get(':practiceId')
    async getCptBillableMetrics(
        @Param('practiceId') practiceId: string
    ): Promise<CptBillableMetricsResponseDto> {
        if (!practiceId) {
            throw new NotFoundException('Invalid practice ID');
        }

        this.logger.log(`Fetching CPT billable metrics for practice: ${practiceId}`);

        return await this.cptService.getCptBillableMetrics(practiceId);
    }

    /**
     * Get CPT billable metrics summary for a specific practice
     * @param practiceId The ID of the practice
     * @returns Aggregated CPT billable metrics summary
     */
    @Get(':practiceId/summary')
    async getCptBillableMetricsSummary(
        @Param('practiceId') practiceId: string
    ): Promise<CptBillableMetricsSummaryResponseDto> {
        if (!practiceId) {
            throw new NotFoundException('Invalid practice ID');
        }

        this.logger.log(`Fetching CPT billable metrics summary for practice: ${practiceId}`);

        return await this.cptService.getCptBillableMetricsSummary(practiceId);
    }

    /**
     * Get latest CPT billable metrics for a specific practice
     * @param practiceId The ID of the practice
     * @returns Latest month's CPT billable metrics
     */
    @Get(':practiceId/latest')
    async getLatestCptBillableMetrics(
        @Param('practiceId') practiceId: string
    ): Promise<CptBillableMetricsResponseDto> {
        if (!practiceId) {
            throw new NotFoundException('Invalid practice ID');
        }

        this.logger.log(`Fetching latest CPT billable metrics for practice: ${practiceId}`);

        // Get all metrics and return only the latest one
        const allMetrics = await this.cptService.getCptBillableMetrics(practiceId);

        // Return only the first (most recent) record
        return {
            ...allMetrics,
            data: allMetrics.data.slice(0, 1),
            metadata: {
                ...allMetrics.metadata,
                total_records: allMetrics.data.length > 0 ? 1 : 0
            }
        };
    }
}