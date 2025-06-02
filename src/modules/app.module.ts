import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import {HealthModule} from "./health/health.module";
import {SwaggerModule} from "@nestjs/swagger";

@Module({
  imports: [ HealthModule , SwaggerModule],
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
