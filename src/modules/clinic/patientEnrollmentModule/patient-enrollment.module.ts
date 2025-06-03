import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import {PatientEnrollmentPeriodsService} from "./patient-enrollment-periods-service";
import {DatabaseModule} from "../../database/database.module";

@Module({
    imports: [
        ConfigModule.forRoot(),
        ScheduleModule.forRoot(),
        DatabaseModule
    ],
    controllers: [],
    providers: [
        PatientEnrollmentPeriodsService,
    ],
    exports: [PatientEnrollmentPeriodsService],
})
export class PatientEnrollmentPeriodsModule {}
