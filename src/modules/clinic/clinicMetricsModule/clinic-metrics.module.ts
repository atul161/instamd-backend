import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import {DatabaseModule} from "../../database/database.module";
import {ClinicalService} from "./clinical.service";
import {CacheModule} from "@nestjs/cache-manager";
import {CptController} from "../cpt.controller";
import {CptService} from "./cpt.service";
import {CptInsuranceController} from "../cpt-insurance.controller";
import { CptInsuranceService } from '../cpt-insurance.service';
import {ClinicalMetricsController} from "./clinical-metrics.controller";

@Module({
    imports: [
        CacheModule.registerAsync({
            isGlobal: true,
            useFactory: () => ({
                ttl: 300000 * 12,
                max: 200,
            }),
        }),
        ConfigModule.forRoot(),
        ScheduleModule.forRoot(),
        DatabaseModule
    ],
    controllers: [ClinicalMetricsController,CptController,CptInsuranceController],
    providers: [
        ClinicalService,
        CptService,
        CptInsuranceService,
    ],
    exports: [ ClinicalService],
})
export class ClinicMetricsModule {}
