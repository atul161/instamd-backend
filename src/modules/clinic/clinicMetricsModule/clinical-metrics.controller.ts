import { Controller, Get, Param, Query, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {ClinicalService} from "./clinical.service";

@Controller('clinical-metrics')
export class ClinicalMetricsController {
    private readonly logger = new Logger(ClinicalMetricsController.name);

    constructor(
        private readonly clinicalService: ClinicalService,
        private readonly databaseService: DatabaseService
    ) {}


    /**
     * Get clinical metrics for a specific practice
     * @param practiceId The ID of the practice
     * @param period Optional enrollment period filter
     * @param startDate Optional start date for filtering data (YYYY-MM-DD)
     * @param endDate Optional end date for filtering data (YYYY-MM-DD)
     */
    @Get(':practiceId')
    async getClinicalMetrics(
        @Param('practiceId') practiceId: string,
        @Query('period') period?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        if(!practiceId){
            throw new NotFoundException('Invalid practice ID');
        }
      return await this.clinicalService.getClinicalMetrics(practiceId,period,startDate,endDate);
    }

    @Get(':practiceId/patients/:metricName')
    async getPatientsByMetric(
        @Param('practiceId') practiceId: string,
        @Param('metricName') metricName: string,
        @Query('period') period?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number
    ) {
        if (!practiceId) {
            throw new NotFoundException('Invalid practice ID');
        }

        return this.clinicalService.getPatientsByMetric(
            practiceId,
            metricName,
            period,
            page || 1,
            limit || 50
        );
    }

}
