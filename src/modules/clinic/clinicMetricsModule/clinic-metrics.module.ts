import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import {ClinicalMetricsEtlService} from "./clinical-metrics.etl";
import {DatabaseModule} from "../../database/database.module";

@Module({
    imports: [
        ConfigModule.forRoot(),
        ScheduleModule.forRoot(),
        DatabaseModule
    ],
    controllers: [],
    providers: [
        ClinicalMetricsEtlService
    ],
    exports: [ClinicalMetricsEtlService],
})
export class ClinicMetricsModule {}
