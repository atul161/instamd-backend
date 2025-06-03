import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { differenceInDays } from 'date-fns';
import { PatientEnrollmentPeriod } from "./entity/patient-enrollment.entity";
import {EnrollmentSummary, PracticeDbConfig, practiceList} from "./interface/enrollment-period.interface";
import * as process from "node:process";
import {ClinicalMetricsSummary} from "../clinicMetricsModule/entity/entity";

@Injectable()
export class PatientEnrollmentPeriodsService {
    private readonly logger = new Logger(PatientEnrollmentPeriodsService.name);
    private readonly CHUNK_SIZE = 1000;

    constructor() {}

    /**
     * Main cron job that runs daily to update patient enrollment periods
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async runDailyEnrollmentUpdate() {
        const startTime = new Date();
        this.logger.log(`===== STARTING PATIENT ENROLLMENT TRACKER at ${startTime} =====`);

        try {
            // Get all practice database configs
            const practiceDbConfigs = this.getPracticeDbConfigs();

            // Process each practice's database
            for (const config of practiceDbConfigs) {
                this.logger.log(`Processing practice: ${config.practiceName} (${config.practiceId})`);

                try {
                    // Connect to the practice's database
                    const dataSource = await this.connectToPracticeDb(config);

                    // Ensure the enrollment periods table exists
                    await this.ensureEnrollmentPeriodTableExists(dataSource);

                    // Count total patients for progress tracking
                    const totalPatients = await this.getTotalPatientCount(dataSource);
                    this.logger.log(`Found ${totalPatients} patients with enrollment dates for practice ${config.practiceName}`);

                    // Update enrollment periods in chunks
                    const totalUpdated = await this.updatePatientEnrollmentPeriods(dataSource, config.practiceId);
                    this.logger.log(`Finished updating enrollment periods for ${totalUpdated} patients in practice ${config.practiceName}`);

                    // Generate summary for this practice
                    const summary = await this.getEnrollmentSummary(dataSource);
                    this.logEnrollmentSummary(summary);

                    // Close connection to this practice's database
                    await dataSource.destroy();

                } catch (error) {
                    this.logger.error(`Error processing practice ${config.practiceName}: ${error.message}`);
                    this.logger.error(error.stack);
                    // Continue to next practice instead of failing entire process
                }
            }

            const endTime = new Date();
            const executionTime = endTime.getTime() - startTime.getTime();
            this.logger.log(`===== PATIENT ENROLLMENT PERIOD TRACKING COMPLETED SUCCESSFULLY =====`);
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
     * Get all practice database configurations
     */
    /**
     * Get all practice database configurations
     */
    private getPracticeDbConfigs(): PracticeDbConfig[] {
        // Get practice configurations from config service
        // This could be stored in environment variables, database, or configuration files

        const practiceConfigs: PracticeDbConfig[] = [];

        // Read number of practices from config
        const numberOfPractices = practiceList.length;

        for (let i = 1; i <= numberOfPractices; i++) {
            const practiceId = practiceList[i - 1].practiceId;
            const practiceName = practiceList[i - 1].practiceName;

            if (practiceId) {
                const dbUser = process.env[`PRACTICE_${i-1}_DB_USERNAME`]
                const dbPassword = process.env[`PRACTICE_${i-1}_DB_PASSWORD`]
                practiceConfigs.push({
                    practiceId,
                    practiceName: practiceName,
                    host: practiceList[i - 1].host,
                    port: practiceList[i - 1].port,
                    username: dbUser,
                    password: dbPassword,
                    database: practiceList[i - 1].database,
                });
            }
        }

        this.logger.log(`Found ${practiceConfigs.length} practice database configurations`);
        return practiceConfigs;
    }

    /**
     * Connect to a practice's database
     */
    private async connectToPracticeDb(config: PracticeDbConfig): Promise<DataSource> {
        this.logger.log(`Connecting to database for practice ${config.practiceName}`);

        try {
            const dataSource = new DataSource({
                type: 'mysql',
                connectorPackage: "mysql2",
                host: config.host,
                port: config.port,
                username: config.username,
                password: config.password,
                database: config.database,
                entities: [PatientEnrollmentPeriod, ClinicalMetricsSummary],
                synchronize: false,
                connectTimeout: 30000,
                logging: false,
            });

            await dataSource.initialize();

            this.logger.log(`Successfully connected to database for practice ${config.practiceName}`);
            return dataSource;

        } catch (error) {
            this.logger.error(`Failed to connect to database for practice ${config.practiceName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Ensure the patient_enrollment_periods table exists
     */
    private async ensureEnrollmentPeriodTableExists(dataSource: DataSource): Promise<void> {
        try {
            const queryRunner = dataSource.createQueryRunner();

            // Check if the table exists
            const tableExists = await queryRunner.hasTable('patient_enrollment_periods');

            if (!tableExists) {
                // Create the table if it doesn't exist - MySQL syntax
                await queryRunner.query(`
                CREATE TABLE patient_enrollment_periods (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    patient_sub VARCHAR(200) NOT NULL,
                    reporting_provider VARCHAR(200),
                    practice_id VARCHAR(200),
                    enrollment_period VARCHAR(50) NOT NULL,
                    enrollment_date DATETIME,
                    primary_insurance_type VARCHAR(200),
                    secondary_insurance_type VARCHAR(200),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                `);

                // Create indexes
                await queryRunner.query('CREATE INDEX idx_patient_sub ON patient_enrollment_periods (patient_sub)');
                await queryRunner.query('CREATE INDEX idx_reporting_provider ON patient_enrollment_periods (reporting_provider)');
                await queryRunner.query('CREATE INDEX idx_practice_id ON patient_enrollment_periods (practice_id)');
                await queryRunner.query('CREATE INDEX idx_enrollment_period ON patient_enrollment_periods (enrollment_period)');
                await queryRunner.query('CREATE INDEX idx_primary_insurance ON patient_enrollment_periods (primary_insurance_type)');
                await queryRunner.query('CREATE INDEX idx_secondary_insurance ON patient_enrollment_periods (secondary_insurance_type)');
                await queryRunner.query('CREATE UNIQUE INDEX idx_patient_provider ON patient_enrollment_periods (patient_sub, reporting_provider)');

                this.logger.log('Created patient_enrollment_periods table with primary and secondary insurance columns');
            } else {
                this.logger.log('patient_enrollment_periods table already exists');
            }

            await queryRunner.release();

        } catch (error) {
            this.logger.error(`Error creating/updating enrollment period table: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get total count of patients with enrollment dates
     */
    private async getTotalPatientCount(dataSource: DataSource): Promise<number> {
        try {
            const queryRunner = dataSource.createQueryRunner();

            const result = await queryRunner.query(`
                SELECT COUNT(*) as count
                FROM patient
                WHERE enrollDate IS NOT NULL
            `);

            await queryRunner.release();

            const count = parseInt(result[0].count, 10) || 0;
            this.logger.log(`Total patient count with enrollment dates: ${count}`);
            return count;

        } catch (error) {
            this.logger.error(`Error getting total patient count: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get patients in chunks for efficient processing
     */
    private async getPatientsInChunks(dataSource: DataSource, chunkSize: number, offset: number): Promise<any[]> {
        try {
            this.logger.log(`Fetching patients chunk: size=${chunkSize}, offset=${offset}`);

            const queryRunner = dataSource.createQueryRunner();

            const results = await queryRunner.query(`
                SELECT 
                    sub as patient_sub, 
                    enrollDate as enrollment_date,
                    is_part_b,
                    is_ppo,
                    is_msp,
                    is_hmo,
                    hmoname,
                    pponame,
                    mspname,
                    is_secondary_ins,
                    primary_payername,
                    secondary_payername
                FROM 
                    patient
                WHERE enrollDate IS NOT NULL
                LIMIT ?, ?
            `, [offset, chunkSize]); // MySQL uses ? placeholders in order

            await queryRunner.release();

            this.logger.log(`Retrieved ${results.length} patients from database`);
            return results;

        } catch (error) {
            this.logger.error(`Error retrieving patients chunk: ${error.message}`);
            throw error;
        }
    }

    /**
     * Determine primary insurance type for a patient
     */
    private determinePrimaryInsuranceType(patientData: any): string {
        // Check for Medicare Part B (highest priority)
        if (patientData.is_part_b === 1) {
            return 'Medicare Part B';
        }

        // Check for MSP (Medicare Secondary Payer)
        if (patientData.is_msp === 1) {
            const mspName = patientData.mspname;
            if (mspName && mspName.trim()) {
                return `MSP: ${mspName}`;
            }
            return 'MSP';
        }

        // Check for HMO
        if (patientData.is_hmo === 1) {
            const hmoName = patientData.hmoname;
            if (hmoName && hmoName.trim()) {
                return `HMO: ${hmoName}`;
            }
            return 'HMO';
        }

        // Check for PPO
        if (patientData.is_ppo === 1) {
            const ppoName = patientData.pponame;
            if (ppoName && ppoName.trim()) {
                return `PPO: ${ppoName}`;
            }
            return 'PPO';
        }

        // Check for primary payer name
        const primaryPayer = patientData.primary_payername;
        if (primaryPayer && primaryPayer.trim()) {
            return primaryPayer;
        }

        // Default case
        return 'Unknown';
    }

    /**
     * Determine secondary insurance type for a patient
     */
    private determineSecondaryInsuranceType(patientData: any): string | null {
        // Only check for secondary insurance if the flag is set
        if (patientData.is_secondary_ins !== 1) {
            return null;
        }

        // Get secondary payer name
        const secondaryPayer = patientData.secondary_payername;
        if (secondaryPayer && secondaryPayer.trim()) {
            return secondaryPayer;
        }

        // If we know there's secondary insurance but no name is provided
        return 'Unspecified Secondary';
    }

    /**
     * Determine enrollment period based on enrollment date
     */
    private determineEnrollmentPeriod(enrollmentDate: Date, currentDate: Date = new Date()): string | null {
        if (!enrollmentDate) {
            return null;
        }

        const daysSinceEnrollment = differenceInDays(currentDate, enrollmentDate);

        if (daysSinceEnrollment <= 30) {
            return 'first_month';
        } else if (daysSinceEnrollment <= 90) {
            return '1_3_months';
        } else if (daysSinceEnrollment <= 180) {
            return '4_6_months';
        } else if (daysSinceEnrollment <= 365) {
            return '6_12_months';
        } else {
            return 'overall';
        }
    }

    /**
     * Update enrollment periods for all patients
     */
    private async updatePatientEnrollmentPeriods(dataSource: DataSource, practiceId: string): Promise<number> {
        try {
            // Current date for calculations
            const currentDate = new Date();
            let totalUpdated = 0;
            let offset = 0;
            let batchCount = 0;

            // Process patients in chunks
            while (true) {
                batchCount++;

                // Get the next chunk of patients
                this.logger.log(`Starting batch #${batchCount}: Retrieving chunk of patients (offset: ${offset})`);
                const patients = await this.getPatientsInChunks(dataSource, this.CHUNK_SIZE, offset);

                // If no more patients, break the loop
                if (!patients || patients.length === 0) {
                    this.logger.log('No more patients to process, finished.');
                    break;
                }

                this.logger.log(`Processing batch #${batchCount}: ${patients.length} patients (offset: ${offset})`);
                let patientUpdates = 0;
                let patientInserts = 0;

                try {
                    const queryRunner = dataSource.createQueryRunner();
                    await queryRunner.startTransaction();

                    // Process each patient in the current chunk
                    let patientCount = 0;

                    for (const patient of patients) {
                        patientCount++;
                        if (patientCount % 100 === 0) {
                            this.logger.debug(`Processing patient ${patientCount}/${patients.length} in current batch`);
                        }

                        const patientSub = patient.patient_sub;
                        const reportingProvider = patient.reporting_provider;
                        const enrollmentDate = patient.enrollment_date;

                        if (!enrollmentDate || !patientSub) {
                            continue;
                        }

                        // Determine current enrollment period
                        const enrollmentPeriod = this.determineEnrollmentPeriod(enrollmentDate, currentDate);

                        // Determine primary and secondary insurance types
                        const primaryInsurance = this.determinePrimaryInsuranceType(patient);
                        const secondaryInsurance = this.determineSecondaryInsuranceType(patient);

                        // Check if patient exists in tracking table
                        const existingRecords = await queryRunner.query(`
                            SELECT id, enrollment_period, primary_insurance_type, secondary_insurance_type, reporting_provider, practice_id
                            FROM patient_enrollment_periods
                            WHERE patient_sub = ?
                        `, [patientSub]);

                        const existingRecord = existingRecords.length > 0 ? existingRecords[0] : null;

                        if (existingRecord) {
                            if (existingRecord.enrollment_period !== enrollmentPeriod ||
                                existingRecord.primary_insurance_type !== primaryInsurance ||
                                existingRecord.secondary_insurance_type !== secondaryInsurance ||
                                existingRecord.practice_id !== practiceId) {

                                await queryRunner.query(`
                                    UPDATE patient_enrollment_periods
                                    SET enrollment_period = ?, 
                                        primary_insurance_type = ?, 
                                        secondary_insurance_type = ?,
                                        practice_id = ?,
                                        updated_at = CURRENT_TIMESTAMP
                                    WHERE id = ?
                                `, [
                                    enrollmentPeriod,
                                    primaryInsurance,
                                    secondaryInsurance,
                                    practiceId,
                                    existingRecord.id
                                ]);

                                patientUpdates++;
                            }
                        } else {
                            await queryRunner.query(`
                                INSERT INTO patient_enrollment_periods
                                (patient_sub, reporting_provider, practice_id, enrollment_period, enrollment_date, 
                                primary_insurance_type, secondary_insurance_type, created_at, updated_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                            `, [
                                patientSub,
                                reportingProvider,
                                practiceId,
                                enrollmentPeriod,
                                enrollmentDate,
                                primaryInsurance,
                                secondaryInsurance
                            ]);

                            patientInserts++;
                        }
                    }

                    // Commit changes for this chunk
                    await queryRunner.commitTransaction();
                    await queryRunner.release();

                    totalUpdated += (patientUpdates + patientInserts);
                    this.logger.log(`Batch #${batchCount} completed: ${patientInserts} inserts, ${patientUpdates} updates`);
                    this.logger.log(`Total updated so far: ${totalUpdated} patients`);

                } catch (error) {
                    this.logger.error(`Error processing batch #${batchCount}: ${error.message}`);
                    this.logger.error(error.stack);
                    // Continue to next batch instead of failing entire process
                    this.logger.log(`Continuing to next batch despite error`);
                }

                // Move to the next chunk
                offset += this.CHUNK_SIZE;
                this.logger.log(`Moving to next batch, new offset: ${offset}`);
            }

            this.logger.log(`Process complete! Total patient enrollment periods updated: ${totalUpdated}`);
            return totalUpdated;

        } catch (error) {
            this.logger.error(`Fatal error updating patient enrollment periods: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate enrollment summary statistics
     */
    private async getEnrollmentSummary(dataSource: DataSource): Promise<EnrollmentSummary> {
        try {
            this.logger.log('Generating enrollment summary');

            const queryRunner = dataSource.createQueryRunner();

            // Basic enrollment period summary
            this.logger.log('Querying enrollment period summary');
            const periodResults = await queryRunner.query(`
                SELECT 
                    reporting_provider as clinic_name,
                    practice_id,
                    enrollment_period,
                    COUNT(*) as patient_count
                FROM 
                    patient_enrollment_periods
                GROUP BY 
                    reporting_provider, practice_id, enrollment_period
                ORDER BY 
                    reporting_provider, 
                    FIELD(enrollment_period, 'first_month', '1_3_months', '4_6_months', '6_12_months', 'overall')
            `);

            this.logger.log(`Found ${periodResults.length} enrollment period summary records`);

            // Primary insurance summary
            this.logger.log('Querying primary insurance summary');
            const insuranceResults = await queryRunner.query(`
                SELECT 
                    reporting_provider as clinic_name,
                    practice_id,
                    primary_insurance_type,
                    COUNT(*) as patient_count
                FROM 
                    patient_enrollment_periods
                WHERE
                    primary_insurance_type IS NOT NULL
                GROUP BY 
                    reporting_provider, practice_id, primary_insurance_type
                ORDER BY 
                    reporting_provider, patient_count DESC
            `);

            this.logger.log(`Found ${insuranceResults.length} primary insurance summary records`);

            // Secondary insurance summary
            this.logger.log('Querying secondary insurance summary');
            const secondaryResults = await queryRunner.query(`
                SELECT 
                    reporting_provider as clinic_name,
                    practice_id,
                    secondary_insurance_type,
                    COUNT(*) as patient_count
                FROM 
                    patient_enrollment_periods
                WHERE
                    secondary_insurance_type IS NOT NULL
                GROUP BY 
                    reporting_provider, practice_id, secondary_insurance_type
                ORDER BY 
                    reporting_provider, patient_count DESC
            `);

            this.logger.log(`Found ${secondaryResults.length} secondary insurance summary records`);

            await queryRunner.release();

            // Format period results into a nested dictionary by clinic and period
            const periodSummary = {};
            for (const row of periodResults) {
                const clinic = row.clinic_name;
                const practice = row.practice_id ? row.practice_id : 'Unknown';
                const period = row.enrollment_period;
                const count = parseInt(row.patient_count, 10);

                const clinicKey = `${clinic} (Practice: ${practice})`;

                if (!periodSummary[clinicKey]) {
                    periodSummary[clinicKey] = {
                        first_month: 0,
                        '1_3_months': 0,
                        '4_6_months': 0,
                        '6_12_months': 0,
                        overall: 0,
                    };
                }

                periodSummary[clinicKey][period] = count;
            }

            // Format insurance results by clinic
            const insuranceSummary = {};
            for (const row of insuranceResults) {
                const clinic = row.clinic_name;
                const practice = row.practice_id ? row.practice_id : 'Unknown';
                const insurance = row.primary_insurance_type;
                const count = parseInt(row.patient_count, 10);

                const clinicKey = `${clinic} (Practice: ${practice})`;

                if (!insuranceSummary[clinicKey]) {
                    insuranceSummary[clinicKey] = {};
                }

                insuranceSummary[clinicKey][insurance] = count;
            }

            // Format secondary insurance results by clinic
            const secondarySummary = {};
            for (const row of secondaryResults) {
                const clinic = row.clinic_name;
                const practice = row.practice_id ? row.practice_id : 'Unknown';
                const insurance = row.secondary_insurance_type;
                const count = parseInt(row.patient_count, 10);

                const clinicKey = `${clinic} (Practice: ${practice})`;

                if (!secondarySummary[clinicKey]) {
                    secondarySummary[clinicKey] = {};
                }

                secondarySummary[clinicKey][insurance] = count;
            }

            this.logger.log('Enrollment summary generated successfully');

            return {
                periodSummary,
                primaryInsuranceSummary: insuranceSummary,
                secondaryInsuranceSummary: secondarySummary,
            };

        } catch (error) {
            this.logger.error(`Error generating enrollment summary: ${error.message}`);
            throw error;
        }
    }

    /**
     * Log enrollment summary in a formatted way
     */
    private logEnrollmentSummary(summary: EnrollmentSummary): void {
        this.logger.log('Printing enrollment summary');

        const { periodSummary, primaryInsuranceSummary, secondaryInsuranceSummary } = summary;

        // Log enrollment period summary
        this.logger.log('\nEnrollment Period Summary by Clinic:');
        this.logger.log(`${'Clinic'.padEnd(50)} | ${'First Month'.padStart(12)} | ${'1-3 Months'.padStart(12)} | ${'4-6 Months'.padStart(12)} | ${'6-12 Months'.padStart(12)} | ${'Overall'.padStart(12)}`);
        this.logger.log('-'.repeat(120));

        // Log data for each clinic
        for (const [clinic, periods] of Object.entries(periodSummary)) {
            this.logger.log(`${clinic.substring(0, 50).padEnd(50)} | ${(periods.first_month || 0).toString().padStart(12)} | ${(periods['1_3_months'] || 0).toString().padStart(12)} | ${(periods['4_6_months'] || 0).toString().padStart(12)} | ${(periods['6_12_months'] || 0).toString().padStart(12)} | ${(periods.overall || 0).toString().padStart(12)}`);
        }

        // Log primary insurance summary
        this.logger.log('\nPrimary Insurance Summary by Clinic:');
        for (const [clinic, insurances] of Object.entries(primaryInsuranceSummary)) {
            this.logger.log(`\n${clinic} Primary Insurance Types:`);
            this.logger.log(`${'Insurance Type'.padEnd(40)} | ${'Patient Count'.padStart(12)}`);
            this.logger.log('-'.repeat(55));

            // Sort by count descending
            const sortedInsurances = Object.entries(insurances)
                .sort(([, a], [, b]) => (b as number) - (a as number));

            for (const [insurance, count] of sortedInsurances) {
                this.logger.log(`${insurance.substring(0, 40).padEnd(40)} | ${count.toString().padStart(12)}`);
            }
        }

        // Log secondary insurance summary if any exists
        if (Object.keys(secondaryInsuranceSummary).length > 0) {
            this.logger.log('\nSecondary Insurance Summary by Clinic:');
            for (const [clinic, insurances] of Object.entries(secondaryInsuranceSummary)) {
                if (Object.keys(insurances).length === 0) {
                    continue;
                }

                this.logger.log(`\n${clinic} Secondary Insurance Types:`);
                this.logger.log(`${'Insurance Type'.padEnd(40)} | ${'Patient Count'.padStart(12)}`);
                this.logger.log('-'.repeat(55));

                // Sort by count descending
                const sortedInsurances = Object.entries(insurances)
                    .sort(([, a], [, b]) => (b as number) - (a as number));

                for (const [insurance, count] of sortedInsurances) {
                    this.logger.log(`${insurance.substring(0, 40).padEnd(40)} | ${count.toString().padStart(12)}`);
                }
            }
        }

        this.logger.log('Enrollment summary printed successfully');
    }
}
