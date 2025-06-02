import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
  ) { }

  @Get()
  @HealthCheck()
  healthStatus() {
    return {
      "status": "ok",
      "info": {
        "google": {
          "status": "Hello from instamd"
        }
      },
      "error": {},
      "details": {
        "google": {
          "status": "up"
        }
      }
    }
  }
}
