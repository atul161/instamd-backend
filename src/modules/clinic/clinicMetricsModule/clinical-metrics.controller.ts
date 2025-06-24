import {Controller, Get, Inject, Logger, NotFoundException, Param, Query, UseInterceptors} from '@nestjs/common';
import {CACHE_MANAGER, CacheInterceptor, CacheTTL} from '@nestjs/cache-manager';
import {Cache} from 'cache-manager';
import {DatabaseService} from '../../database/database.service';
import {ClinicalService} from "./clinical.service";

const CACHE_TIME = 300000 * 12 * 24
@Controller('clinical-metrics')
export class ClinicalMetricsController {
    private readonly logger = new Logger(ClinicalMetricsController.name);

    constructor(
        private readonly clinicalService: ClinicalService,
        private readonly databaseService: DatabaseService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
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
        // If not in cache, get fresh data
        const result = await this.clinicalService.getClinicalMetrics(practiceId, period, startDate, endDate);


        return result;
    }


    /**
     * Get clinical metrics for a specific practice
     * @param practiceId The ID of the practice
     * @param period Optional enrollment period filter
     * @param startDate Optional start date for filtering data (YYYY-MM-DD)
     * @param endDate Optional end date for filtering data (YYYY-MM-DD)
     */
    @Get(':practiceId/enrollment')
    async getEnrollmentMetrics(
        @Param('practiceId') practiceId: string,
        @Query('period') period?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        if(!practiceId){
            throw new NotFoundException('Invalid practice ID');
        }
        // If not in cache, get fresh data
        const result = await this.clinicalService.getClinicalMetrics(practiceId, period, startDate, endDate);


        return result;
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

        return await this.clinicalService.getPatientsByMetric(
            practiceId,
            metricName,
            period,
            page || 1,
            limit || 50
        );
    }

    @Get(':practiceId/patient/:patientId')
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(CACHE_TIME)
    async getPatientDetails(
        @Param('practiceId') practiceId: string,
        @Param('patientId') patientId?: string,
    ) {
        if (!practiceId) {
            throw new NotFoundException('Invalid practice ID');
        }

        const cacheKey = `patient-details:${practiceId}:${patientId}`;
        const cachedData = await this.cacheManager.get(cacheKey);

        if (cachedData) {
            this.logger.log(`Returning cached patient details for practice: ${practiceId}, patient: ${patientId}`);
            return cachedData;
        }

        console.log(patientId);
        const result = await this.clinicalService.getPatientDetails(
            practiceId,
            patientId,
        );

        await this.cacheManager.set(cacheKey, result,  CACHE_TIME);

        return result;
    }
}
