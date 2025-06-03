import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {PracticeDbConfig, practiceList} from "../clinic/patientEnrollmentModule/interface/enrollment-period.interface";
import {PatientEnrollmentPeriod} from "../clinic/patientEnrollmentModule/entity/patient-enrollment.entity";
import * as process from "node:process";
import {ClinicalMetricsSummary} from "../clinic/clinicMetricsModule/entity/entity";

@Injectable()
export class DatabaseService {
    private readonly logger = new Logger(DatabaseService.name);
    private dataSources: Map<string, DataSource> = new Map();

    constructor() {}

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
                const dbUser = process.env[`PRACTICE_${i-1}_DB_USER`]
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
     * Get a practice config by ID
     */
    getPracticeConfig(practiceId: string): PracticeDbConfig | null {
        const allConfigs = this.getPracticeDbConfigs();
        return allConfigs.find(config => config.practiceId === practiceId) || null;
    }

    /**
     * Get a database connection for a specific practice
     * This method will cache the connection for reuse
     */
    async getConnection(practiceId: string): Promise<DataSource> {
        // Check if we already have an initialized connection
        const existingDataSource = this.dataSources.get(practiceId);
        if (existingDataSource && existingDataSource.isInitialized) {
            return existingDataSource;
        }

        // Get practice configuration
        const practiceConfig = this.getPracticeConfig(practiceId);
        if (!practiceConfig) {
            throw new Error(`No configuration found for practice ID: ${practiceId}`);
        }

        // Create and initialize new connection
        try {
            this.logger.log(`Creating database connection for practice ${practiceConfig.practiceName}`);

            const dataSource = new DataSource({
                type: 'mysql',
                host: practiceConfig.host,
                port: practiceConfig.port,
                username: practiceConfig.username,
                password: practiceConfig.password,
                database: practiceConfig.database,
                entities: [PatientEnrollmentPeriod, ClinicalMetricsSummary],
                synchronize: false,
            });

            await dataSource.initialize();

            // Store the connection for reuse
            this.dataSources.set(practiceId, dataSource);

            this.logger.log(`Successfully connected to database for practice ${practiceConfig.practiceName}`);
            return dataSource;
        } catch (error) {
            this.logger.error(`Failed to connect to database for practice ${practiceConfig.practiceName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Close a specific database connection
     */
    async closeConnection(practiceId: string): Promise<void> {
        const dataSource = this.dataSources.get(practiceId);
        if (dataSource && dataSource.isInitialized) {
            await dataSource.destroy();
            this.dataSources.delete(practiceId);
            this.logger.log(`Closed database connection for practice ID: ${practiceId}`);
        }
    }

    /**
     * Close all database connections
     */
    async closeAllConnections(): Promise<void> {
        for (const [practiceId, dataSource] of this.dataSources.entries()) {
            if (dataSource.isInitialized) {
                await dataSource.destroy();
                this.logger.log(`Closed database connection for practice ID: ${practiceId}`);
            }
        }
        this.dataSources.clear();
    }

    /**
     * Connect to a practice's database without caching (for one-time operations)
     * Remember to close this connection when done!
     */
    async connectToPracticeDb(config: PracticeDbConfig): Promise<DataSource> {
        try {
            this.logger.log(`Connecting to database for practice ${config.practiceName}`);

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
}
