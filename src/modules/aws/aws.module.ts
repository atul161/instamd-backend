import { Module } from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Module({
  providers: [
    {
      provide: 'SQS',
      useFactory: () => {
        return new AWS.SQS({
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        });
      },
    },
  ],
  exports: ['SQS'],
})
export class AwsModule {}
