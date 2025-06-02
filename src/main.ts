import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpStatus, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { Logger } from '@nestjs/common';
import { checkCors } from './common/cors/check-cors';
import { join } from 'path';
import * as express from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ErrorInterceptor } from './common/interceptors/error.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import {AppModule} from "./modules/app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
    cors: {
      origin: (origin, callback) => {
        if (!origin || checkCors(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origin not allowed by CORS'));
        }
      },
      methods: 'GET,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: [
        'Authorization',
        'X-Requested-With',
        'X-HTTP-Method-Override',
        'Content-Type',
        'Accept',
        'Observe',
        'Access-Control-Allow-Origin',
      ].join(','),
      optionsSuccessStatus: HttpStatus.OK,
      preflightContinue: false,
    },
  });

  const globalLogger: Logger = new Logger('Global');
  app.useLogger(globalLogger);

  app.use('/static', express.static(join(__dirname, '..', 'public')));
  app.enableVersioning({
    type: VersioningType.URI, // Use URI-based versioning (e.g., /v1/)
  });
  app.use(helmet());
  app.setBaseViewsDir(join(__dirname, '..', 'views')); // HTML templates
  app.setViewEngine('hbs');
  app.useGlobalInterceptors(
      new ResponseInterceptor(),
      new ErrorInterceptor(),
      // new TimeoutInterceptor(),
      new LoggingInterceptor(),
  );

  // Swagger setup
  const config = new DocumentBuilder()
      .setTitle('InstaMD Next Gen Software')
      .setDescription('API documentation for the WINConnect')
      .setVersion('1.0')
      .build();
  const document = SwaggerModule.createDocument(app, config);
  app.enableShutdownHooks();
  SwaggerModule.setup('api', app, document);
  const port = process.env.PORT ?? 3000;
  try {
    await app.listen(port, '0.0.0.0');
    globalLogger.log(`Application is running on: http://localhost:${port}`);
  } catch (error) {
    globalLogger.error('Failed to start application', error.stack);
  }
}

bootstrap();
