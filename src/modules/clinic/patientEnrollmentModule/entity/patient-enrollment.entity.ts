import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Entity('patient_enrollment_periods')
@Unique('idx_patient_provider', ['patientSub', 'reportingProvider'])
@Index('idx_patient_sub', ['patientSub'])
@Index('idx_reporting_provider', ['reportingProvider'])
@Index('idx_practice_id', ['practiceId'])
@Index('idx_enrollment_period', ['enrollmentPeriod'])
@Index('idx_primary_insurance', ['primaryInsuranceType'])
@Index('idx_secondary_insurance', ['secondaryInsuranceType'])
export class PatientEnrollmentPeriod {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'patient_sub', length: 200 })
    patientSub: string;

    @Column({ name: 'reporting_provider', length: 200, nullable: true })
    reportingProvider: string;

    @Column({ name: 'practice_id', length: 200, nullable: true })
    practiceId: string;

    @Column({ name: 'enrollment_period', length: 50 })
    enrollmentPeriod: string;

    @Column({ name: 'enrollment_date', type: 'timestamp', nullable: true })
    enrollmentDate: Date;

    @Column({ name: 'primary_insurance_type', length: 200, nullable: true })
    primaryInsuranceType: string;

    @Column({ name: 'secondary_insurance_type', length: 200, nullable: true })
    secondaryInsuranceType: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
