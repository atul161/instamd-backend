import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import {ClinicalMetricsEtlService} from "./clinical-metrics.etl";
import {DatabaseModule} from "../../database/database.module";
import {ClinicalService} from "./clinical.service";
import {ClinicalMetricsController} from "./clinical-metrics.controller";

@Module({
    imports: [
        ConfigModule.forRoot(),
        ScheduleModule.forRoot(),
        DatabaseModule
    ],
    controllers: [ClinicalMetricsController],
    providers: [
        ClinicalMetricsEtlService,
        ClinicalService
    ],
    exports: [ClinicalMetricsEtlService , ClinicalService],
})
export class ClinicMetricsModule {}
