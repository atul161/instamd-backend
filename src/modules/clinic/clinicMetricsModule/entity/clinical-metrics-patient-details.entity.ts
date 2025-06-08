import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ClinicalMetricsSummary } from './entity';

@Entity('clinical_metrics_patient_details')
@Index('idx_summary_id', ['clinicalMetricsSummaryId'])
@Index('idx_patient_sub', ['patientSub'])
@Index('idx_metric_name', ['metricName'])
@Index('idx_summary_metric', ['clinicalMetricsSummaryId', 'metricName'])
export class ClinicalMetricsPatientDetails {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'clinical_metrics_summary_id' })
    clinicalMetricsSummaryId: number;

    @Column({ name: 'patient_sub', length: 200 })
    patientSub: string;

    @Column({ name: 'metric_name', length: 100 })
    metricName: string;

    @Column({ name: 'metric_value', type: 'decimal', precision: 10, scale: 2, nullable: true })
    metricValue: number;

    @Column({ name: 'reading_timestamp', type: 'timestamp', nullable: true })
    readingTimestamp: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @ManyToOne(() => ClinicalMetricsSummary)
    @JoinColumn({ name: 'clinical_metrics_summary_id' })
    summary: ClinicalMetricsSummary;
}
