import { Controller, Get, Param, Query, Logger, NotFoundException, UseInterceptors, Inject } from '@nestjs/common';
import { CacheInterceptor, CacheTTL, CacheKey } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DatabaseService } from '../../database/database.service';
import { ClinicalService } from "./clinical.service";

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
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(CACHE_TIME)
    async getClinicalMetrics(
        @Param('practiceId') practiceId: string,
        @Query('period') period?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        if(!practiceId){
            throw new NotFoundException('Invalid practice ID');
        }

        const cacheKey = `clinical-metrics:${practiceId}:${period || 'all'}:${startDate || 'none'}:${endDate || 'none'}`;

        // Check if data exists in cache
        const cachedData = await this.cacheManager.get(cacheKey);
        if (cachedData) {
            this.logger.log(`Returning cached clinical metrics for practice: ${practiceId}`);
            return cachedData;
        }

        // If not in cache, get fresh data
        const result = await this.clinicalService.getClinicalMetrics(practiceId, period, startDate, endDate);

        // Store in cache
        await this.cacheManager.set(cacheKey, result, 300000); // 5 minutes cache

        return result;
    }

    @Get(':practiceId/patients/:metricName')
    @UseInterceptors(CacheInterceptor)
    @CacheTTL(CACHE_TIME)
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

        const cacheKey = `patients-by-metric:${practiceId}:${metricName}:${period || 'all'}:${page || 1}:${limit || 50}`;
        const cachedData = await this.cacheManager.get(cacheKey);

        if (cachedData) {
            this.logger.log(`Returning cached patients by metric for practice: ${practiceId}, metric: ${metricName}`);
            return cachedData;
        }

        const result = await this.clinicalService.getPatientsByMetric(
            practiceId,
            metricName,
            period,
            page || 1,
            limit || 50
        );

        await this.cacheManager.set(cacheKey, result, 180000);

        return result;
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

        await this.cacheManager.set(cacheKey, result, 300000);

        return result;
    }
}
