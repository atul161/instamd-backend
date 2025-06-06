import {Inject, Injectable, Logger} from '@nestjs/common';
import {Cron, CronExpression} from '@nestjs/schedule';
import {DatabaseService} from '../../database/database.service';
import * as moment from 'moment';

import {
    AlertMetrics,
    BpMetrics,
    DeviceDataTransmission,
    DeviceReading,
    GlucoseMetrics,
    OximeterMetrics,
    WeightMetrics
} from "./interface/clinical-metrics.interface";
import {practiceList} from '../patientEnrollmentModule/interface/enrollment-period.interface';

@Injectable()
export class ClinicalMetricsEtlService {
    private readonly logger = new Logger(ClinicalMetricsEtlService.name);
    private readonly CHUNK_SIZE = 500; // Adjust based on database performance

    // Constants for clinical thresholds
    private readonly NORMAL_BP_RANGES = {
        sys_min: 90,
        sys_max: 130,
        dia_min: 60,
        dia_max: 80,
        hr_min: 60,
        hr_max: 100
    };

    private readonly SPO2_RANGES = {
        normal: 93,          // >= 93% is normal
        moderate_low_min: 90, // 90-92% is moderate low
        moderate_low_max: 92,
        low_min: 88,         // 88-89% is low
        low_max: 89,
        critical_low: 88     // < 88% is critical
    };

    private readonly GLUCOSE_RANGES = {
        fasting: {
            normal_max: 130,
            high_min: 130,
            high_max: 160,
            very_high_min: 160,
            critical_min: 180,
            low_max: 70,
            severe_low_max: 54
        },
        post_meal: {
            normal_max: 180,
            high_min: 180,
            critical_min: 200
        },
        random: {
            normal_max: 200,
            high_min: 200,
            low_max: 70
        }
    };

    private readonly WEIGHT_CHANGE_THRESHOLD = 4.0; // % change to consider significant

    // Regex patterns for parsing device data
    private readonly BP_SYS_REGEX = /"sysData"\s*:\s*(\d+\.?\d*)/;
    private readonly BP_DIA_REGEX = /"diaData"\s*:\s*(\d+\.?\d*)/;
    private readonly BP_HR_REGEX = /"pulseData"\s*:\s*(\d+\.?\d*)/;
    private readonly BP_ARR_REGEX = /"arrhythmia"\s*:\s*(\d+)/;
    private readonly BP_IHB_REGEX = /"ihb"\s*:\s*(true|false)/i;

    private readonly SPO2_REGEX = /"spo2"\s*:\s*"?(\d+\.?\d*)"?/;
    private readonly SPO2_PR_REGEX = /"pr"\s*:\s*"?(\d+\.?\d*)"?/;

    private readonly WEIGHT_REGEX = /"weight"\s*:\s*(\d+\.?\d*)/;
    private readonly HEIGHT_REGEX = /"height"\s*:\s*(\d+\.?\d*)/;
    private readonly BMI_REGEX = /"bmi"\s*:\s*(\d+\.?\d*)/;

    private readonly GLUCOSE_REGEX = /"bloodGlucose"\s*:\s*"?(\d+\.?\d*)"?/;
    private readonly TYPE_REGEX = /"type"\s*:\s*"([^"]*)"/;

    constructor(
        @Inject()
        private databaseService: DatabaseService,
    ) {
    }

    /**
     * Main cron job that runs daily to update clinical metrics
     */
    @Cron(CronExpression.EVERY_6_HOURS)
    async runDailyClinicalMetricsUpdate() {
        const startTime = new Date();
        this.logger.log(`===== STARTING CLINICAL METRICS ETL at ${startTime} =====`);
        const practiceId = practiceList[0].practiceId;

        try {
            // Ensure the summary table exists
            await this.createClinicalMetricsTableIfNotExists(practiceId);

            // Get current date for the summary
            const summaryDate = moment().format('YYYY-MM-DD');

            // Get all practices
            const practices = await this.getDistinctPractices();
            this.logger.log(`Found ${practices.length} practices to process`);

            // Enrollment periods to process
            const enrollmentPeriods = ['first_month', '1_3_months', '4_6_months', '6_12_months', 'overall'];

            // Process each practice and enrollment period
            for (const practice of practices) {
                const practiceId = practice.practice_id;
                this.logger.log(`Processing practice: ${practiceId}`);

                // Process each enrollment period
                for (const periodName of enrollmentPeriods) {
                    this.logger.log(`Processing enrollment period: ${periodName}`);

                    // Get patients in this practice and enrollment period
                    const patients = await this.getPatientsByPracticeAndEnrollmentPeriod(practiceId, periodName);

                    if (!patients || patients.length === 0) {
                        this.logger.log(`No patients found for practice ${practiceId} in period ${periodName}`);
                        continue;
                    }

                    this.logger.log(`Found ${patients.length} patients for practice ${practiceId} in period ${periodName}`);

                    // Get appropriate date range for this enrollment period
                    const {startDate, endDate} = this.getAppropriateDateRange(periodName);
                    this.logger.log(`Using date range: ${startDate} to ${endDate} for period ${periodName}`);

                    // Get data for each device type
                    const bpReadings = await this.getDeviceDataForPatients(patients, ' BPM', startDate, endDate , practiceId);
                    const oximeterReadings = await this.getDeviceDataForPatients(patients, ' Oxymeter', startDate, endDate , practiceId);
                    const weightReadings = await this.getDeviceDataForPatients(patients, ' Weight', startDate, endDate , practiceId);
                    const glucoseReadings = await this.getDeviceDataForPatients(patients, ' Blood Glucose', startDate, endDate , practiceId);;

                    // Process device data
                    const bpMetrics = this.processBloodPressureData(bpReadings , practiceId);
                    const oximeterMetrics = this.processOximeterData(oximeterReadings , practiceId);
                    const weightMetrics = await this.processWeightData(weightReadings, patients , practiceId);
                    const glucoseMetrics = this.processGlucoseData(glucoseReadings , practiceId);
                    const alertMetrics = await this.getAlertMetrics(patients, startDate, endDate , practiceId);

                    // Store metrics in database
                    await this.storeClinicalMetrics(
                        summaryDate,
                        practiceId,
                        periodName,
                        bpMetrics,
                        oximeterMetrics,
                        weightMetrics,
                        glucoseMetrics,
                        alertMetrics
                    );
                }
            }

            const endTime = new Date();
            const executionTime = endTime.getTime() - startTime.getTime();
            this.logger.log(`===== CLINICAL METRICS ETL COMPLETED SUCCESSFULLY =====`);
            this.logger.log(`Total execution time: ${executionTime}ms`);

        } catch (error) {
            this.logger.error(`A fatal error occurred during execution: ${error.message}`);
            this.logger.error(error.stack);

            const endTime = new Date();
            const executionTime = endTime.getTime() - startTime.getTime();
            this.logger.error(`Script failed after running for ${executionTime}ms`);
        }
    }

    /**
     * Creates the clinical_metrics_summary table if it doesn't exist
     * Added patient count columns for each metric
     */
    private async createClinicalMetricsTableIfNotExists(practiceId: string): Promise<void> {
        try {
            // Use the default connection
            const dataSource = await this.databaseService.getConnection(practiceId);
            const queryRunner = dataSource.createQueryRunner();

            try {
                // Check if the table exists
                const tableExists = await queryRunner.hasTable('clinical_metrics_summary');

                if (!tableExists) {
                    // Create the table if it doesn't exist - MySQL syntax
                    await queryRunner.query(`
                        CREATE TABLE clinical_metrics_summary
                        (
                            id                                 INT AUTO_INCREMENT PRIMARY KEY,
                            summary_date                       DATE         NOT NULL,
                            practice_id                        VARCHAR(200) NOT NULL,
                            enrollment_period                  VARCHAR(50)  NOT NULL,
                            total_patients                     INT           DEFAULT 0,

                            -- Blood Pressure Metrics
                            bp_total_readings                  INT           DEFAULT 0,
                            -- todo
                            bp_patients_count                  INT           DEFAULT 0,
                            bp_abnormal_count                  INT           DEFAULT 0,
                            bp_abnormal_percent                DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            bp_abnormal_patients_count         INT           DEFAULT 0,
                            bp_avg_sys                         DECIMAL(5, 2) DEFAULT 0,
                            bp_avg_dia                         DECIMAL(5, 2) DEFAULT 0,
                            bp_avg_hr                          DECIMAL(5, 2) DEFAULT 0,
                            bp_arrhythmia_count                INT           DEFAULT 0,
                            bp_arrhythmia_percent              DECIMAL(5, 2) DEFAULT 0,
                            -- todo 
                            bp_arrhythmia_patients_count       INT           DEFAULT 0,

                            -- Normal Blood Pressure Metrics
                            bp_normal_count                    INT           DEFAULT 0,
                            bp_normal_percent                  DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            bp_normal_patients_count           INT           DEFAULT 0,
                            bp_normal_avg_sys                  DECIMAL(5, 2) DEFAULT 0,
                            bp_normal_avg_dia                  DECIMAL(5, 2) DEFAULT 0,
                            bp_normal_avg_hr                   DECIMAL(5, 2) DEFAULT 0,

                            -- New BP Threshold Metrics
                            bp_sys_gt_130_dia_gt_80_count      INT           DEFAULT 0,
                            bp_sys_gt_130_dia_gt_80_percent    DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            bp_sys_gt_130_dia_gt_80_patients   INT           DEFAULT 0,
                            bp_sys_gt_140_dia_gt_80_count      INT           DEFAULT 0,
                            bp_sys_gt_140_dia_gt_80_percent    DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            bp_sys_gt_140_dia_gt_80_patients   INT           DEFAULT 0,
                            bp_sys_gt_150_dia_gt_80_count      INT           DEFAULT 0,
                            bp_sys_gt_150_dia_gt_80_percent    DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            bp_sys_gt_150_dia_gt_80_patients   INT           DEFAULT 0,
                            bp_sys_gt_160_dia_gt_80_count      INT           DEFAULT 0,
                            bp_sys_gt_160_dia_gt_80_percent    DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            bp_sys_gt_160_dia_gt_80_patients   INT           DEFAULT 0,
                            bp_sys_lt_90_dia_lt_60_count       INT           DEFAULT 0,
                            bp_sys_lt_90_dia_lt_60_percent     DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            bp_sys_lt_90_dia_lt_60_patients    INT           DEFAULT 0,
                            bp_hr_abnormal_count               INT           DEFAULT 0,
                            bp_hr_abnormal_percent             DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            bp_hr_abnormal_patients_count      INT           DEFAULT 0,

                            -- Pulse Oximeter Metrics
                            spo2_total_readings                INT           DEFAULT 0,
                            -- todo
                            spo2_patients_count                INT           DEFAULT 0,
                            spo2_90_92_count                   INT           DEFAULT 0,
                            spo2_90_92_percent                 DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            spo2_90_92_patients_count          INT           DEFAULT 0,
                            spo2_88_89_count                   INT           DEFAULT 0,
                            spo2_88_89_percent                 DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            spo2_88_89_patients_count          INT           DEFAULT 0,
                            spo2_below_88_count                INT           DEFAULT 0,
                            spo2_below_88_percent              DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            spo2_below_88_patients_count       INT           DEFAULT 0,

                            -- Weight Metrics
                            weight_total_readings              INT           DEFAULT 0,
                            weight_patients_count              INT           DEFAULT 0,
                            weight_gain_4pct_count             INT           DEFAULT 0,
                            weight_gain_4pct_percent           DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            weight_gain_4pct_patients_count    INT           DEFAULT 0,

                            -- Glucose Metrics - Fasting
                            glucose_fasting_total              INT           DEFAULT 0,
                            glucose_fasting_patients_count     INT           DEFAULT 0,
                            glucose_fasting_above_130_count    INT           DEFAULT 0,
                            glucose_fasting_above_130_percent  DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            glucose_fasting_above_130_patients INT           DEFAULT 0,
                            glucose_fasting_above_160_count    INT           DEFAULT 0,
                            glucose_fasting_above_160_percent  DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            glucose_fasting_above_160_patients INT           DEFAULT 0,
                            glucose_fasting_above_180_count    INT           DEFAULT 0,
                            glucose_fasting_above_180_percent  DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            glucose_fasting_above_180_patients INT           DEFAULT 0,
                            glucose_fasting_below_70_count     INT           DEFAULT 0,
                            glucose_fasting_below_70_percent   DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            glucose_fasting_below_70_patients  INT           DEFAULT 0,
                            glucose_fasting_below_54_count     INT           DEFAULT 0,
                            glucose_fasting_below_54_percent   DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            glucose_fasting_below_54_patients  INT           DEFAULT 0,

                            -- Glucose Metrics - Post Meal
                            glucose_postmeal_total             INT           DEFAULT 0,
                            -- todo
                            glucose_postmeal_patients_count    INT           DEFAULT 0,
                            glucose_postmeal_above_180_count   INT           DEFAULT 0,
                            glucose_postmeal_above_180_percent DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            glucose_postmeal_above_180_patients INT          DEFAULT 0,
                            glucose_postmeal_above_200_count   INT           DEFAULT 0,
                            glucose_postmeal_above_200_percent DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            glucose_postmeal_above_200_patients INT          DEFAULT 0,

                            -- Glucose Metrics - Random
                            glucose_random_total               INT           DEFAULT 0,
                            -- todo
                            glucose_random_patients_count      INT           DEFAULT 0,
                            glucose_random_above_200_count     INT           DEFAULT 0,
                            glucose_random_above_200_percent   DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            glucose_random_above_200_patients  INT           DEFAULT 0,
                            glucose_random_below_70_count      INT           DEFAULT 0,
                            glucose_random_below_70_percent    DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            glucose_random_below_70_patients   INT           DEFAULT 0,

                            -- Alert Metrics
                            critical_alerts_count              INT           DEFAULT 0,
                            critical_alerts_percent            DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            critical_alerts_patients_count     INT           DEFAULT 0,
                            escalations_count                  INT           DEFAULT 0,
                            escalations_percent                DECIMAL(5, 2) DEFAULT 0,
                            -- todo
                            escalations_patients_count         INT           DEFAULT 0,

                            created_at                         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
                            updated_at                         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                            INDEX idx_practice_id (practice_id),
                            INDEX idx_summary_date (summary_date),
                            INDEX idx_enrollment_period (enrollment_period),
                            UNIQUE INDEX idx_practice_period_date (practice_id, enrollment_period, summary_date)
                        ) ENGINE = InnoDB
                          DEFAULT CHARSET = utf8mb4
                          COLLATE = utf8mb4_unicode_ci;
                    `);

                    this.logger.log("Created clinical_metrics_summary table");
                } else {
                    this.logger.log("clinical_metrics_summary table already exists");
                }
            } finally {
                // Release the query runner
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(`Error creating/updating clinical metrics table: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get distinct practices from the database
     */
    private async getDistinctPractices(): Promise<{ practice_id: string }[]> {
        return practiceList.map(practice => ({
            practice_id: practice.practiceId
        }));
    }

    /**
     * Get patients by practice and enrollment period
     */
    private async getPatientsByPracticeAndEnrollmentPeriod(
        practiceId: string,
        enrollmentPeriodName: string
    ): Promise<string[]> {
        try {
            const dataSource = await this.databaseService.getConnection(practiceId);
            const queryRunner = dataSource.createQueryRunner();

            try {
                const result = await queryRunner.query(`
                    SELECT replace(patient_sub, '-', '_') as patient_sub
                    FROM patient_enrollment_periods
                    WHERE practice_id = ?
                      AND enrollment_period = ?
                `, [practiceId, enrollmentPeriodName]);

                return result.map(row => row?.patient_sub);
            } finally {
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(
                `Error retrieving patients for practice ${practiceId} in period ${enrollmentPeriodName}: ${error.message}`
            );
            throw error;
        }
    }

    /**
     * Determines the appropriate date range for device data based on the enrollment period
     */
    private getAppropriateDateRange(enrollmentPeriod: string): { startDate: Date, endDate: Date } {
        const currentDate = new Date();
        let startDate: Date;
        let endDate: Date;

        if (enrollmentPeriod === 'first_month') {
            // 0-30 days
            endDate = currentDate;
            startDate = new Date(currentDate);
            startDate.setDate(currentDate.getDate() - 30);
        } else if (enrollmentPeriod === '1_3_months') {
            // 31-90 days
            endDate = new Date(currentDate);
            endDate.setDate(currentDate.getDate() - 30);
            startDate = new Date(currentDate);
            startDate.setDate(currentDate.getDate() - 90);
        } else if (enrollmentPeriod === '4_6_months') {
            // 91-180 days
            endDate = new Date(currentDate);
            endDate.setDate(currentDate.getDate() - 90);
            startDate = new Date(currentDate);
            startDate.setDate(currentDate.getDate() - 180);
        } else if (enrollmentPeriod === '6_12_months') {
            // 181-365 days
            endDate = new Date(currentDate);
            endDate.setDate(currentDate.getDate() - 180);
            startDate = new Date(currentDate);
            startDate.setDate(currentDate.getDate() - 365);
        } else {
            // 'overall' - All data up to 5 years
            endDate = currentDate;
            startDate = new Date(currentDate);
            startDate.setDate(currentDate.getDate() - 730 * 5); // 10 years
        }

        return {startDate, endDate};
    }

    /**
     * Split a list into smaller chunks of specified size
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const result = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            result.push(array.slice(i, i + chunkSize));
        }
        return result;
    }

    /**
     * Get device data for a list of patients within a date range
     */
    /**
     * Get device data for a list of patients within a date range
     */
    private async getDeviceDataForPatients(
        patientIds: string[],
        deviceName: string,
        startDate?: Date,
        endDate?: Date,
        practiceId?: string
    ): Promise<DeviceDataTransmission[]> {
        if (!patientIds || patientIds.length === 0) {
            return [];
        }

        const allResults: DeviceReading[] = [];

        // Split patient_ids into manageable chunks
        const patientChunks = this.chunkArray(patientIds, this.CHUNK_SIZE);
        this.logger.log(`${deviceName}: Processing ${patientIds.length} patients in ${patientChunks.length} chunks of size ${this.CHUNK_SIZE}`);

        try {
            const dataSource = await this.databaseService.getConnection(practiceId);

            // Process each chunk of patient IDs
            for (let i = 0; i < patientChunks.length; i++) {
                const chunk = patientChunks[i];
                this.logger.debug(`Processing chunk ${i + 1}/${patientChunks.length} with ${chunk.length} patients`);

                // Build placeholders for the IN clause
                const placeholders = chunk.map(() => '?').join(',');

                // Construct the query with the placeholders
                let query = `
                    SELECT id,
                           patient_sub,
                           device_name,
                           detailed_value,
                           timestamp,
                           manual_entry,
                           entry_type,
                           critical_alert
                    FROM device_data_transmission
                    WHERE trim(patient_sub) IN (${placeholders})
                      AND device_name = ?
                `;

                // Add date conditions if provided
                const params = [...chunk, deviceName];
                if (startDate) {
                    query += " AND timestamp >= ?";
                    params.push(startDate.toISOString());
                }
                if (endDate) {
                    query += " AND timestamp <= ?";
                    params.push(endDate.toISOString());
                }

                // Add order by timestamp descending
                query += " ORDER BY timestamp DESC";

                const queryRunner = dataSource.createQueryRunner();
                try {
                    const chunkResults = await queryRunner.query(query, params);
                    allResults.push(...chunkResults);
                    this.logger.debug(`Retrieved ${chunkResults.length} readings for chunk ${i + 1}`);
                } finally {
                    await queryRunner.release();
                }
            }

            return allResults;
        } catch (error) {
            this.logger.error(`Error retrieving ${deviceName} data: ${error.message}`);
            throw error;
        }
    }

    /**
     * Parse blood pressure reading values from the detailed_value string
     */
    private parseBpValue(detailedValue: string): { sys: number, dia: number, hr: number, arrhythmia: number } {
        if (!detailedValue || typeof detailedValue !== 'string') {
            return {sys: 0, dia: 0, hr: 0, arrhythmia: 0};
        }

        const result = {sys: 0, dia: 0, hr: 0, arrhythmia: 0};

        // Extract values with regex
        const sysMatch = detailedValue.match(this.BP_SYS_REGEX);
        if (sysMatch) {
            result.sys = parseFloat(sysMatch[1]);
        }

        const diaMatch = detailedValue.match(this.BP_DIA_REGEX);
        if (diaMatch) {
            result.dia = parseFloat(diaMatch[1]);
        }

        const hrMatch = detailedValue.match(this.BP_HR_REGEX);
        if (hrMatch) {
            result.hr = parseFloat(hrMatch[1]);
        }

        // Check for arrhythmia - handles both data formats
        const arrMatch = detailedValue.match(this.BP_ARR_REGEX);
        if (arrMatch) {
            result.arrhythmia = parseInt(arrMatch[1], 10);
        } else {
            const ihbMatch = detailedValue.match(this.BP_IHB_REGEX);
            if (ihbMatch) {
                result.arrhythmia = ihbMatch[1].toLowerCase() === 'true' ? 1 : 0;
            }
        }

        return result;
    }

    /**
     * Process blood pressure readings to calculate summary metrics
     */
    private processBloodPressureData(readings: DeviceReading[] , practiceId: string): BpMetrics {
        if (!readings || readings.length === 0) {
            return {
                total: 0,
                abnormal_count: 0,
                abnormal_percent: 0,
                avg_sys: 0,
                avg_dia: 0,
                avg_hr: 0,
                arrhythmia_count: 0,
                arrhythmia_percent: 0,
                normal_count: 0,
                normal_percent: 0,
                normal_avg_sys: 0,
                normal_avg_dia: 0,
                normal_avg_hr: 0,
                sys_gt_130_dia_gt_80_count: 0,
                sys_gt_130_dia_gt_80_percent: 0,
                sys_gt_140_dia_gt_80_count: 0,
                sys_gt_140_dia_gt_80_percent: 0,
                sys_gt_150_dia_gt_80_count: 0,
                sys_gt_150_dia_gt_80_percent: 0,
                sys_gt_160_dia_gt_80_count: 0,
                sys_gt_160_dia_gt_80_percent: 0,
                sys_lt_90_dia_lt_60_count: 0,
                sys_lt_90_dia_lt_60_percent: 0,
                hr_abnormal_count: 0,
                hr_abnormal_percent: 0
            };
        }

        const totalReadings = readings.length;
        let abnormalReadings = 0;
        let arrhythmiaCount = 0;

        // New counters for additional BP thresholds
        let sysGt130DiaGt80Count = 0;
        let sysGt140DiaGt80Count = 0;
        let sysGt150DiaGt80Count = 0;
        let sysGt160DiaGt80Count = 0;
        let sysLt90DiaLt60Count = 0;
        let hrAbnormalCount = 0;

        const allSysValues: number[] = [];
        const allDiaValues: number[] = [];
        const allHrValues: number[] = [];

        const normalSysValues: number[] = [];
        const normalDiaValues: number[] = [];
        const normalHrValues: number[] = [];

        for (const reading of readings) {
            if (!reading.detailed_value) {
                continue;
            }

            try {
                const metaDict = this.parseBpValue(reading.detailed_value);

                // Extract values
                const sys = metaDict.sys;
                const dia = metaDict.dia;
                const hr = metaDict.hr;
                const arrhythmia = metaDict.arrhythmia;

                if (arrhythmia === 1) {
                    arrhythmiaCount++;
                }

                // Add to all readings collections
                if (sys > 0) {
                    allSysValues.push(sys);
                }
                if (dia > 0) {
                    allDiaValues.push(dia);
                }
                if (hr > 0) {
                    allHrValues.push(hr);
                }

                // Check if reading is normal
                const isNormal = (
                    this.NORMAL_BP_RANGES.sys_min <= sys && sys <= this.NORMAL_BP_RANGES.sys_max &&
                    this.NORMAL_BP_RANGES.dia_min <= dia && dia <= this.NORMAL_BP_RANGES.dia_max &&
                    this.NORMAL_BP_RANGES.hr_min <= hr && hr <= this.NORMAL_BP_RANGES.hr_max
                );

                if (isNormal) {
                    normalSysValues.push(sys);
                    normalDiaValues.push(dia);
                    normalHrValues.push(hr);
                } else {
                    abnormalReadings++;
                }

                // Check for new BP threshold conditions
                if (sys > 130 && dia > 80) {
                    sysGt130DiaGt80Count++;
                }

                if (sys > 140 && dia > 80) {
                    sysGt140DiaGt80Count++;
                }

                if (sys > 150 && dia > 80) {
                    sysGt150DiaGt80Count++;
                }

                if (sys > 160 && dia > 80) {
                    sysGt160DiaGt80Count++;
                }

                if (sys < 90 && dia < 60) {
                    sysLt90DiaLt60Count++;
                }

                if (hr < 50 || hr > 120) {
                    hrAbnormalCount++;
                }
            } catch (error) {
                this.logger.warn(`Error processing BP reading ${reading.id}: ${error.message}`);
                continue;
            }
        }

        // Calculate averages
        const avgSys = allSysValues.length > 0 ? allSysValues.reduce((a, b) => a + b, 0) / allSysValues.length : 0;
        const avgDia = allDiaValues.length > 0 ? allDiaValues.reduce((a, b) => a + b, 0) / allDiaValues.length : 0;
        const avgHr = allHrValues.length > 0 ? allHrValues.reduce((a, b) => a + b, 0) / allHrValues.length : 0;

        const normalAvgSys = normalSysValues.length > 0 ? normalSysValues.reduce((a, b) => a + b, 0) / normalSysValues.length : 0;
        const normalAvgDia = normalDiaValues.length > 0 ? normalDiaValues.reduce((a, b) => a + b, 0) / normalDiaValues.length : 0;
        const normalAvgHr = normalHrValues.length > 0 ? normalHrValues.reduce((a, b) => a + b, 0) / normalHrValues.length : 0;

        const normalCount = totalReadings - abnormalReadings;

        // Calculate percentages
        const abnormalPercent = totalReadings > 0 ? (abnormalReadings / totalReadings * 100) : 0;
        const normalPercent = totalReadings > 0 ? (normalCount / totalReadings * 100) : 0;
        const arrhythmiaPercent = totalReadings > 0 ? (arrhythmiaCount / totalReadings * 100) : 0;

        // Calculate new BP threshold percentages
        const sysGt130DiaGt80Percent = totalReadings > 0 ? (sysGt130DiaGt80Count / totalReadings * 100) : 0;
        const sysGt140DiaGt80Percent = totalReadings > 0 ? (sysGt140DiaGt80Count / totalReadings * 100) : 0;
        const sysGt150DiaGt80Percent = totalReadings > 0 ? (sysGt150DiaGt80Count / totalReadings * 100) : 0;
        const sysGt160DiaGt80Percent = totalReadings > 0 ? (sysGt160DiaGt80Count / totalReadings * 100) : 0;
        const sysLt90DiaLt60Percent = totalReadings > 0 ? (sysLt90DiaLt60Count / totalReadings * 100) : 0;
        const hrAbnormalPercent = totalReadings > 0 ? (hrAbnormalCount / totalReadings * 100) : 0;

        return {
            total: totalReadings,
            abnormal_count: abnormalReadings,
            abnormal_percent: parseFloat(abnormalPercent.toFixed(2)),
            avg_sys: parseFloat(avgSys.toFixed(2)),
            avg_dia: parseFloat(avgDia.toFixed(2)),
            avg_hr: parseFloat(avgHr.toFixed(2)),
            arrhythmia_count: arrhythmiaCount,
            arrhythmia_percent: parseFloat(arrhythmiaPercent.toFixed(2)),
            normal_count: normalCount,
            normal_percent: parseFloat(normalPercent.toFixed(2)),
            normal_avg_sys: parseFloat(normalAvgSys.toFixed(2)),
            normal_avg_dia: parseFloat(normalAvgDia.toFixed(2)),
            normal_avg_hr: parseFloat(normalAvgHr.toFixed(2)),
            // New BP threshold metrics
            sys_gt_130_dia_gt_80_count: sysGt130DiaGt80Count,
            sys_gt_130_dia_gt_80_percent: parseFloat(sysGt130DiaGt80Percent.toFixed(2)),
            sys_gt_140_dia_gt_80_count: sysGt140DiaGt80Count,
            sys_gt_140_dia_gt_80_percent: parseFloat(sysGt140DiaGt80Percent.toFixed(2)),
            sys_gt_150_dia_gt_80_count: sysGt150DiaGt80Count,
            sys_gt_150_dia_gt_80_percent: parseFloat(sysGt150DiaGt80Percent.toFixed(2)),
            sys_gt_160_dia_gt_80_count: sysGt160DiaGt80Count,
            sys_gt_160_dia_gt_80_percent: parseFloat(sysGt160DiaGt80Percent.toFixed(2)),
            sys_lt_90_dia_lt_60_count: sysLt90DiaLt60Count,
            sys_lt_90_dia_lt_60_percent: parseFloat(sysLt90DiaLt60Percent.toFixed(2)),
            hr_abnormal_count: hrAbnormalCount,
            hr_abnormal_percent: parseFloat(hrAbnormalPercent.toFixed(2))
        };
    }

    /**
     * Parse SpO2 reading value from the detailed_value string
     */
    private parseSpo2Value(detailedValue: string): { spo2: number, pr: number } {
        if (!detailedValue || typeof detailedValue !== 'string') {
            return {spo2: 0, pr: 0};
        }

        const result = {spo2: 0, pr: 0};

        // Extract SpO2 value
        const spo2Match = detailedValue.match(this.SPO2_REGEX);
        if (spo2Match) {
            result.spo2 = parseFloat(spo2Match[1]);
        }

        // Extract pulse rate
        const prMatch = detailedValue.match(this.SPO2_PR_REGEX);
        if (prMatch) {
            result.pr = parseFloat(prMatch[1]);
        }

        return result;
    }

    /**
     * Process pulse oximeter readings to calculate summary metrics
     */
    private processOximeterData(readings: DeviceReading[] , practiceId: string): OximeterMetrics {
        if (!readings || readings.length === 0) {
            return {
                total: 0,
                spo2_90_92_count: 0,
                spo2_90_92_percent: 0,
                spo2_88_89_count: 0,
                spo2_88_89_percent: 0,
                spo2_below_88_count: 0,
                spo2_below_88_percent: 0
            };
        }

        const totalReadings = readings.length;
        let spo2_90_92_count = 0;
        let spo2_88_89_count = 0;
        let spo2_below_88_count = 0;

        for (const reading of readings) {
            if (!reading.detailed_value) {
                continue;
            }

            try {
                // console.log("Before Parsed Value SP02", reading.detailed_value);
                const metaSpo2 = this.parseSpo2Value(reading.detailed_value);
                // console.log("After Parsed Value Spo2", metaSpo2);

                const spo2 = metaSpo2.spo2;
                const pr = metaSpo2.pr;

                if (spo2 > 0) {
                    // Categorize reading
                    if (this.SPO2_RANGES.moderate_low_min <= spo2 && spo2 <= this.SPO2_RANGES.moderate_low_max) {
                        spo2_90_92_count++;
                    } else if (this.SPO2_RANGES.low_min <= spo2 && spo2 <= this.SPO2_RANGES.low_max) {
                        spo2_88_89_count++;
                    } else if (spo2 < this.SPO2_RANGES.critical_low) {
                        spo2_below_88_count++;
                    }
                }
            } catch (error) {
                this.logger.warn(`Error processing oximeter reading ${reading.id}: ${error.message}`);
                continue;
            }
        }

        // Calculate percentages
        const spo2_90_92_percent = totalReadings > 0 ? (spo2_90_92_count / totalReadings * 100) : 0;
        const spo2_88_89_percent = totalReadings > 0 ? (spo2_88_89_count / totalReadings * 100) : 0;
        const spo2_below_88_percent = totalReadings > 0 ? (spo2_below_88_count / totalReadings * 100) : 0;

        return {
            total: totalReadings,
            spo2_90_92_count,
            spo2_90_92_percent: parseFloat(spo2_90_92_percent.toFixed(2)),
            spo2_88_89_count,
            spo2_88_89_percent: parseFloat(spo2_88_89_percent.toFixed(2)),
            spo2_below_88_count,
            spo2_below_88_percent: parseFloat(spo2_below_88_percent.toFixed(2))
        };
    }

    /**
     * Parse weight reading value from the detailed_value string
     */
    private parseWeightValue(detailedValue: string): { weight: number, height: number, bmi: number } {
        if (!detailedValue || typeof detailedValue !== 'string') {
            return {weight: 0, height: 0, bmi: 0};
        }

        const result = {weight: 0, height: 0, bmi: 0};

        // Extract values with regex
        const weightMatch = detailedValue.match(this.WEIGHT_REGEX);
        if (weightMatch) {
            result.weight = parseFloat(weightMatch[1]);
        }

        const heightMatch = detailedValue.match(this.HEIGHT_REGEX);
        if (heightMatch) {
            result.height = parseFloat(heightMatch[1]);
        }

        const bmiMatch = detailedValue.match(this.BMI_REGEX);
        if (bmiMatch) {
            result.bmi = parseFloat(bmiMatch[1]);
        }

        return result;
    }

    /**
     * Get baseline weights for multiple patients
     */
    private async getPatientWeightBaselines(patientIds: string[] , practiceId: string): Promise<Record<string, number>> {
        if (!patientIds || patientIds.length === 0) {
            return {};
        }

        const baselines: Record<string, number> = {};
        const patientChunks = this.chunkArray(patientIds, this.CHUNK_SIZE);
        console.log(`Baselines: Processing ${patientIds.length} patients in ${patientChunks.length} chunks of size ${this.CHUNK_SIZE}`);

        try {
            const dataSource = await this.databaseService.getConnection(practiceId);

            for (const chunk of patientChunks) {
                const placeholders = chunk.map(() => '?').join(',');

                const queryRunner = dataSource.createQueryRunner();
                try {
                    const query = `
                        SELECT t1.patient_sub, t1.detailed_value, t1.timestamp
                        FROM device_data_transmission t1
                                 INNER JOIN (SELECT patient_sub, MIN(timestamp) as earliest_timestamp
                                             FROM device_data_transmission
                                             WHERE trim(patient_sub) IN (${placeholders})
                                               AND device_name = ' Weight'
                                               AND detailed_value IS NOT NULL
                                             GROUP BY patient_sub) t2 ON trim(t1.patient_sub) = trim(t2.patient_sub) AND
                                                                         t1.timestamp = t2.earliest_timestamp
                        WHERE t1.device_name = ' Weight'
                    `;

                    const results = await queryRunner.query(query, chunk);

                    for (const result of results) {
                        const patientSub = result.patient_sub;
                        try {
                            if (result.detailed_value) {
                                // Use the parseWeightValue method to extract weight
                                const weightData = this.parseWeightValue(result.detailed_value);
                                if (weightData.weight > 0) {
                                    baselines[patientSub] = weightData.weight;
                                }
                            }
                        } catch (error) {
                            this.logger.warn(`Invalid weight data format for patient ${patientSub}`);
                        }
                    }
                } finally {
                    await queryRunner.release();
                }
            }

            return baselines;
        } catch (error) {
            this.logger.error(`Error retrieving baseline weights: ${error.message}`);
            return {};
        }
    }

    /**
     * Process weight readings to identify significant changes from baseline
     */
    private async processWeightData(readings: DeviceReading[], patientIds: string[] , practiceId): Promise<WeightMetrics> {
        if (!readings || readings.length === 0 || !patientIds || patientIds.length === 0) {
            return {
                total: 0,
                weight_gain_4pct_count: 0,
                weight_gain_4pct_percent: 0
            };
        }

        const totalReadings = readings.length;
        let weight_gain_4pct_count = 0;

        // Get all patient baselines in one efficient operation
        const patientBaselines = await this.getPatientWeightBaselines(patientIds , practiceId);

        // Group readings by patient
        const patientReadings: Record<string, DeviceReading[]> = {};
        for (const reading of readings) {
            const patientSub = reading.patient_sub;
            if (!patientReadings[patientSub]) {
                patientReadings[patientSub] = [];
            }
            patientReadings[patientSub].push(reading);
        }

        // Process each patient's readings
        for (const [patientSub, patientReadingList] of Object.entries(patientReadings)) {
            // Get baseline weight for patient
            const baselineWeight = patientBaselines[patientSub];
            if (!baselineWeight) {
                continue;
            }

            // Check each reading for significant weight gain
            for (const reading of patientReadingList) {
                if (!reading.detailed_value) {
                    continue;
                }

                try {
                    // console.log("Before Parsed Value Weight", reading.detailed_value);
                    const metaWeight = this.parseWeightValue(reading.detailed_value);
                    // console.log("After Parsed Value Weight", metaWeight);

                    const weight = metaWeight.weight;
                    const height = metaWeight.height;
                    const bmi = metaWeight.bmi;

                    if (weight > 0) {
                        // Calculate percent change
                        const weightChangePct = ((weight - baselineWeight) / baselineWeight) * 100;

                        // Check for significant gain
                        if (weightChangePct > this.WEIGHT_CHANGE_THRESHOLD) {
                            weight_gain_4pct_count++;
                        }
                    }
                } catch (error) {
                    this.logger.warn(`Error processing weight reading ${reading.id}: ${error.message}`);
                    continue;
                }
            }
        }

        // Calculate percentage
        const weight_gain_4pct_percent = totalReadings > 0 ? (weight_gain_4pct_count / totalReadings * 100) : 0;

        return {
            total: totalReadings,
            weight_gain_4pct_count,
            weight_gain_4pct_percent: parseFloat(weight_gain_4pct_percent.toFixed(2))
        };
    }

    /**
     * Parse glucose reading value from the detailed_value string
     */
    private parseGlucoseValue(detailedValue: string, entryType: string = ''): { glucose: number, type: string } {
        if (!detailedValue || typeof detailedValue !== 'string') {
            return {glucose: 0, type: ''};
        }

        const result = {glucose: 0, type: ''};

        // Extract glucose value
        const glucoseMatch = detailedValue.match(this.GLUCOSE_REGEX);
        if (glucoseMatch) {
            result.glucose = parseFloat(glucoseMatch[1]);
        }

        // Extract type
        const typeMatch = detailedValue.match(this.TYPE_REGEX);
        if (typeMatch) {
            result.type = typeMatch[1].toLowerCase();
        } else if (entryType) {
            result.type = entryType.toLowerCase();
        }

        return result;
    }

    /**
     * Process glucose readings to calculate summary metrics by reading type
     */
    private processGlucoseData(readings: DeviceReading[] , practiceId: string): GlucoseMetrics {
        if (!readings || readings.length === 0) {
            return {
                fasting: {
                    total: 0,
                    above_130_count: 0,
                    above_130_percent: 0,
                    above_160_count: 0,
                    above_160_percent: 0,
                    above_180_count: 0,
                    above_180_percent: 0,
                    below_70_count: 0,
                    below_70_percent: 0,
                    below_54_count: 0,
                    below_54_percent: 0
                },
                post_meal: {
                    total: 0,
                    above_180_count: 0,
                    above_180_percent: 0,
                    above_200_count: 0,
                    above_200_percent: 0
                },
                random: {
                    total: 0,
                    above_200_count: 0,
                    above_200_percent: 0,
                    below_70_count: 0,
                    below_70_percent: 0
                }
            };
        }

        // Initialize counters for each reading type
        let fastingTotal = 0;
        let fastingAbove130 = 0;
        let fastingAbove160 = 0;
        let fastingAbove180 = 0;
        let fastingBelow70 = 0;
        let fastingBelow54 = 0;

        let postMealTotal = 0;
        let postMealAbove180 = 0;
        let postMealAbove200 = 0;

        let randomTotal = 0;
        let randomAbove200 = 0;
        let randomBelow70 = 0;

        for (const reading of readings) {
            if (!reading.detailed_value) {
                continue;
            }

            try {
                // console.log("Before Parsed Value Glucose", reading.detailed_value);
                const metaGlucose = this.parseGlucoseValue(reading.detailed_value, reading.entry_type);
                // console.log("After Parsed Value Glucose", metaGlucose);

                const glucoseValue = metaGlucose.glucose;
                const glucoseType = metaGlucose.type;

                if (glucoseValue > 0) {
                    const readingType = glucoseType.toLowerCase();
                    console.log("*****Glucose Type*****", glucoseType);

                    // Categorize by reading type
                    if (readingType.includes('fasting')) {
                        fastingTotal++;

                        if (glucoseValue > this.GLUCOSE_RANGES.fasting.critical_min) {
                            fastingAbove180++;
                            fastingAbove160++;
                            fastingAbove130++;
                        } else if (glucoseValue > this.GLUCOSE_RANGES.fasting.very_high_min) {
                            fastingAbove160++;
                            fastingAbove130++;
                        } else if (glucoseValue > this.GLUCOSE_RANGES.fasting.high_min) {
                            fastingAbove130++;
                        }

                        if (glucoseValue < this.GLUCOSE_RANGES.fasting.severe_low_max) {
                            fastingBelow54++;
                            fastingBelow70++;
                        } else if (glucoseValue < this.GLUCOSE_RANGES.fasting.low_max) {
                            fastingBelow70++;
                        }
                    } else if (readingType.includes('post') || readingType.includes('meal')) {
                        postMealTotal++;

                        if (glucoseValue > this.GLUCOSE_RANGES.post_meal.critical_min) {
                            postMealAbove200++;
                            postMealAbove180++;
                        } else if (glucoseValue > this.GLUCOSE_RANGES.post_meal.high_min) {
                            postMealAbove180++;
                        }
                    } else {  // Random/Normal readings
                        randomTotal++;

                        if (glucoseValue > this.GLUCOSE_RANGES.random.high_min) {
                            randomAbove200++;
                        }

                        if (glucoseValue < this.GLUCOSE_RANGES.random.low_max) {
                            randomBelow70++;
                        }
                    }
                }
            } catch (error) {
                this.logger.warn(`Error processing glucose reading ${reading.id}: ${error.message}`);
                continue;
            }
        }

        // Calculate percentages
        const fastingAbove130Pct = fastingTotal > 0 ? (fastingAbove130 / fastingTotal * 100) : 0;
        const fastingAbove160Pct = fastingTotal > 0 ? (fastingAbove160 / fastingTotal * 100) : 0;
        const fastingAbove180Pct = fastingTotal > 0 ? (fastingAbove180 / fastingTotal * 100) : 0;
        const fastingBelow70Pct = fastingTotal > 0 ? (fastingBelow70 / fastingTotal * 100) : 0;
        const fastingBelow54Pct = fastingTotal > 0 ? (fastingBelow54 / fastingTotal * 100) : 0;

        const postMealAbove180Pct = postMealTotal > 0 ? (postMealAbove180 / postMealTotal * 100) : 0;
        const postMealAbove200Pct = postMealTotal > 0 ? (postMealAbove200 / postMealTotal * 100) : 0;

        const randomAbove200Pct = randomTotal > 0 ? (randomAbove200 / randomTotal * 100) : 0;
        const randomBelow70Pct = randomTotal > 0 ? (randomBelow70 / randomTotal * 100) : 0;

        return {
            fasting: {
                total: fastingTotal,
                above_130_count: fastingAbove130,
                above_130_percent: parseFloat(fastingAbove130Pct.toFixed(2)),
                above_160_count: fastingAbove160,
                above_160_percent: parseFloat(fastingAbove160Pct.toFixed(2)),
                above_180_count: fastingAbove180,
                above_180_percent: parseFloat(fastingAbove180Pct.toFixed(2)),
                below_70_count: fastingBelow70,
                below_70_percent: parseFloat(fastingBelow70Pct.toFixed(2)),
                below_54_count: fastingBelow54,
                below_54_percent: parseFloat(fastingBelow54Pct.toFixed(2))
            },
            post_meal: {
                total: postMealTotal,
                above_180_count: postMealAbove180,
                above_180_percent: parseFloat(postMealAbove180Pct.toFixed(2)),
                above_200_count: postMealAbove200,
                above_200_percent: parseFloat(postMealAbove200Pct.toFixed(2))
            },
            random: {
                total: randomTotal,
                above_200_count: randomAbove200,
                above_200_percent: parseFloat(randomAbove200Pct.toFixed(2)),
                below_70_count: randomBelow70,
                below_70_percent: parseFloat(randomBelow70Pct.toFixed(2))
            }
        };
    }

    /**
     * Get alert metrics (critical alerts and escalations) for a group of patients
     */
    /**
     * Get alert metrics (critical alerts and escalations) for a group of patients
     */
    private async getAlertMetrics(
        patientIds: string[],
        startDate?: Date,
        endDate?: Date,
        practiceId?: string,
    ): Promise<AlertMetrics> {
        if (!patientIds || patientIds.length === 0) {
            return {
                total_readings: 0,
                critical_alerts_count: 0,
                critical_alerts_percent: 0,
                escalations_count: 0,
                escalations_percent: 0
            };
        }

        // Use BigInt for accumulating counts to prevent integer overflow
        let totalReadings = 0n;
        let criticalAlerts = 0n;
        let escalations = 0n;

        // Split patient_ids into manageable chunks
        const patientChunks = this.chunkArray(patientIds, this.CHUNK_SIZE);
        this.logger.log(`Processing ${patientIds.length} patients in ${patientChunks.length} chunks of size ${this.CHUNK_SIZE}`);

        try {
            const dataSource = await this.databaseService.getConnection(practiceId);

            for (const chunk of patientChunks) {
                const placeholders = chunk.map(() => '?').join(',');
                const queryRunner = dataSource.createQueryRunner();

                try {
                    // Base parameters for all queries
                    const baseParams = [...chunk];
                    let dateConditions = "";

                    if (startDate) {
                        dateConditions += " AND timestamp >= ?";
                        baseParams.push(startDate?.toISOString());
                    }

                    if (endDate) {
                        dateConditions += " AND timestamp <= ?";
                        baseParams.push(endDate?.toISOString());
                    }

                    // Count total readings
                    const totalQuery = `
                        SELECT COUNT(*) as total_count
                        FROM device_data_transmission
                        WHERE trim(patient_sub) IN (${placeholders})
                            ${dateConditions}
                    `;

                    const totalResult = await queryRunner.query(totalQuery, baseParams);
                    // Convert string to BigInt to safely handle large numbers
                    const chunkTotal = BigInt(String(totalResult[0]?.total_count || '0'));
                    totalReadings += chunkTotal;

                    // Count critical alerts
                    const criticalQuery = `
                        SELECT COUNT(*) as critical_count
                        FROM device_data_transmission
                        WHERE trim(patient_sub) IN (${placeholders})
                          AND critical_alert = 1
                            ${dateConditions}
                    `;

                    // Count for out of range alerts
                    const outOfRangeQuery = `
                        SELECT COUNT(*) as out_of_range_count
                        FROM device_data_transmission
                        WHERE trim(patient_sub) IN (${placeholders})
                          AND out_of_range_alert = 1
                            ${dateConditions}
                    `;

                    const criticalResult = await queryRunner.query(criticalQuery, baseParams);
                    // Convert string to BigInt
                    const chunkCritical = BigInt(String(criticalResult[0]?.critical_count || '0'));
                    criticalAlerts += chunkCritical;

                    // Adding critical alerts
                    const outOfRangeResult = await queryRunner.query(outOfRangeQuery, baseParams);
                    // Convert string to BigInt
                    const chunkOutOfRange = BigInt(String(outOfRangeResult[0]?.out_of_range_count || '0'));
                    criticalAlerts += chunkOutOfRange;

                    // Count escalations (external alerts)
                    const escalationQuery = `
                        SELECT COUNT(*) as escalation_count
                        FROM device_data_transmission
                        WHERE trim(patient_sub) IN (${placeholders})
                          AND ext_alert = 1
                            ${dateConditions}
                    `;

                    const escalationResult = await queryRunner.query(escalationQuery, baseParams);
                    // Convert string to BigInt
                    const chunkEscalations = BigInt(String(escalationResult[0]?.escalation_count || '0'));

                    // Enhanced logging to track progress and help with debugging
                    this.logger.debug(`Chunk ${patientChunks.indexOf(chunk) + 1}/${patientChunks.length}: Adding ${chunkEscalations} escalations`);

                    escalations += chunkEscalations;
                } finally {
                    await queryRunner.release();
                }
            }

            // Log the raw BigInt values before conversion
            this.logger.log(`Raw BigInt counts - totalReadings: ${totalReadings}, criticalAlerts: ${criticalAlerts}, escalations: ${escalations}`);

            // Convert BigInt to Number for the final result
            // For extremely large values, this could theoretically lose precision, but it's unlikely in practice
            const totalReadingsNum = Number(totalReadings);
            const criticalAlertsNum = Number(criticalAlerts);
            const escalationsNum = Number(escalations);

            // Calculate percentages
            const criticalAlertsPercent = totalReadingsNum > 0 ? (criticalAlertsNum / totalReadingsNum * 100) : 0;
            const escalationsPercent = totalReadingsNum > 0 ? (escalationsNum / totalReadingsNum * 100) : 0;

            // Log the final calculated values
            this.logger.log(`Final counts - totalReadings: ${totalReadingsNum}, criticalAlerts: ${criticalAlertsNum}, escalations: ${escalationsNum}`);

            return {
                total_readings: totalReadingsNum,
                critical_alerts_count: criticalAlertsNum,
                critical_alerts_percent: parseFloat(criticalAlertsPercent.toFixed(2)),
                escalations_count: escalationsNum,
                escalations_percent: parseFloat(escalationsPercent.toFixed(2))
            };
        } catch (error) {
            this.logger.error(`Error retrieving alert metrics: ${error.message}`);
            this.logger.error(error.stack);
            return {
                total_readings: 0,
                critical_alerts_count: 0,
                critical_alerts_percent: 0,
                escalations_count: 0,
                escalations_percent: 0
            };
        }
    }
    /**
     * Store calculated clinical metrics in the database
     */
    private async storeClinicalMetrics(
        summaryDate: string,
        practiceId: string,
        enrollmentPeriod: string,
        bpMetrics: BpMetrics,
        oximeterMetrics: OximeterMetrics,
        weightMetrics: WeightMetrics,
        glucoseMetrics: GlucoseMetrics,
        alertMetrics: AlertMetrics
    ): Promise<void> {
        try {
            // todo:
            const dataSource = await this.databaseService.getConnection(practiceId);
            const queryRunner = dataSource.createQueryRunner();

            try {
                // Check if record exists for this practice, period, and date
                const checkQuery = `
                    SELECT id
                    FROM clinical_metrics_summary
                    WHERE practice_id = ?
                      AND enrollment_period = ?
                `;

                const result = await queryRunner.query(checkQuery, [practiceId, enrollmentPeriod, summaryDate]);

                // Extract glucose metrics for easier access
                const fasting  = glucoseMetrics.fasting;
                const postMeal = glucoseMetrics.post_meal;
                const randomGlucose = glucoseMetrics.random;

                if (result && result.length > 0) {
                    // Update existing record
                    const updateQuery = `
                        UPDATE clinical_metrics_summary
                        SET
                            -- Blood Pressure Metrics
                            bp_total_readings                  = ?,
                            bp_abnormal_count                  = ?,
                            bp_abnormal_percent                = ?,
                            bp_avg_sys                         = ?,
                            bp_avg_dia                         = ?,
                            bp_avg_hr                          = ?,
                            bp_arrhythmia_count                = ?,
                            bp_arrhythmia_percent              = ?,
                            bp_normal_count                    = ?,
                            bp_normal_percent                  = ?,
                            bp_normal_avg_sys                  = ?,
                            bp_normal_avg_dia                  = ?,
                            bp_normal_avg_hr                   = ?,

                            -- New BP Threshold Metrics
                            bp_sys_gt_130_dia_gt_80_count      = ?,
                            bp_sys_gt_130_dia_gt_80_percent    = ?,
                            bp_sys_gt_140_dia_gt_80_count      = ?,
                            bp_sys_gt_140_dia_gt_80_percent    = ?,
                            bp_sys_gt_150_dia_gt_80_count      = ?,
                            bp_sys_gt_150_dia_gt_80_percent    = ?,
                            bp_sys_gt_160_dia_gt_80_count      = ?,
                            bp_sys_gt_160_dia_gt_80_percent    = ?,
                            bp_sys_lt_90_dia_lt_60_count       = ?,
                            bp_sys_lt_90_dia_lt_60_percent     = ?,
                            bp_hr_abnormal_count               = ?,
                            bp_hr_abnormal_percent             = ?,

                            -- Pulse Oximeter Metrics
                            spo2_total_readings                = ?,
                            spo2_90_92_count                   = ?,
                            spo2_90_92_percent                 = ?,
                            spo2_88_89_count                   = ?,
                            spo2_88_89_percent                 = ?,
                            spo2_below_88_count                = ?,
                            spo2_below_88_percent              = ?,

                            -- Weight Metrics
                            weight_total_readings              = ?,
                            weight_gain_4pct_count             = ?,
                            weight_gain_4pct_percent           = ?,

                            -- Glucose Metrics - Fasting
                            glucose_fasting_total              = ?,
                            glucose_fasting_above_130_count    = ?,
                            glucose_fasting_above_130_percent  = ?,
                            glucose_fasting_above_160_count    = ?,
                            glucose_fasting_above_160_percent  = ?,
                            glucose_fasting_above_180_count    = ?,
                            glucose_fasting_above_180_percent  = ?,
                            glucose_fasting_below_70_count     = ?,
                            glucose_fasting_below_70_percent   = ?,
                            glucose_fasting_below_54_count     = ?,
                            glucose_fasting_below_54_percent   = ?,

                            -- Glucose Metrics - Post Meal
                            glucose_postmeal_total             = ?,
                            glucose_postmeal_above_180_count   = ?,
                            glucose_postmeal_above_180_percent = ?,
                            glucose_postmeal_above_200_count   = ?,
                            glucose_postmeal_above_200_percent = ?,

                            -- Glucose Metrics - Random
                            glucose_random_total               = ?,
                            glucose_random_above_200_count     = ?,
                            glucose_random_above_200_percent   = ?,
                            glucose_random_below_70_count      = ?,
                            glucose_random_below_70_percent    = ?,

                            -- Alert Metrics
                            critical_alerts_count              = ?,
                            critical_alerts_percent            = ?,
                            escalations_count                  = ?,
                            escalations_percent                = ?,

                            updated_at                         = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `;

                    await queryRunner.query(updateQuery, [
                        // Blood Pressure Metrics
                        bpMetrics.total,
                        bpMetrics.abnormal_count,
                        bpMetrics.abnormal_percent,
                        bpMetrics.avg_sys,
                        bpMetrics.avg_dia,
                        bpMetrics.avg_hr,
                        bpMetrics.arrhythmia_count,
                        bpMetrics.arrhythmia_percent,
                        bpMetrics.normal_count,
                        bpMetrics.normal_percent,
                        bpMetrics.normal_avg_sys,
                        bpMetrics.normal_avg_dia,
                        bpMetrics.normal_avg_hr,

                        // New BP Threshold Metrics
                        bpMetrics.sys_gt_130_dia_gt_80_count,
                        bpMetrics.sys_gt_130_dia_gt_80_percent,
                        bpMetrics.sys_gt_140_dia_gt_80_count,
                        bpMetrics.sys_gt_140_dia_gt_80_percent,
                        bpMetrics.sys_gt_150_dia_gt_80_count,
                        bpMetrics.sys_gt_150_dia_gt_80_percent,
                        bpMetrics.sys_gt_160_dia_gt_80_count,
                        bpMetrics.sys_gt_160_dia_gt_80_percent,
                        bpMetrics.sys_lt_90_dia_lt_60_count,
                        bpMetrics.sys_lt_90_dia_lt_60_percent,
                        bpMetrics.hr_abnormal_count,
                        bpMetrics.hr_abnormal_percent,

                        // Pulse Oximeter Metrics
                        oximeterMetrics.total,
                        oximeterMetrics.spo2_90_92_count,
                        oximeterMetrics.spo2_90_92_percent,
                        oximeterMetrics.spo2_88_89_count,
                        oximeterMetrics.spo2_88_89_percent,
                        oximeterMetrics.spo2_below_88_count,
                        oximeterMetrics.spo2_below_88_percent,

                        // Weight Metrics
                        weightMetrics.total,
                        weightMetrics.weight_gain_4pct_count,
                        weightMetrics.weight_gain_4pct_percent,

                        // Glucose Metrics - Fasting
                        fasting.total,
                        fasting.above_130_count,
                        fasting.above_130_percent,
                        fasting.above_160_count,
                        fasting.above_160_percent,
                        fasting.above_180_count,
                        fasting.above_180_percent,
                        fasting.below_70_count,
                        fasting.below_70_percent,
                        fasting.below_54_count,
                        fasting.below_54_percent,

                        // Glucose Metrics - Post Meal
                        postMeal.total,
                        postMeal.above_180_count,
                        postMeal.above_180_percent,
                        postMeal.above_200_count,
                        postMeal.above_200_percent,

                        // Glucose Metrics - Random
                        randomGlucose.total,
                        randomGlucose.above_200_count,
                        randomGlucose.above_200_percent,
                        randomGlucose.below_70_count,
                        randomGlucose.below_70_percent,

                        // Alert Metrics
                        alertMetrics.critical_alerts_count,
                        alertMetrics.critical_alerts_percent,
                        alertMetrics.escalations_count,
                        alertMetrics.escalations_percent,

                        // Record ID
                        result[0].id
                    ]);

                    this.logger.log(`Updated clinical metrics for practice ${practiceId} in period ${enrollmentPeriod}`);
                } else {
                    // Insert new record
                    const insertQuery = `
                        INSERT INTO clinical_metrics_summary (summary_date,
                                                              practice_id,
                                                              enrollment_period,

                            -- Blood Pressure Metrics
                                                              bp_total_readings,
                                                              bp_abnormal_count,
                                                              bp_abnormal_percent,
                                                              bp_avg_sys,
                                                              bp_avg_dia,
                                                              bp_avg_hr,
                                                              bp_arrhythmia_count,
                                                              bp_arrhythmia_percent,
                                                              bp_normal_count,
                                                              bp_normal_percent,
                                                              bp_normal_avg_sys,
                                                              bp_normal_avg_dia,
                                                              bp_normal_avg_hr,

                            -- New BP Threshold Metrics
                                                              bp_sys_gt_130_dia_gt_80_count,
                                                              bp_sys_gt_130_dia_gt_80_percent,
                                                              bp_sys_gt_140_dia_gt_80_count,
                                                              bp_sys_gt_140_dia_gt_80_percent,
                                                              bp_sys_gt_150_dia_gt_80_count,
                                                              bp_sys_gt_150_dia_gt_80_percent,
                                                              bp_sys_gt_160_dia_gt_80_count,
                                                              bp_sys_gt_160_dia_gt_80_percent,
                                                              bp_sys_lt_90_dia_lt_60_count,
                                                              bp_sys_lt_90_dia_lt_60_percent,
                                                              bp_hr_abnormal_count,
                                                              bp_hr_abnormal_percent,

                            -- Pulse Oximeter Metrics
                                                              spo2_total_readings,
                                                              spo2_90_92_count,
                                                              spo2_90_92_percent,
                                                              spo2_88_89_count,
                                                              spo2_88_89_percent,
                                                              spo2_below_88_count,
                                                              spo2_below_88_percent,

                            -- Weight Metrics
                                                              weight_total_readings,
                                                              weight_gain_4pct_count,
                                                              weight_gain_4pct_percent,

                            -- Glucose Metrics - Fasting
                                                              glucose_fasting_total,
                                                              glucose_fasting_above_130_count,
                                                              glucose_fasting_above_130_percent,
                                                              glucose_fasting_above_160_count,
                                                              glucose_fasting_above_160_percent,
                                                              glucose_fasting_above_180_count,
                                                              glucose_fasting_above_180_percent,
                                                              glucose_fasting_below_70_count,
                                                              glucose_fasting_below_70_percent,
                                                              glucose_fasting_below_54_count,
                                                              glucose_fasting_below_54_percent,

                            -- Glucose Metrics - Post Meal
                                                              glucose_postmeal_total,
                                                              glucose_postmeal_above_180_count,
                                                              glucose_postmeal_above_180_percent,
                                                              glucose_postmeal_above_200_count,
                                                              glucose_postmeal_above_200_percent,

                            -- Glucose Metrics - Random
                                                              glucose_random_total,
                                                              glucose_random_above_200_count,
                                                              glucose_random_above_200_percent,
                                                              glucose_random_below_70_count,
                                                              glucose_random_below_70_percent,

                            -- Alert Metrics
                                                              critical_alerts_count,
                                                              critical_alerts_percent,
                                                              escalations_count,
                                                              escalations_percent)
                        VALUES (?, ?, ?,
                                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                                ?, ?, ?, ?, ?, ?, ?,
                                ?, ?, ?,
                                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                                ?, ?, ?, ?, ?,
                                ?, ?, ?, ?, ?,
                                ?, ?, ?, ?)
                    `;

                    await queryRunner.query(insertQuery, [
                        // Basic Info
                        summaryDate,
                        practiceId,
                        enrollmentPeriod,

                        // Blood Pressure Metrics
                        bpMetrics.total,
                        bpMetrics.abnormal_count,
                        bpMetrics.abnormal_percent,
                        bpMetrics.avg_sys,
                        bpMetrics.avg_dia,
                        bpMetrics.avg_hr,
                        bpMetrics.arrhythmia_count,
                        bpMetrics.arrhythmia_percent,
                        bpMetrics.normal_count,
                        bpMetrics.normal_percent,
                        bpMetrics.normal_avg_sys,
                        bpMetrics.normal_avg_dia,
                        bpMetrics.normal_avg_hr,

                        // New BP Threshold Metrics
                        bpMetrics.sys_gt_130_dia_gt_80_count,
                        bpMetrics.sys_gt_130_dia_gt_80_percent,
                        bpMetrics.sys_gt_140_dia_gt_80_count,
                        bpMetrics.sys_gt_140_dia_gt_80_percent,
                        bpMetrics.sys_gt_150_dia_gt_80_count,
                        bpMetrics.sys_gt_150_dia_gt_80_percent,
                        bpMetrics.sys_gt_160_dia_gt_80_count,
                        bpMetrics.sys_gt_160_dia_gt_80_percent,
                        bpMetrics.sys_lt_90_dia_lt_60_count,
                        bpMetrics.sys_lt_90_dia_lt_60_percent,
                        bpMetrics.hr_abnormal_count,
                        bpMetrics.hr_abnormal_percent,

                        // Pulse Oximeter Metrics
                        oximeterMetrics.total,
                        oximeterMetrics.spo2_90_92_count,
                        oximeterMetrics.spo2_90_92_percent,
                        oximeterMetrics.spo2_88_89_count,
                        oximeterMetrics.spo2_88_89_percent,
                        oximeterMetrics.spo2_below_88_count,
                        oximeterMetrics.spo2_below_88_percent,

                        // Weight Metrics
                        weightMetrics.total,
                        weightMetrics.weight_gain_4pct_count,
                        weightMetrics.weight_gain_4pct_percent,

                        // Glucose Metrics - Fasting
                        fasting.total,
                        fasting.above_130_count,
                        fasting.above_130_percent,
                        fasting.above_160_count,
                        fasting.above_160_percent,
                        fasting.above_180_count,
                        fasting.above_180_percent,
                        fasting.below_70_count,
                        fasting.below_70_percent,
                        fasting.below_54_count,
                        fasting.below_54_percent,

                        // Glucose Metrics - Post Meal
                        postMeal.total,
                        postMeal.above_180_count,
                        postMeal.above_180_percent,
                        postMeal.above_200_count,
                        postMeal.above_200_percent,

                        // Glucose Metrics - Random
                        randomGlucose.total,
                        randomGlucose.above_200_count,
                        randomGlucose.above_200_percent,
                        randomGlucose.below_70_count,
                        randomGlucose.below_70_percent,

                        // Alert Metrics
                        alertMetrics.critical_alerts_count,
                        alertMetrics.critical_alerts_percent,
                        alertMetrics.escalations_count,
                        alertMetrics.escalations_percent
                    ]);

                    this.logger.log(`Inserted new clinical metrics for practice ${practiceId} in period ${enrollmentPeriod}`);
                }
            } finally {
                // Release the query runner
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(`Error storing clinical metrics: ${error.message}`);
            throw error;
        }
    }
}
