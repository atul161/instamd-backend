
export const practiceList = [
    {
        "practiceId": "us-east-1_maPSkpgAs",
        "practiceName": "dka",
        "host": "database-1.cs72scwkkjcb.us-east-1.rds.amazonaws.com",
        "port":3306,
        "database": "instamd"
    }
]

export interface PracticeDbConfig {
    practiceId: string;
    practiceName: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
}

export interface EnrollmentSummary {
    periodSummary: {
        [key: string]: {
            first_month: number;
            '1_3_months': number;
            '4_6_months': number;
            '6_12_months': number;
            overall: number;
        }
    };
    primaryInsuranceSummary: {
        [key: string]: {
            [key: string]: number;
        }
    };
    secondaryInsuranceSummary: {
        [key: string]: {
            [key: string]: number;
        }
    };
}
