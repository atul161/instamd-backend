export class CptBillableMetricsDto {
    id: number;
    practice_id: string;
    month_year: string;
    month_name: string;
    year_value: number;
    month_start: Date;
    month_end: Date;
    unique_billable_99453_patient_count: number;
    unique_billable_99454_patient_count: number;
    unique_billable_99457_patient_count: number;
    unique_billable_99458_1_patient_count: number;
    unique_billable_99458_2_patient_count: number;
    unique_billable_total_patient_count: number;
    total_billable_99453_patient_count: number;
    total_billable_99454_patient_count: number;
    total_billable_99457_patient_count: number;
    total_billable_99458_1_patient_count: number;
    total_billable_99458_2_patient_count: number;
    total_billable_rows_count: number;
    total_billable_all_cpt_flags_count: number;
    unique_billable_99453_99454_patient_count: number;
    unique_billable_99453_99454_99457_patient_count: number;
    unique_billable_99453_99454_99457_99458_1_patient_count: number;
    unique_billable_all_five_cpt_patient_count: number;
    total_billable_99453_99454_patient_count: number;
    total_billable_99453_99454_99457_patient_count: number;
    total_billable_99453_99454_99457_99458_1_patient_count: number;
    total_billable_all_five_cpt_patient_count: number;
    billing_cycles_with_billable_items: number;
    calculation_date: Date;
    last_updated: Date;
    created_at: Date;
    updated_at: Date;
}

export class CptBillableMetricsResponseDto {
    status: string;
    data: CptBillableMetricsDto[];
    metadata: {
        total_records: number;
        practice_id: string;
        timestamp: string;
    };
}

export class CptBillableMetricsSummaryDto {
    practice_id: string;
    total_unique_patients: number;
    total_billable_items: number;
    months_with_data: number;
    latest_month: string;
    cpt_code_breakdown: {
        cpt_99453: {
            unique_patients: number;
            total_billable: number;
        };
        cpt_99454: {
            unique_patients: number;
            total_billable: number;
        };
        cpt_99457: {
            unique_patients: number;
            total_billable: number;
        };
        cpt_99458_1: {
            unique_patients: number;
            total_billable: number;
        };
        cpt_99458_2: {
            unique_patients: number;
            total_billable: number;
        };
    };
}

export class CptBillableMetricsSummaryResponseDto {
    status: string;
    data: CptBillableMetricsSummaryDto;
    metadata: {
        timestamp: string;
        practice_id: string;
    };
}