import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import {HealthModule} from "./health/health.module";
import {SwaggerModule} from "@nestjs/swagger";
import {PatientEnrollmentPeriodsModule} from "./clinic/patientEnrollmentModule/patient-enrollment.module";
import {ClinicMetricsModule} from "./clinic/clinicMetricsModule/clinic-metrics.module";
import {DatabaseModule} from "./database/database.module";

@Module({
  imports: [ HealthModule , SwaggerModule , DatabaseModule , PatientEnrollmentPeriodsModule , ClinicMetricsModule],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply()
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
