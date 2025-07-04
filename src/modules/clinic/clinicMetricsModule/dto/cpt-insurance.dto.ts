// cpt-insurance.dto.ts

export class CptInsuranceMetricsDto {
    practice_id: string;
    month_year: string;
    insurance_category: string;
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
    total_unique_patients_in_category: number;
    calculation_date: Date;
    last_updated: Date;
    created: Date;
}

export class CptInsuranceMetricsResponseDto {
    status: string;
    data: CptInsuranceMetricsDto[];
    metadata: {
        total_records: number;
        practice_id: string;
        filters?: {
            insurance_category?: string;
            insurance_categories?: string[];
            month_year?: string;
        };
        latest_month?: string;
        timestamp: string;
    };
}

export class CptInsuranceMetricsSummaryDto {
    practice_id: string;
    total_insurance_categories: number;
    total_unique_patients: number;
    total_billable_rows: number;
    total_billable_flags: number;
    total_patients_all_categories: number;
    months_with_data: number;
    latest_month: string;
    insurance_category_filter?: string;
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

export class CptInsuranceMetricsSummaryResponseDto {
    status: string;
    data: CptInsuranceMetricsSummaryDto;
    metadata: {
        timestamp: string;
        practice_id: string;
        insurance_category_filter?: string;
    };
}

export class CptInsuranceTrendDto {
    practice_id: string;
    month_year: string;
    insurance_category: string;
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
    total_unique_patients_in_category: number;
    calculation_date: Date;
    last_updated: Date;
    created: Date;
}

export class CptInsuranceTrendResponseDto {
    status: string;
    data: CptInsuranceTrendDto[];
    metadata: {
        total_records: number;
        practice_id: string;
        insurance_category: string;
        timestamp: string;
    };
}

export class InsuranceCategoriesResponseDto {
    status: string;
    data: string[];
    metadata: {
        total_categories: number;
        practice_id: string;
        timestamp: string;
    };
}

// Additional DTOs for specific use cases

export class CptInsuranceCategoryComparisonDto {
    insurance_category: string;
    total_unique_patients: number;
    total_billable_rows: number;
    total_billable_flags: number;
    average_monthly_patients: number;
    months_with_data: number;
    latest_month_data: {
        month_year: string;
        unique_patients: number;
        billable_rows: number;
    };
}

export class CptInsuranceCategoryComparisonResponseDto {
    status: string;
    data: CptInsuranceCategoryComparisonDto[];
    metadata: {
        total_categories: number;
        practice_id: string;
        period?: {
            start_month?: string;
            end_month?: string;
        };
        timestamp: string;
    };
}

export class CptInsuranceMonthlyBreakdownDto {
    month_year: string;
    month_name: string;
    categories: {
        [category: string]: {
            unique_patients: number;
            total_billable_rows: number;
            total_billable_flags: number;
            percentage_of_total: number;
        };
    };
    total_unique_patients: number;
    total_billable_rows: number;
}

export class CptInsuranceMonthlyBreakdownResponseDto {
    status: string;
    data: CptInsuranceMonthlyBreakdownDto[];
    metadata: {
        total_records: number;
        practice_id: string;
        included_categories: string[];
        timestamp: string;
    };
}
