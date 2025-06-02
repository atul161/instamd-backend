import { HttpStatus, ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import helmet from "helmet";
import { checkCors } from "./utils/cors";
import * as bodyParser from 'body-parser';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    cors: {
      origin: (origin, callback) => {
        if (!origin || checkCors(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origin not allowed by CORS'));
        }
      },
      methods: 'GET ,PUT, PATCH,POST,DELETE,OPTIONS',
      allowedHeaders:
        'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Observe',
      optionsSuccessStatus: HttpStatus.OK,
      preflightContinue: false,
    },
  });

  // Enable Versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.use(helmet());
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe());
  app.use(helmet());
  app.enableCors();
  app.use(bodyParser.json({limit: '50mb'}));
  app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
  await app.listen(3000, '0.0.0.0');
}
process.on('unhandledRejection', (reason, promise) => {
  console.log(reason);
});

bootstrap();
