import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import {DatabaseModule} from "../../database/database.module";
import {ClinicalService} from "./clinical.service";
import {ClinicalMetricsController} from "./clinical-metrics.controller";
import {CacheModule} from "@nestjs/cache-manager";
import {CptController} from "../cpt.controller";
import {CptService} from "./cpt.service";

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
    controllers: [ClinicalMetricsController,CptController],
    providers: [
        ClinicalService,
        CptService
    ],
    exports: [ ClinicalService],
})
export class ClinicMetricsModule {}
