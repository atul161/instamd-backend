
// Regex patterns for parsing device data
export const BP_SYS_REGEX = /"sysData"\s*:\s*(\d+\.?\d*)/;
export const BP_DIA_REGEX = /"diaData"\s*:\s*(\d+\.?\d*)/;
export const BP_HR_REGEX = /"pulseData"\s*:\s*(\d+\.?\d*)/;
export const BP_ARR_REGEX = /"arrhythmia"\s*:\s*(\d+)/;
export const BP_IHB_REGEX = /"ihb"\s*:\s*(true|false)/i;

export const SPO2_REGEX = /"spo2"\s*:\s*"?(\d+\.?\d*)"?/;
export const SPO2_PR_REGEX = /"pr"\s*:\s*"?(\d+\.?\d*)"?/;

export const WEIGHT_REGEX = /"weight"\s*:\s*(\d+\.?\d*)/;
export const HEIGHT_REGEX = /"height"\s*:\s*(\d+\.?\d*)/;
export const BMI_REGEX = /"bmi"\s*:\s*(\d+\.?\d*)/;

export const GLUCOSE_REGEX = /"bloodGlucose"\s*:\s*"?(\d+\.?\d*)"?/;
export const TYPE_REGEX = /"type"\s*:\s*"([^"]*)"/;
