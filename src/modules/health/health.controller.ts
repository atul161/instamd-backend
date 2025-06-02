import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { Throttle } from "@nestjs/throttler";

@Controller('health')
@Throttle({ default: {
    ttl: 60 * 1000,
    limit: 100
  }
})
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
