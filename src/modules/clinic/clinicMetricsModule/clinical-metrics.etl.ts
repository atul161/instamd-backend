import {Inject, Injectable, Logger} from '@nestjs/common';
import {Cron, CronExpression} from '@nestjs/schedule';
import {DatabaseService} from '../../database/database.service';
import * as moment from 'moment';

import {
    AlertMetricsWithPatients,
    AlertPatientDetails,
    BpMetricsWithPatients,
    BpPatientDetails,
    DeviceDataTransmission,
    DeviceReading,
    GlucoseMetricsWithPatients,
    GlucosePatientDetails,
    OximeterMetricsWithPatients,
    OximeterPatientDetails,
    PatientMetricDetail,
    WeightMetricsWithPatients,
    WeightPatientDetails
} from "./interface/clinical-metrics.interface";
import {practiceList} from '../patientEnrollmentModule/interface/enrollment-period.interface';
import {updateQuery} from "./query/store-clinical-update-query";
import {insertQuery} from "./query/store-clinical-insert-query";
import {createClinicalSummaryTable} from "./query/clinical-summary-table";
import {createPatientDetailsTable} from "./query/ create-patient-details-table";
import {
    BMI_REGEX,
    BP_ARR_REGEX,
    BP_DIA_REGEX,
    BP_HR_REGEX,
    BP_IHB_REGEX,
    BP_SYS_REGEX,
    GLUCOSE_REGEX,
    HEIGHT_REGEX,
    SPO2_PR_REGEX,
    SPO2_REGEX,
    TYPE_REGEX,
    WEIGHT_REGEX
} from './enum/regex.constant';
import {GLUCOSE_RANGES, NORMAL_BP_RANGES, SPO2_RANGES, WEIGHT_CHANGE_THRESHOLD} from './enum/threshold.constant';

@Injectable()
export class ClinicalMetricsEtlService {
    private readonly logger = new Logger(ClinicalMetricsEtlService.name);
    private readonly CHUNK_SIZE = 500; // Adjust based on database performance

    constructor(@Inject() private databaseService: DatabaseService) {}

    /**
     * Main cron job that runs daily to update clinical metrics
     */
    @Cron(CronExpression.EVERY_2_HOURS)
    async runDailyClinicalMetricsUpdate() {
        const startTime = new Date();
        this.logger.log(`===== STARTING CLINICAL METRICS ETL at ${startTime} =====`);
        const practiceId = practiceList[0].practiceId;

        try {
            // Ensure the summary table exists
            await this.createClinicalMetricsTableIfNotExists(practiceId);

            // Ensure the patient details table exists
            await this.createPatientDetailsTableIfNotExists(practiceId);

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

                    // Get the appropriate date range for this enrollment period
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
                    await queryRunner.query(createClinicalSummaryTable);
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

    private async createPatientDetailsTableIfNotExists(practiceId: string): Promise<void> {
        try {
            const dataSource = await this.databaseService.getConnection(practiceId);
            const queryRunner = dataSource.createQueryRunner();

            try {
                // Check if the table exists
                const tableExists = await queryRunner.hasTable('clinical_metrics_patient_details');

                if (!tableExists) {
                    // Create the table if it doesn't exist
                    await queryRunner.query(createPatientDetailsTable);
                    this.logger.log("Created clinical_metrics_patient_details table");
                } else {
                    this.logger.log("clinical_metrics_patient_details table already exists");
                }
            } finally {
                // Release the query runner
                await queryRunner.release();
            }
        } catch (error) {
            this.logger.error(`Error creating patient details table: ${error.message}`);
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
        const sysMatch = detailedValue.match(BP_SYS_REGEX);
        if (sysMatch) {
            result.sys = parseFloat(sysMatch[1]);
        }

        const diaMatch = detailedValue.match(BP_DIA_REGEX);
        if (diaMatch) {
            result.dia = parseFloat(diaMatch[1]);
        }

        const hrMatch = detailedValue.match(BP_HR_REGEX);
        if (hrMatch) {
            result.hr = parseFloat(hrMatch[1]);
        }

        // Check for arrhythmia - handles both data formats
        const arrMatch = detailedValue.match(BP_ARR_REGEX);
        if (arrMatch) {
            result.arrhythmia = parseInt(arrMatch[1], 10);
        } else {
            const ihbMatch = detailedValue.match(BP_IHB_REGEX);
            if (ihbMatch) {
                result.arrhythmia = ihbMatch[1].toLowerCase() === 'true' ? 1 : 0;
            }
        }

        return result;
    }



    private processBloodPressureData(readings: DeviceReading[], practiceId: string): BpMetricsWithPatients {
        if (!readings || readings.length === 0) {
            return {
                metrics: {
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
                },
                patientDetails: {
                    bp_readings: [],
                    bp_abnormal: [],
                    bp_arrhythmia: [],
                    bp_normal: [],
                    bp_sys_gt_130_dia_gt_80: [],
                    bp_sys_gt_140_dia_gt_80: [],
                    bp_sys_gt_150_dia_gt_80: [],
                    bp_sys_gt_160_dia_gt_80: [],
                    bp_sys_lt_90_dia_lt_60: [],
                    bp_hr_abnormal: []
                }
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
        let totalPatients = 0;
        let normalCount = 0;

        // Track patient details for each category
        const patientDetails: BpPatientDetails = {
            bp_readings: [],
            bp_abnormal: [],
            bp_arrhythmia: [],
            bp_normal: [],
            bp_sys_gt_130_dia_gt_80: [],
            bp_sys_gt_140_dia_gt_80: [],
            bp_sys_gt_150_dia_gt_80: [],
            bp_sys_gt_160_dia_gt_80: [],
            bp_sys_lt_90_dia_lt_60: [],
            bp_hr_abnormal: []
        };

        // Sets to track unique patient IDs for counting
        const uniquePatients = {
            readings: new Set<string>(),
            abnormal: new Set<string>(),
            arrhythmia: new Set<string>(),
            normal: new Set<string>(),
            sysGt130DiaGt80: new Set<string>(),
            sysGt140DiaGt80: new Set<string>(),
            sysGt150DiaGt80: new Set<string>(),
            sysGt160DiaGt80: new Set<string>(),
            sysLt90DiaLt60: new Set<string>(),
            hrAbnormal: new Set<string>()
        };

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
                const patientSub = reading.patient_sub;


                // Extract values
                const sys = metaDict.sys;
                const dia = metaDict.dia;
                const hr = metaDict.hr;
                const arrhythmia = metaDict.arrhythmia;
                if(sys === 0 && dia === 0 && hr === 0 && arrhythmia === 0) {
                    continue;
                }

                // Add to patient details for all readings
                if (sys > 0 || dia > 0 || hr > 0 || arrhythmia > 0) {
                    // ADD PATIENT
                    patientDetails.bp_readings.push({
                        patient_sub: patientSub,
                        metric_value_detailed: metaDict,
                        reading_timestamp: reading.timestamp
                    });
                    uniquePatients.readings.add(patientSub);
                    totalPatients++;
                }

                if (arrhythmia === 1) {
                    arrhythmiaCount++;
                    uniquePatients.arrhythmia.add(patientSub);
                    patientDetails.bp_arrhythmia.push({
                        patient_sub: patientSub,
                        metric_value_detailed: metaDict,
                        reading_timestamp: reading.timestamp
                    });
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
                    NORMAL_BP_RANGES.sys_min <= sys && sys <= NORMAL_BP_RANGES.sys_max &&
                    NORMAL_BP_RANGES.dia_min <= dia && dia <= NORMAL_BP_RANGES.dia_max &&
                    NORMAL_BP_RANGES.hr_min <= hr && hr <= NORMAL_BP_RANGES.hr_max
                );

                if (isNormal) {
                    normalSysValues.push(sys);
                    normalDiaValues.push(dia);
                    normalHrValues.push(hr);
                    uniquePatients.normal.add(patientSub);
                    normalCount++;
                    patientDetails.bp_normal.push({
                        patient_sub: patientSub,
                        metric_value_detailed: metaDict,
                        reading_timestamp: reading.timestamp
                    });
                } else {
                    abnormalReadings++;
                    uniquePatients.abnormal.add(patientSub);
                    patientDetails.bp_abnormal.push({
                        patient_sub: patientSub,
                        metric_value_detailed: metaDict,
                        reading_timestamp: reading.timestamp
                    });
                }

                // Check for BP threshold conditions
                if (sys > 130 && dia > 80) {
                    sysGt130DiaGt80Count++;
                    uniquePatients.sysGt130DiaGt80.add(patientSub);
                    patientDetails.bp_sys_gt_130_dia_gt_80.push({
                        patient_sub: patientSub,
                        metric_value_detailed: metaDict,
                        reading_timestamp: reading.timestamp
                    });
                }

                if (sys > 140 && dia > 80) {
                    sysGt140DiaGt80Count++;
                    uniquePatients.sysGt140DiaGt80.add(patientSub);
                    patientDetails.bp_sys_gt_140_dia_gt_80.push({
                        patient_sub: patientSub,
                        metric_value_detailed: metaDict,
                        reading_timestamp: reading.timestamp
                    });
                }

                if (sys > 150 && dia > 80) {
                    sysGt150DiaGt80Count++;
                    uniquePatients.sysGt150DiaGt80.add(patientSub);
                    patientDetails.bp_sys_gt_150_dia_gt_80.push({
                        patient_sub: patientSub,
                        metric_value_detailed: metaDict,
                        reading_timestamp: reading.timestamp
                    });
                }

                if (sys > 160 && dia > 80) {
                    sysGt160DiaGt80Count++;
                    uniquePatients.sysGt160DiaGt80.add(patientSub);
                    patientDetails.bp_sys_gt_160_dia_gt_80.push({
                        patient_sub: patientSub,
                        metric_value_detailed: metaDict,
                        reading_timestamp: reading.timestamp
                    });
                }

                if (sys < 90 && dia < 60) {
                    sysLt90DiaLt60Count++;
                    uniquePatients.sysLt90DiaLt60.add(patientSub);
                    patientDetails.bp_sys_lt_90_dia_lt_60.push({
                        patient_sub: patientSub,
                        metric_value_detailed: metaDict,
                        reading_timestamp: reading.timestamp
                    });
                }

                if (hr < 50 || hr > 120) {
                    hrAbnormalCount++;
                    uniquePatients.hrAbnormal.add(patientSub);
                    patientDetails.bp_hr_abnormal.push({
                        patient_sub: patientSub,
                        metric_value_detailed: metaDict,
                        reading_timestamp: reading.timestamp
                    });
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



        // Calculate percentages
        const abnormalPercent = totalReadings > 0 ? (abnormalReadings / totalReadings * 100) : 0;
        const normalPercent = totalReadings > 0 ? (normalCount / totalReadings * 100) : 0;
        const arrhythmiaPercent = totalReadings > 0 ? (arrhythmiaCount / totalReadings * 100) : 0;

        // Calculate BP threshold percentages
        const sysGt130DiaGt80Percent = totalReadings > 0 ? (sysGt130DiaGt80Count / totalReadings * 100) : 0;
        const sysGt140DiaGt80Percent = totalReadings > 0 ? (sysGt140DiaGt80Count / totalReadings * 100) : 0;
        const sysGt150DiaGt80Percent = totalReadings > 0 ? (sysGt150DiaGt80Count / totalReadings * 100) : 0;
        const sysGt160DiaGt80Percent = totalReadings > 0 ? (sysGt160DiaGt80Count / totalReadings * 100) : 0;
        const sysLt90DiaLt60Percent = totalReadings > 0 ? (sysLt90DiaLt60Count / totalReadings * 100) : 0;
        const hrAbnormalPercent = totalReadings > 0 ? (hrAbnormalCount / totalReadings * 100) : 0;

        return {
            metrics: {
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
                // BP threshold metrics
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
            },
            patientDetails: patientDetails
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
        const spo2Match = detailedValue.match(SPO2_REGEX);
        if (spo2Match) {
            result.spo2 = parseFloat(spo2Match[1]);
        }

        // Extract pulse rate
        const prMatch = detailedValue.match(SPO2_PR_REGEX);
        if (prMatch) {
            result.pr = parseFloat(prMatch[1]);
        }

        return result;
    }


    private processOximeterData(readings: DeviceReading[], practiceId: string): OximeterMetricsWithPatients {
        if (!readings || readings.length === 0) {
            return {
                metrics: {
                    total: 0,
                    spo2_90_92_count: 0,
                    spo2_90_92_percent: 0,
                    spo2_88_89_count: 0,
                    spo2_88_89_percent: 0,
                    spo2_below_88_count: 0,
                    spo2_below_88_percent: 0
                },
                patientDetails: {
                    spo2_readings: [],
                    spo2_90_92: [],
                    spo2_88_89: [],
                    spo2_below_88: []
                }
            };
        }

        const totalReadings = readings.length;
        let spo2_90_92_count = 0;
        let spo2_88_89_count = 0;
        let spo2_below_88_count = 0;

        // Track patient details for each category
        const patientDetails: OximeterPatientDetails = {
            spo2_readings: [],
            spo2_90_92: [],
            spo2_88_89: [],
            spo2_below_88: []
        };

        // Sets to track unique patient IDs
        const uniquePatients = {
            readings: new Set<string>(),
            spo2_90_92: new Set<string>(),
            spo2_88_89: new Set<string>(),
            spo2_below_88: new Set<string>()
        };

        for (const reading of readings) {
            if (!reading.detailed_value) {
                continue;
            }

            try {
                const metaSpo2 = this.parseSpo2Value(reading.detailed_value);
                const patientSub = reading.patient_sub;

                const spo2 = metaSpo2.spo2;
                const pr = metaSpo2.pr;

                if (pr > 0 || spo2 > 0) {
                    uniquePatients.readings.add(patientSub);
                    patientDetails.spo2_readings.push({
                        patient_sub: patientSub,
                        metric_value_detailed: metaSpo2,
                        reading_timestamp: reading.timestamp
                    });
                } else continue;

                if (spo2 > 0) {
                    // Categorize reading
                    if (SPO2_RANGES.moderate_low_min <= spo2 && spo2 <= SPO2_RANGES.moderate_low_max) {
                        spo2_90_92_count++;
                        uniquePatients.spo2_90_92.add(patientSub);
                        patientDetails.spo2_90_92.push({
                            patient_sub: patientSub,
                            metric_value_detailed: metaSpo2,
                            reading_timestamp: reading.timestamp
                        });
                    } else if (SPO2_RANGES.low_min <= spo2 && spo2 <= SPO2_RANGES.low_max) {
                        spo2_88_89_count++;
                        uniquePatients.spo2_88_89.add(patientSub);
                        patientDetails.spo2_88_89.push({
                            patient_sub: patientSub,
                            metric_value_detailed: metaSpo2,
                            reading_timestamp: reading.timestamp
                        });
                    } else if (spo2 < SPO2_RANGES.critical_low) {
                        spo2_below_88_count++;
                        uniquePatients.spo2_below_88.add(patientSub);
                        patientDetails.spo2_below_88.push({
                            patient_sub: patientSub,
                            metric_value_detailed: metaSpo2,
                            reading_timestamp: reading.timestamp
                        });
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
            metrics: {
                total: totalReadings,
                spo2_90_92_count,
                spo2_90_92_percent: parseFloat(spo2_90_92_percent.toFixed(2)),
                spo2_88_89_count,
                spo2_88_89_percent: parseFloat(spo2_88_89_percent.toFixed(2)),
                spo2_below_88_count,
                spo2_below_88_percent: parseFloat(spo2_below_88_percent.toFixed(2))
            },
            patientDetails: patientDetails
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
        const weightMatch = detailedValue.match(WEIGHT_REGEX);
        if (weightMatch) {
            result.weight = parseFloat(weightMatch[1]);
        }

        const heightMatch = detailedValue.match(HEIGHT_REGEX);
        if (heightMatch) {
            result.height = parseFloat(heightMatch[1]);
        }

        const bmiMatch = detailedValue.match(BMI_REGEX);
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
    private async processWeightData(readings: DeviceReading[], patientIds: string[], practiceId: string): Promise<WeightMetricsWithPatients> {
        if (!readings || readings.length === 0 || !patientIds || patientIds.length === 0) {
            return {
                metrics: {
                    total: 0,
                    weight_gain_4pct_count: 0,
                    weight_gain_4pct_percent: 0
                },
                patientDetails: {
                    weight_readings: [],
                    weight_gain_4pct: []
                }
            };
        }

        const totalReadings = readings.length;
        let weight_gain_4pct_count = 0;

        // Track patient details for each category
        const patientDetails: WeightPatientDetails = {
            weight_readings: [],
            weight_gain_4pct: []
        };

        // Sets to track unique patient IDs
        const uniquePatients = {
            readings: new Set<string>(),
            weight_gain_4pct: new Set<string>()
        };

        // Get all patient baselines in one efficient operation
        const patientBaselines = await this.getPatientWeightBaselines(patientIds, practiceId);

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
                    const metaWeight = this.parseWeightValue(reading.detailed_value);

                    const weight = metaWeight.weight;
                    const height = metaWeight.height;
                    const bmi = metaWeight.bmi;

                    if (weight > 0 || height > 0 || bmi > 0) {
                        patientDetails.weight_readings.push({
                            patient_sub: patientSub,
                            reading_timestamp: reading.timestamp,
                            metric_value_detailed: metaWeight,
                        });
                        uniquePatients.readings.add(patientSub);
                    }

                    if (weight > 0) {
                        // Calculate percent change
                        const weightChangePct = ((weight - baselineWeight) / baselineWeight) * 100;

                        // Check for significant gain
                        if (weightChangePct > WEIGHT_CHANGE_THRESHOLD) {
                            weight_gain_4pct_count++;

                            // Track patient for weight gain category
                            uniquePatients.weight_gain_4pct.add(patientSub);

                            // Add to patient details for weight gain
                            patientDetails.weight_gain_4pct.push({
                                patient_sub: patientSub,
                                metric_value_detailed: metaWeight,
                                reading_timestamp: reading.timestamp
                            });

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
            metrics: {
                total: totalReadings,
                weight_gain_4pct_count,
                weight_gain_4pct_percent: parseFloat(weight_gain_4pct_percent.toFixed(2))
            },
            patientDetails: patientDetails
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
        const glucoseMatch = detailedValue.match(GLUCOSE_REGEX);
        if (glucoseMatch) {
            result.glucose = parseFloat(glucoseMatch[1]);
        }

        // Extract type
        const typeMatch = detailedValue.match(TYPE_REGEX);
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
    private processGlucoseData(readings: DeviceReading[], practiceId: string): GlucoseMetricsWithPatients {
        if (!readings || readings.length === 0) {
            return {
                metrics: {
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
                },
                patientDetails: {
                    fasting: {
                        readings: [],
                        above_130: [],
                        above_160: [],
                        above_180: [],
                        below_70: [],
                        below_54: []
                    },
                    post_meal: {
                        readings: [],
                        above_180: [],
                        above_200: []
                    },
                    random: {
                        readings: [],
                        above_200: [],
                        below_70: []
                    }
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

        // Track patient details for each category
        const patientDetails: GlucosePatientDetails = {
            fasting: {
                readings: [],
                above_130: [],
                above_160: [],
                above_180: [],
                below_70: [],
                below_54: []
            },
            post_meal: {
                readings: [],
                above_180: [],
                above_200: []
            },
            random: {
                readings: [],
                above_200: [],
                below_70: []
            }
        };

        // Sets to track unique patient IDs
        const uniquePatients = {
            fasting: {
                readings: new Set<string>(),
                above_130: new Set<string>(),
                above_160: new Set<string>(),
                above_180: new Set<string>(),
                below_70: new Set<string>(),
                below_54: new Set<string>()
            },
            post_meal: {
                readings: new Set<string>(),
                above_180: new Set<string>(),
                above_200: new Set<string>()
            },
            random: {
                readings: new Set<string>(),
                above_200: new Set<string>(),
                below_70: new Set<string>()
            }
        };

        for (const reading of readings) {
            if (!reading.detailed_value) {
                continue;
            }

            try {
                const metaGlucose = this.parseGlucoseValue(reading.detailed_value, reading.entry_type);
                const patientSub = reading.patient_sub;

                const glucoseValue = metaGlucose.glucose;
                const glucoseType = metaGlucose.type.toLowerCase();

                if (glucoseValue > 0) {
                    // Categorize by reading type
                    if (glucoseType.includes('fasting')) {
                        fastingTotal++;
                        uniquePatients.fasting.readings.add(patientSub);
                        patientDetails.fasting.readings.push({
                            patient_sub: patientSub,
                            metric_value_detailed: metaGlucose,
                            reading_timestamp: reading.timestamp
                        });

                        if (glucoseValue > GLUCOSE_RANGES.fasting.critical_min) {
                            fastingAbove180++;
                            fastingAbove160++;
                            fastingAbove130++;
                            uniquePatients.fasting.above_180.add(patientSub);
                            uniquePatients.fasting.above_160.add(patientSub);
                            uniquePatients.fasting.above_130.add(patientSub);
                            patientDetails.fasting.above_180.push({
                                patient_sub: patientSub,
                                metric_value_detailed: metaGlucose,
                                reading_timestamp: reading.timestamp
                            });
                            patientDetails.fasting.above_160.push({
                                patient_sub: patientSub,
                                metric_value_detailed: metaGlucose,
                                reading_timestamp: reading.timestamp
                            });
                            patientDetails.fasting.above_130.push({
                                patient_sub: patientSub,
                                metric_value_detailed: metaGlucose,
                                reading_timestamp: reading.timestamp
                            });
                        } else if (glucoseValue > GLUCOSE_RANGES.fasting.very_high_min) {
                            fastingAbove160++;
                            fastingAbove130++;
                            uniquePatients.fasting.above_160.add(patientSub);
                            uniquePatients.fasting.above_130.add(patientSub);
                            patientDetails.fasting.above_160.push({
                                patient_sub: patientSub,
                                metric_value_detailed: metaGlucose,
                                reading_timestamp: reading.timestamp
                            });
                            patientDetails.fasting.above_130.push({
                                patient_sub: patientSub,
                                metric_value_detailed: metaGlucose,
                                reading_timestamp: reading.timestamp
                            });
                        } else if (glucoseValue > GLUCOSE_RANGES.fasting.high_min) {
                            fastingAbove130++;
                            uniquePatients.fasting.above_130.add(patientSub);
                            patientDetails.fasting.above_130.push({
                                patient_sub: patientSub,
                                metric_value_detailed: metaGlucose,
                                reading_timestamp: reading.timestamp
                            });
                        }

                        if (glucoseValue < GLUCOSE_RANGES.fasting.severe_low_max) {
                            fastingBelow54++;
                            fastingBelow70++;
                            uniquePatients.fasting.below_54.add(patientSub);
                            uniquePatients.fasting.below_70.add(patientSub);
                            patientDetails.fasting.below_54.push({
                                patient_sub: patientSub,
                                metric_value_detailed: metaGlucose,
                                reading_timestamp: reading.timestamp
                            });
                            patientDetails.fasting.below_70.push({
                                patient_sub: patientSub,
                                metric_value_detailed: metaGlucose,
                                reading_timestamp: reading.timestamp
                            });
                        } else if (glucoseValue < GLUCOSE_RANGES.fasting.low_max) {
                            fastingBelow70++;
                            uniquePatients.fasting.below_70.add(patientSub);
                            patientDetails.fasting.below_70.push({
                                patient_sub: patientSub,
                                metric_value_detailed: metaGlucose,
                                reading_timestamp: reading.timestamp
                            });
                        }
                    } else if (glucoseType.includes('post') || glucoseType.includes('meal')) {
                        postMealTotal++;
                        uniquePatients.post_meal.readings.add(patientSub);
                        patientDetails.post_meal.readings.push({
                            patient_sub: patientSub,
                            metric_value_detailed: metaGlucose,
                            reading_timestamp: reading.timestamp
                        });

                        if (glucoseValue > GLUCOSE_RANGES.post_meal.critical_min) {
                            postMealAbove200++;
                            postMealAbove180++;
                            uniquePatients.post_meal.above_200.add(patientSub);
                            uniquePatients.post_meal.above_180.add(patientSub);
                            patientDetails.post_meal.above_200.push({
                                patient_sub: patientSub,
                                metric_value_detailed: metaGlucose,
                                reading_timestamp: reading.timestamp
                            });
                            patientDetails.post_meal.above_180.push({
                                patient_sub: patientSub,
                                metric_value_detailed: metaGlucose,
                                reading_timestamp: reading.timestamp
                            });
                        } else if (glucoseValue > GLUCOSE_RANGES.post_meal.high_min) {
                            postMealAbove180++;
                            uniquePatients.post_meal.above_180.add(patientSub);
                            patientDetails.post_meal.above_180.push({
                                patient_sub: patientSub,
                                metric_value_detailed: metaGlucose,
                                reading_timestamp: reading.timestamp
                            });
                        }
                    } else {  // Random/Normal readings
                        randomTotal++;
                        uniquePatients.random.readings.add(patientSub);
                        patientDetails.random.readings.push({
                            patient_sub: patientSub,
                            metric_value_detailed: metaGlucose,
                            reading_timestamp: reading.timestamp
                        });

                        if (glucoseValue > GLUCOSE_RANGES.random.high_min) {
                            randomAbove200++;
                            uniquePatients.random.above_200.add(patientSub);
                            patientDetails.random.above_200.push({
                                patient_sub: patientSub,
                                metric_value_detailed: metaGlucose,
                                reading_timestamp: reading.timestamp
                            });
                        }

                        if (glucoseValue < GLUCOSE_RANGES.random.low_max) {
                            randomBelow70++;
                            uniquePatients.random.below_70.add(patientSub);
                            patientDetails.random.below_70.push({
                                patient_sub: patientSub,
                                metric_value_detailed: metaGlucose,
                                reading_timestamp: reading.timestamp
                            });
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
            metrics: {
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
            },
            patientDetails: patientDetails
        };
    }


    /**
     * Get alert metrics (critical alerts and escalations) for a group of patients
     */
    private async getAlertMetrics(
        patientIds: string[],
        startDate?: Date,
        endDate?: Date,
        practiceId?: string,
    ): Promise<AlertMetricsWithPatients> {
        if (!patientIds || patientIds.length === 0) {
            return {
                metrics: {
                    total_readings: 0,
                    critical_alerts_count: 0,
                    critical_alerts_percent: 0,
                    escalations_count: 0,
                    escalations_percent: 0,
                    total_alerts_count: 0,
                    total_alerts_percent: 0,
                    total_alerts_patients_count: 0
                },
                patientDetails: {
                    critical_alerts: [],
                    escalations: [],
                    total_alerts: []
                }
            };
        }

        // Use BigInt for accumulating counts to prevent integer overflow
        let totalReadings = 0n;
        let criticalAlerts = 0n;
        let outOfRangeAlerts = 0n;
        let escalations = 0n;

        // Track patient details for alerts
        const patientDetails: AlertPatientDetails = {
            critical_alerts: [],
            escalations: [],
            total_alerts: []
        };

        // Track unique patient sets
        const criticalAlertPatients = new Set<string>();
        const escalationPatients = new Set<string>();
        const totalAlertPatients = new Set<string>();

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

                    // Get critical alerts
                    const criticalQuery = `
                        SELECT patient_sub,
                               timestamp,
                               device_name,
                               detailed_value
                        FROM device_data_transmission
                        WHERE trim(patient_sub) IN (${placeholders})
                          AND critical_alert = 1
                            ${dateConditions}
                    `;

                    const criticalResults = await queryRunner.query(criticalQuery, baseParams);
                    const chunkCritical = BigInt(String(criticalResults.length || '0'));
                    criticalAlerts += chunkCritical;

                    // Add to patient details for critical alerts
                    for (const alert of criticalResults) {
                        patientDetails.critical_alerts.push({
                            patient_sub: alert.patient_sub,
                            reading_timestamp: alert.timestamp,
                            metric_value_detailed: {"value": 1}
                        });
                        criticalAlertPatients.add(alert.patient_sub);
                    }

                    // Get out of range alerts
                    const outOfRangeQuery = `
                        SELECT patient_sub,
                               timestamp,
                               device_name,
                               detailed_value
                        FROM device_data_transmission
                        WHERE trim(patient_sub) IN (${placeholders})
                          AND out_of_range_alert = 1
                            ${dateConditions}
                    `;

                    const outOfRangeResults = await queryRunner.query(outOfRangeQuery, baseParams);
                    const chunkOutOfRange = BigInt(String(outOfRangeResults.length || '0'));
                    outOfRangeAlerts += chunkOutOfRange;

                    // Add to patient details for out of range alerts
                    for (const alert of outOfRangeResults) {
                        patientDetails.total_alerts.push({
                            patient_sub: alert.patient_sub,
                            reading_timestamp: alert.timestamp,
                            metric_value_detailed: {"value": 1}
                        });
                        totalAlertPatients.add(alert.patient_sub);
                    }

                    // Get escalations (external alerts)
                    const escalationQuery = `
                        SELECT patient_sub,
                               timestamp,
                               device_name,
                               detailed_value,
                               ext_alert_comments
                        FROM device_data_transmission
                        WHERE trim(patient_sub) IN (${placeholders})
                          AND ext_alert = 1
                            ${dateConditions}
                    `;

                    const escalationResults = await queryRunner.query(escalationQuery, baseParams);
                    const chunkEscalations = BigInt(String(escalationResults.length || '0'));
                    escalations += chunkEscalations;

                    // Add to patient details for escalations
                    for (const alert of escalationResults) {
                        patientDetails.escalations.push({
                            patient_sub: alert.patient_sub,
                            reading_timestamp: alert.timestamp,
                            metric_value_detailed: {"value": 1},
                        });
                        escalationPatients.add(alert.patient_sub);
                    }

                } finally {
                    await queryRunner.release();
                }
            }

            // Log the raw BigInt values before conversion
            this.logger.log(`Raw BigInt counts - totalReadings: ${totalReadings}, criticalAlerts: ${criticalAlerts}, outOfRangeAlerts: ${outOfRangeAlerts}, escalations: ${escalations}`);

            // Convert BigInt to Number for the final result
            const totalReadingsNum = Number(totalReadings);
            const criticalAlertsNum = Number(criticalAlerts);
            const outOfRangeAlertsNum = Number(outOfRangeAlerts);
            const escalationsNum = Number(escalations);
            const totalAlertsNum = outOfRangeAlertsNum;

            // Calculate percentages
            const criticalAlertsPercent = totalReadingsNum > 0 ? (criticalAlertsNum / totalReadingsNum * 100) : 0;
            const escalationsPercent = totalReadingsNum > 0 ? (escalationsNum / totalReadingsNum * 100) : 0;
            const totalAlertsPercent = totalReadingsNum > 0 ? (outOfRangeAlertsNum / totalReadingsNum * 100) : 0;

            // Log the final calculated values
            this.logger.log(`Final counts - totalReadings: ${totalReadingsNum}, criticalAlerts: ${criticalAlertsNum}, outOfRangeAlerts: ${outOfRangeAlertsNum}, totalAlerts: ${totalAlertsNum}, escalations: ${escalationsNum}`);
            this.logger.log(`Patient counts - criticalAlertPatients: ${criticalAlertPatients.size}, escalationPatients: ${escalationPatients.size}, totalAlertPatients: ${totalAlertPatients.size}`);

            return {
                metrics: {
                    total_readings: totalReadingsNum,
                    critical_alerts_count: criticalAlertsNum,
                    critical_alerts_percent: parseFloat(criticalAlertsPercent.toFixed(2)),
                    escalations_count: escalationsNum,
                    escalations_percent: parseFloat(escalationsPercent.toFixed(2)),
                    total_alerts_count: outOfRangeAlertsNum,
                    total_alerts_percent: parseFloat(totalAlertsPercent.toFixed(2)),
                    total_alerts_patients_count: totalAlertPatients.size
                },
                patientDetails: patientDetails
            };
        } catch (error) {
            this.logger.error(`Error retrieving alert metrics: ${error.message}`);
            this.logger.error(error.stack);
            return {
                metrics: {
                    total_readings: 0,
                    critical_alerts_count: 0,
                    critical_alerts_percent: 0,
                    escalations_count: 0,
                    escalations_percent: 0,
                    total_alerts_count: 0,
                    total_alerts_percent: 0,
                    total_alerts_patients_count: 0
                },
                patientDetails: {
                    critical_alerts: [],
                    escalations: [],
                    total_alerts: []
                }
            };
        }
    }


    /**
     * Store calculated clinical metrics in the database
     * Modified to avoid long-running transactions
     */
    private async storeClinicalMetrics(
        summaryDate: string,
        practiceId: string,
        enrollmentPeriod: string,
        bpMetricsData: BpMetricsWithPatients,
        oximeterMetricsData: OximeterMetricsWithPatients,
        weightMetricsData: WeightMetricsWithPatients,
        glucoseMetricsData: GlucoseMetricsWithPatients,
        alertMetricsData: AlertMetricsWithPatients
    ): Promise<void> {
        try {
            const dataSource = await this.databaseService.getConnection(practiceId);
            let summaryId: number;

            // Calculate unique patient counts for various metrics
            const uniqueBpPatients = new Set(bpMetricsData.patientDetails.bp_readings.map(p => p.patient_sub)).size;
            const uniqueBpAbnormalPatients = new Set(bpMetricsData.patientDetails.bp_abnormal.map(p => p.patient_sub)).size;
            const uniqueBpArrhythmiaPatients = new Set(bpMetricsData.patientDetails.bp_arrhythmia.map(p => p.patient_sub)).size;
            const uniqueBpNormalPatients = new Set(bpMetricsData.patientDetails.bp_normal.map(p => p.patient_sub)).size;
            const uniqueBpSysGt130DiaGt80Patients = new Set(bpMetricsData.patientDetails.bp_sys_gt_130_dia_gt_80.map(p => p.patient_sub)).size;
            const uniqueBpSysGt140DiaGt80Patients = new Set(bpMetricsData.patientDetails.bp_sys_gt_140_dia_gt_80.map(p => p.patient_sub)).size;
            const uniqueBpSysGt150DiaGt80Patients = new Set(bpMetricsData.patientDetails.bp_sys_gt_150_dia_gt_80.map(p => p.patient_sub)).size;
            const uniqueBpSysGt160DiaGt80Patients = new Set(bpMetricsData.patientDetails.bp_sys_gt_160_dia_gt_80.map(p => p.patient_sub)).size;
            const uniqueBpSysLt90DiaLt60Patients = new Set(bpMetricsData.patientDetails.bp_sys_lt_90_dia_lt_60.map(p => p.patient_sub)).size;
            const uniqueBpHrAbnormalPatients = new Set(bpMetricsData.patientDetails.bp_hr_abnormal.map(p => p.patient_sub)).size;

            // Calculate unique patient counts for oximeter metrics
            const uniqueSpo2Patients = new Set(oximeterMetricsData.patientDetails.spo2_readings.map(p => p.patient_sub)).size;
            const uniqueSpo2_90_92_Patients = new Set(oximeterMetricsData.patientDetails.spo2_90_92.map(p => p.patient_sub)).size;
            const uniqueSpo2_88_89_Patients = new Set(oximeterMetricsData.patientDetails.spo2_88_89.map(p => p.patient_sub)).size;
            const uniqueSpo2Below88Patients = new Set(oximeterMetricsData.patientDetails.spo2_below_88.map(p => p.patient_sub)).size;

            // Calculate unique patient counts for weight metrics
            const uniqueWeightPatients = new Set(weightMetricsData.patientDetails.weight_readings.map(p => p.patient_sub)).size;
            const uniqueWeightGain4PctPatients = new Set(weightMetricsData.patientDetails.weight_gain_4pct.map(p => p.patient_sub)).size;

            // Calculate unique patient counts for glucose metrics
            const uniqueGlucoseFastingPatients = new Set(glucoseMetricsData.patientDetails.fasting.readings.map(p => p.patient_sub)).size;
            const uniqueGlucoseFastingAbove130Patients = new Set(glucoseMetricsData.patientDetails.fasting.above_130.map(p => p.patient_sub)).size;
            const uniqueGlucoseFastingAbove160Patients = new Set(glucoseMetricsData.patientDetails.fasting.above_160.map(p => p.patient_sub)).size;
            const uniqueGlucoseFastingAbove180Patients = new Set(glucoseMetricsData.patientDetails.fasting.above_180.map(p => p.patient_sub)).size;
            const uniqueGlucoseFastingBelow70Patients = new Set(glucoseMetricsData.patientDetails.fasting.below_70.map(p => p.patient_sub)).size;
            const uniqueGlucoseFastingBelow54Patients = new Set(glucoseMetricsData.patientDetails.fasting.below_54.map(p => p.patient_sub)).size;

            const uniqueGlucosePostmealPatients = new Set(glucoseMetricsData.patientDetails.post_meal.readings.map(p => p.patient_sub)).size;
            const uniqueGlucosePostmealAbove180Patients = new Set(glucoseMetricsData.patientDetails.post_meal.above_180.map(p => p.patient_sub)).size;
            const uniqueGlucosePostmealAbove200Patients = new Set(glucoseMetricsData.patientDetails.post_meal.above_200.map(p => p.patient_sub)).size;

            const uniqueGlucoseRandomPatients = new Set(glucoseMetricsData.patientDetails.random.readings.map(p => p.patient_sub)).size;
            const uniqueGlucoseRandomAbove200Patients = new Set(glucoseMetricsData.patientDetails.random.above_200.map(p => p.patient_sub)).size;
            const uniqueGlucoseRandomBelow70Patients = new Set(glucoseMetricsData.patientDetails.random.below_70.map(p => p.patient_sub)).size;

            // Calculate unique patient counts for alert metrics
            const uniqueCriticalAlertsPatients = new Set(alertMetricsData.patientDetails.critical_alerts.map(p => p.patient_sub)).size;
            const uniqueEscalationsPatients = new Set(alertMetricsData.patientDetails.escalations.map(p => p.patient_sub)).size;
            const uniqueTotalAlertsPatients = new Set(alertMetricsData.patientDetails.total_alerts.map(p => p.patient_sub)).size;


            // Step 1: Check if record exists and get ID or create new record
            // This is a relatively small operation, so should complete quickly
            const bpMetrics = bpMetricsData.metrics;
            const oximeterMetrics = oximeterMetricsData.metrics;
            const weightMetrics = weightMetricsData.metrics;
            const fasting = glucoseMetricsData.metrics.fasting;
            const postMeal = glucoseMetricsData.metrics.post_meal;
            const randomGlucose = glucoseMetricsData.metrics.random;
            const alertMetrics = alertMetricsData.metrics;

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

                if (result && result.length > 0) {
                    summaryId = result[0].id;
                    // Update existing record
                    await queryRunner.query(updateQuery, [
                        // Blood Pressure Metrics
                        bpMetrics.total,
                        uniqueBpPatients,
                        bpMetrics.abnormal_count,
                        bpMetrics.abnormal_percent,
                        uniqueBpAbnormalPatients,
                        bpMetrics.avg_sys,
                        bpMetrics.avg_dia,
                        bpMetrics.avg_hr,
                        bpMetrics.arrhythmia_count,
                        bpMetrics.arrhythmia_percent,
                        uniqueBpArrhythmiaPatients,
                        bpMetrics.normal_count,
                        bpMetrics.normal_percent,
                        uniqueBpNormalPatients,
                        bpMetrics.normal_avg_sys,
                        bpMetrics.normal_avg_dia,
                        bpMetrics.normal_avg_hr,

                        // BP Threshold Metrics with patient counts
                        bpMetrics.sys_gt_130_dia_gt_80_count,
                        bpMetrics.sys_gt_130_dia_gt_80_percent,
                        uniqueBpSysGt130DiaGt80Patients,
                        bpMetrics.sys_gt_140_dia_gt_80_count,
                        bpMetrics.sys_gt_140_dia_gt_80_percent,
                        uniqueBpSysGt140DiaGt80Patients,
                        bpMetrics.sys_gt_150_dia_gt_80_count,
                        bpMetrics.sys_gt_150_dia_gt_80_percent,
                        uniqueBpSysGt150DiaGt80Patients,
                        bpMetrics.sys_gt_160_dia_gt_80_count,
                        bpMetrics.sys_gt_160_dia_gt_80_percent,
                        uniqueBpSysGt160DiaGt80Patients,
                        bpMetrics.sys_lt_90_dia_lt_60_count,
                        bpMetrics.sys_lt_90_dia_lt_60_percent,
                        uniqueBpSysLt90DiaLt60Patients,
                        bpMetrics.hr_abnormal_count,
                        bpMetrics.hr_abnormal_percent,
                        uniqueBpHrAbnormalPatients,

                        // Pulse Oximeter Metrics
                        oximeterMetrics.total,
                        uniqueSpo2Patients,
                        oximeterMetrics.spo2_90_92_count,
                        oximeterMetrics.spo2_90_92_percent,
                        uniqueSpo2_90_92_Patients,
                        oximeterMetrics.spo2_88_89_count,
                        oximeterMetrics.spo2_88_89_percent,
                        uniqueSpo2_88_89_Patients,
                        oximeterMetrics.spo2_below_88_count,
                        oximeterMetrics.spo2_below_88_percent,
                        uniqueSpo2Below88Patients,

                        // Weight Metrics
                        weightMetrics.total,
                        uniqueWeightPatients,
                        weightMetrics.weight_gain_4pct_count,
                        weightMetrics.weight_gain_4pct_percent,
                        uniqueWeightGain4PctPatients,

                        // Glucose Metrics - Fasting
                        fasting.total,
                        uniqueGlucoseFastingPatients,
                        fasting.above_130_count,
                        fasting.above_130_percent,
                        uniqueGlucoseFastingAbove130Patients,
                        fasting.above_160_count,
                        fasting.above_160_percent,
                        uniqueGlucoseFastingAbove160Patients,
                        fasting.above_180_count,
                        fasting.above_180_percent,
                        uniqueGlucoseFastingAbove180Patients,
                        fasting.below_70_count,
                        fasting.below_70_percent,
                        uniqueGlucoseFastingBelow70Patients,
                        fasting.below_54_count,
                        fasting.below_54_percent,
                        uniqueGlucoseFastingBelow54Patients,

                        // Glucose Metrics - Post Meal
                        postMeal.total,
                        uniqueGlucosePostmealPatients,
                        postMeal.above_180_count,
                        postMeal.above_180_percent,
                        uniqueGlucosePostmealAbove180Patients,
                        postMeal.above_200_count,
                        postMeal.above_200_percent,
                        uniqueGlucosePostmealAbove200Patients,

                        // Glucose Metrics - Random
                        randomGlucose.total,
                        uniqueGlucoseRandomPatients,
                        randomGlucose.above_200_count,
                        randomGlucose.above_200_percent,
                        uniqueGlucoseRandomAbove200Patients,
                        randomGlucose.below_70_count,
                        randomGlucose.below_70_percent,
                        uniqueGlucoseRandomBelow70Patients,

                        // Alert Metrics
                        alertMetrics.critical_alerts_count,
                        alertMetrics.critical_alerts_percent,
                        uniqueCriticalAlertsPatients,
                        alertMetrics.escalations_count,
                        alertMetrics.escalations_percent,
                        uniqueEscalationsPatients,
                        alertMetrics.total_alerts_count,
                        alertMetrics.total_alerts_percent,
                        uniqueTotalAlertsPatients,


                        // Record ID
                        summaryId
                    ]);

                    this.logger.log(`Updated clinical metrics for practice ${practiceId} in period ${enrollmentPeriod}`);
                } else {
                    // Insert new record
                    const insertResult = await queryRunner.query(insertQuery, [
                        // Basic Info
                        summaryDate,
                        practiceId,
                        enrollmentPeriod,

                        // Blood Pressure Metrics with patient counts
                        bpMetrics.total,
                        uniqueBpPatients,
                        bpMetrics.abnormal_count,
                        bpMetrics.abnormal_percent,
                        uniqueBpAbnormalPatients,
                        bpMetrics.avg_sys,
                        bpMetrics.avg_dia,
                        bpMetrics.avg_hr,
                        bpMetrics.arrhythmia_count,
                        bpMetrics.arrhythmia_percent,
                        uniqueBpArrhythmiaPatients,
                        bpMetrics.normal_count,
                        bpMetrics.normal_percent,
                        uniqueBpNormalPatients,
                        bpMetrics.normal_avg_sys,
                        bpMetrics.normal_avg_dia,
                        bpMetrics.normal_avg_hr,

                        // BP Threshold Metrics with patient counts
                        bpMetrics.sys_gt_130_dia_gt_80_count,
                        bpMetrics.sys_gt_130_dia_gt_80_percent,
                        uniqueBpSysGt130DiaGt80Patients,
                        bpMetrics.sys_gt_140_dia_gt_80_count,
                        bpMetrics.sys_gt_140_dia_gt_80_percent,
                        uniqueBpSysGt140DiaGt80Patients,
                        bpMetrics.sys_gt_150_dia_gt_80_count,
                        bpMetrics.sys_gt_150_dia_gt_80_percent,
                        uniqueBpSysGt150DiaGt80Patients,
                        bpMetrics.sys_gt_160_dia_gt_80_count,
                        bpMetrics.sys_gt_160_dia_gt_80_percent,
                        uniqueBpSysGt160DiaGt80Patients,
                        bpMetrics.sys_lt_90_dia_lt_60_count,
                        bpMetrics.sys_lt_90_dia_lt_60_percent,
                        uniqueBpSysLt90DiaLt60Patients,
                        bpMetrics.hr_abnormal_count,
                        bpMetrics.hr_abnormal_percent,
                        uniqueBpHrAbnormalPatients,

                        // Pulse Oximeter Metrics with patient counts
                        oximeterMetrics.total,
                        uniqueSpo2Patients,
                        oximeterMetrics.spo2_90_92_count,
                        oximeterMetrics.spo2_90_92_percent,
                        uniqueSpo2_90_92_Patients,
                        oximeterMetrics.spo2_88_89_count,
                        oximeterMetrics.spo2_88_89_percent,
                        uniqueSpo2_88_89_Patients,
                        oximeterMetrics.spo2_below_88_count,
                        oximeterMetrics.spo2_below_88_percent,
                        uniqueSpo2Below88Patients,

                        // Weight Metrics with patient counts
                        weightMetrics.total,
                        uniqueWeightPatients,
                        weightMetrics.weight_gain_4pct_count,
                        weightMetrics.weight_gain_4pct_percent,
                        uniqueWeightGain4PctPatients,

                        // Glucose Metrics - Fasting with patient counts
                        fasting.total,
                        uniqueGlucoseFastingPatients,
                        fasting.above_130_count,
                        fasting.above_130_percent,
                        uniqueGlucoseFastingAbove130Patients,
                        fasting.above_160_count,
                        fasting.above_160_percent,
                        uniqueGlucoseFastingAbove160Patients,
                        fasting.above_180_count,
                        fasting.above_180_percent,
                        uniqueGlucoseFastingAbove180Patients,
                        fasting.below_70_count,
                        fasting.below_70_percent,
                        uniqueGlucoseFastingBelow70Patients,
                        fasting.below_54_count,
                        fasting.below_54_percent,
                        uniqueGlucoseFastingBelow54Patients,

                        // Glucose Metrics - Post Meal with patient counts
                        postMeal.total,
                        uniqueGlucosePostmealPatients,
                        postMeal.above_180_count,
                        postMeal.above_180_percent,
                        uniqueGlucosePostmealAbove180Patients,
                        postMeal.above_200_count,
                        postMeal.above_200_percent,
                        uniqueGlucosePostmealAbove200Patients,

                        // Glucose Metrics - Random with patient counts
                        randomGlucose.total,
                        uniqueGlucoseRandomPatients,
                        randomGlucose.above_200_count,
                        randomGlucose.above_200_percent,
                        uniqueGlucoseRandomAbove200Patients,
                        randomGlucose.below_70_count,
                        randomGlucose.below_70_percent,
                        uniqueGlucoseRandomBelow70Patients,

                        // Alert Metrics with patient counts
                        alertMetrics.critical_alerts_count,
                        alertMetrics.critical_alerts_percent,
                        uniqueCriticalAlertsPatients,
                        alertMetrics.escalations_count,
                        alertMetrics.escalations_percent,
                        uniqueEscalationsPatients,
                        alertMetrics.total_alerts_count,
                        alertMetrics.total_alerts_percent,
                        uniqueTotalAlertsPatients,
                    ]);

                    // Get the ID of the newly inserted record
                    summaryId = insertResult.insertId;
                    this.logger.log(`Inserted new clinical metrics for practice ${practiceId} in period ${enrollmentPeriod}`);
                }
            } finally {
                await queryRunner.release();
            }

            if (!summaryId) {
                throw new Error("Failed to obtain summary ID for patient details");
            }

            // Step 2: Delete existing patient details for this summary
            // This is done outside the previous transaction to avoid long locks
            const deleteRunner = dataSource.createQueryRunner();
            try {
                await deleteRunner.query(`
                DELETE FROM clinical_metrics_patient_details
                WHERE clinical_metrics_summary_id = ?
            `, [summaryId]);
                this.logger.log(`Deleted existing patient details for summary ID ${summaryId}`);
            } finally {
                await deleteRunner.release();
            }

            // Step 3: Prepare all patient details for batch insertion
            const patientDetailsValues = [];

            // Add all patient details to the values array
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, bpMetricsData.patientDetails.bp_readings, 'bp_reading');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, bpMetricsData.patientDetails.bp_abnormal, 'bp_abnormal');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, bpMetricsData.patientDetails.bp_arrhythmia, 'bp_arrhythmia');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, bpMetricsData.patientDetails.bp_normal, 'bp_normal');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, bpMetricsData.patientDetails.bp_sys_gt_130_dia_gt_80, 'bp_sys_gt_130_dia_gt_80');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, bpMetricsData.patientDetails.bp_sys_gt_140_dia_gt_80, 'bp_sys_gt_140_dia_gt_80');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, bpMetricsData.patientDetails.bp_sys_gt_150_dia_gt_80, 'bp_sys_gt_150_dia_gt_80');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, bpMetricsData.patientDetails.bp_sys_gt_160_dia_gt_80, 'bp_sys_gt_160_dia_gt_80');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, bpMetricsData.patientDetails.bp_sys_lt_90_dia_lt_60, 'bp_sys_lt_90_dia_lt_60');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, bpMetricsData.patientDetails.bp_hr_abnormal, 'bp_hr_abnormal');

            // Oximeter patients
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, oximeterMetricsData.patientDetails.spo2_readings, 'spo2_reading');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, oximeterMetricsData.patientDetails.spo2_90_92, 'spo2_90_92');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, oximeterMetricsData.patientDetails.spo2_88_89, 'spo2_88_89');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, oximeterMetricsData.patientDetails.spo2_below_88, 'spo2_below_88');

            // Weight patients
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, weightMetricsData.patientDetails.weight_readings, 'weight_reading');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, weightMetricsData.patientDetails.weight_gain_4pct, 'weight_gain_4pct');

            // Glucose patients - fasting
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, glucoseMetricsData.patientDetails.fasting.readings, 'glucose_fasting');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, glucoseMetricsData.patientDetails.fasting.above_130, 'glucose_fasting_above_130');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, glucoseMetricsData.patientDetails.fasting.above_160, 'glucose_fasting_above_160');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, glucoseMetricsData.patientDetails.fasting.above_180, 'glucose_fasting_above_180');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, glucoseMetricsData.patientDetails.fasting.below_70, 'glucose_fasting_below_70');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, glucoseMetricsData.patientDetails.fasting.below_54, 'glucose_fasting_below_54');

            // Glucose patients - post meal
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, glucoseMetricsData.patientDetails.post_meal.readings, 'glucose_postmeal');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, glucoseMetricsData.patientDetails.post_meal.above_180, 'glucose_postmeal_above_180');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, glucoseMetricsData.patientDetails.post_meal.above_200, 'glucose_postmeal_above_200');

            // Glucose patients - random
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, glucoseMetricsData.patientDetails.random.readings, 'glucose_random');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, glucoseMetricsData.patientDetails.random.above_200, 'glucose_random_above_200');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, glucoseMetricsData.patientDetails.random.below_70, 'glucose_random_below_70');

            // Alert patients
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, alertMetricsData.patientDetails.critical_alerts, 'critical_alert');
            this.addPatientDetailsToValues(patientDetailsValues, summaryId, alertMetricsData.patientDetails.escalations, 'escalation');

            // Step 4: Insert patient details in small batches (no transaction)
            // Using much smaller batch size to prevent lock timeouts
            const batchSize = 300; // Reduced from 1000 for faster individual operations

            this.logger.log(`Processing ${patientDetailsValues.length} patient detail records in batches of ${batchSize}`);

            for (let i = 0; i < patientDetailsValues.length; i += batchSize) {
                const batch = patientDetailsValues.slice(i, i + batchSize);
                const placeholders = batch.map(() => '(?, ?, ?, ?, ?)').join(', ');
                const flatValues = [];
                for (const item of batch) {
                    flatValues.push(
                        item[0], // summaryId
                        item[1], // patient_sub
                        item[2], // metricName
                        typeof item[3] === 'object' ? JSON.stringify(item[3]) : item[3], // Ensure JSON is stringified
                        item[4] // reading_timestamp
                    );
                }
                const batchRunner = dataSource.createQueryRunner();

                try {
                    await batchRunner.query(`
                        INSERT INTO clinical_metrics_patient_details (clinical_metrics_summary_id,
                                                                      patient_sub,
                                                                      metric_name,
                                                                      metric_value_detailed,
                                                                      reading_timestamp)
                        VALUES ${placeholders}
                    `, flatValues);

                    // Log progress every 20 batches (2000 records)
                    if (i % (batchSize * 20) === 0) {
                        this.logger.log(`Processed ${i} of ${patientDetailsValues.length} patient detail records`);
                    }
                } catch (error) {
                    this.logger.error(`Error inserting batch ${Math.floor(i/batchSize)} of patient details: ${error.message}`);
                    // Continue with next batch instead of failing entire operation
                } finally {
                    await batchRunner.release();
                }
            }

            this.logger.log(`Stored ${patientDetailsValues.length} patient detail records for summary ID ${summaryId}`);
        } catch (error) {
            this.logger.error(`Error storing clinical metrics: ${error.message}`);
            throw error;
        }
    }

    /**
     * Helper method to add patient details to the values array for batch insert
     */
    private addPatientDetailsToValues(
        valuesArray: any[],
        summaryId: number,
        patientDetails: PatientMetricDetail[],
        metricName: string
    ): void {
        for (const detail of patientDetails) {
            if (!detail?.metric_value_detailed || !detail.reading_timestamp) continue;
            valuesArray.push([
                summaryId,
                detail.patient_sub,
                metricName,
                detail.metric_value_detailed,
                detail.reading_timestamp
            ]);
        }
    }
}

/*


 */
