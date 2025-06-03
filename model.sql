create table MedicareBillingBatch
(
    BillingBatchID                  int auto_increment
        primary key,
    BatchStartDate                  datetime      null,
    UserFriendlyName                varchar(200)  null,
    DeviceDataTransmissionStartDate datetime      null,
    ReviewStartDate                 datetime      null,
    PatientCount                    int           null,
    Comments                        varchar(1000) null
)
    charset = latin1;

create index idx_MedicareBillingBatch_StartDate
    on MedicareBillingBatch (BatchStartDate);

create table MedicareBillingCycle
(
    BillingCycleID                  int auto_increment
        primary key,
    CycleNo                         int              null,
    BillingBatchID                  int              null,
    StartDate                       datetime         null,
    EndDate                         datetime         null,
    DeviceDataTransmissionStartDate datetime         null,
    DeviceDataTransmissionEndDate   datetime         null,
    ReviewStartDate                 datetime         null,
    ReviewEndDate                   datetime         null,
    IsCurrentCycle                  bit default b'1' null,
    CycleRuleID                     int              null,
    BilledFlag                      bit default b'0' null,
    BillDate                        datetime         null,
    PatientCount                    int default 0    null
)
    charset = latin1;

create index idx_MedicareBillingCycle_BillingBatchID
    on MedicareBillingCycle (BillingBatchID);

create table MedicareBillingCycleComment
(
    BillingCycleCommentID int auto_increment
        primary key,
    BillingCycleID        int           null,
    CycleComment          varchar(5000) null,
    CreatedDate           datetime      null,
    CreatedBy             varchar(500)  null,
    constraint MedicareBillingCycleComment_ibfk_1
        foreign key (BillingCycleID) references MedicareBillingCycle (BillingCycleID)
)
    charset = latin1;

create index BillingCycleID
    on MedicareBillingCycleComment (BillingCycleID);

create table MedicareBillingCyclePatient
(
    BillingCycleID int          default 0                 not null,
    PatientSub     varchar(200) default ''                not null,
    CreatedDate    datetime     default CURRENT_TIMESTAMP null,
    primary key (BillingCycleID, PatientSub)
)
    charset = latin1;

create table MedicareBillingDetails
(
    BillingDetailID   int auto_increment
        primary key,
    BillingCycleID    int                         null,
    BillingBatchID    int                         null,
    PatientSub        varchar(200)                null,
    ProviderSub       varchar(200)                null,
    UploadDays        int            default 0    null,
    ReviewTime        decimal(10, 2) default 0.00 null,
    `99453Flag`       bit            default b'0' null,
    `99453BillFlag`   bit            default b'0' null,
    `99453BillDate`   datetime                    null,
    `99454Flag`       bit            default b'0' null,
    `99454BillFlag`   bit            default b'0' null,
    `99454BillDate`   datetime                    null,
    `99457Flag`       bit            default b'0' null,
    `99457BillFlag`   bit            default b'0' null,
    `99457BillDate`   datetime                    null,
    `99458_1Flag`     bit            default b'0' null,
    `99458_1BillFlag` bit            default b'0' null,
    `99458_1BillDate` datetime                    null,
    `99458_2Flag`     bit            default b'0' null,
    `99458_2BillFlag` bit            default b'0' null,
    `99458_2BillDate` datetime                    null
)
    charset = latin1;

create index idx_MedicareBillingCycleDetails_CycleID
    on MedicareBillingDetails (BillingCycleID);

create table clinical_metrics_summary
(
    id                                 int auto_increment
        primary key,
    summary_date                       date                                    not null,
    practice_id                        varchar(200)                            not null,
    enrollment_period                  varchar(50)                             not null,
    bp_total_readings                  int           default 0                 null,
    bp_abnormal_count                  int           default 0                 null,
    bp_abnormal_percent                decimal(5, 2) default 0.00              null,
    bp_avg_sys                         decimal(5, 2) default 0.00              null,
    bp_avg_dia                         decimal(5, 2) default 0.00              null,
    bp_avg_hr                          decimal(5, 2) default 0.00              null,
    bp_arrhythmia_count                int           default 0                 null,
    bp_arrhythmia_percent              decimal(5, 2) default 0.00              null,
    bp_normal_count                    int           default 0                 null,
    bp_normal_percent                  decimal(5, 2) default 0.00              null,
    bp_normal_avg_sys                  decimal(5, 2) default 0.00              null,
    bp_normal_avg_dia                  decimal(5, 2) default 0.00              null,
    bp_normal_avg_hr                   decimal(5, 2) default 0.00              null,
    bp_sys_gt_130_dia_gt_80_count      int           default 0                 null,
    bp_sys_gt_130_dia_gt_80_percent    decimal(5, 2) default 0.00              null,
    bp_sys_gt_140_dia_gt_80_count      int           default 0                 null,
    bp_sys_gt_140_dia_gt_80_percent    decimal(5, 2) default 0.00              null,
    bp_sys_gt_150_dia_gt_80_count      int           default 0                 null,
    bp_sys_gt_150_dia_gt_80_percent    decimal(5, 2) default 0.00              null,
    bp_sys_gt_160_dia_gt_80_count      int           default 0                 null,
    bp_sys_gt_160_dia_gt_80_percent    decimal(5, 2) default 0.00              null,
    bp_sys_lt_90_dia_lt_60_count       int           default 0                 null,
    bp_sys_lt_90_dia_lt_60_percent     decimal(5, 2) default 0.00              null,
    bp_hr_abnormal_count               int           default 0                 null,
    bp_hr_abnormal_percent             decimal(5, 2) default 0.00              null,
    spo2_total_readings                int           default 0                 null,
    spo2_90_92_count                   int           default 0                 null,
    spo2_90_92_percent                 decimal(5, 2) default 0.00              null,
    spo2_88_89_count                   int           default 0                 null,
    spo2_88_89_percent                 decimal(5, 2) default 0.00              null,
    spo2_below_88_count                int           default 0                 null,
    spo2_below_88_percent              decimal(5, 2) default 0.00              null,
    weight_total_readings              int           default 0                 null,
    weight_gain_4pct_count             int           default 0                 null,
    weight_gain_4pct_percent           decimal(5, 2) default 0.00              null,
    glucose_fasting_total              int           default 0                 null,
    glucose_fasting_above_130_count    int           default 0                 null,
    glucose_fasting_above_130_percent  decimal(5, 2) default 0.00              null,
    glucose_fasting_above_160_count    int           default 0                 null,
    glucose_fasting_above_160_percent  decimal(5, 2) default 0.00              null,
    glucose_fasting_above_180_count    int           default 0                 null,
    glucose_fasting_above_180_percent  decimal(5, 2) default 0.00              null,
    glucose_fasting_below_70_count     int           default 0                 null,
    glucose_fasting_below_70_percent   decimal(5, 2) default 0.00              null,
    glucose_fasting_below_54_count     int           default 0                 null,
    glucose_fasting_below_54_percent   decimal(5, 2) default 0.00              null,
    glucose_postmeal_total             int           default 0                 null,
    glucose_postmeal_above_180_count   int           default 0                 null,
    glucose_postmeal_above_180_percent decimal(5, 2) default 0.00              null,
    glucose_postmeal_above_200_count   int           default 0                 null,
    glucose_postmeal_above_200_percent decimal(5, 2) default 0.00              null,
    glucose_random_total               int           default 0                 null,
    glucose_random_above_200_count     int           default 0                 null,
    glucose_random_above_200_percent   decimal(5, 2) default 0.00              null,
    glucose_random_below_70_count      int           default 0                 null,
    glucose_random_below_70_percent    decimal(5, 2) default 0.00              null,
    critical_alerts_count              int           default 0                 null,
    critical_alerts_percent            decimal(5, 2) default 0.00              null,
    escalations_count                  int           default 0                 null,
    escalations_percent                decimal(5, 2) default 0.00              null,
    created_at                         timestamp     default CURRENT_TIMESTAMP null,
    updated_at                         timestamp     default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    constraint idx_practice_period_date
        unique (practice_id, enrollment_period, summary_date)
)
    collate = utf8mb4_unicode_ci;

create index idx_enrollment_period
    on clinical_metrics_summary (enrollment_period);

create index idx_practice_id
    on clinical_metrics_summary (practice_id);

create index idx_summary_date
    on clinical_metrics_summary (summary_date);

create table device_data_transmission
(
    iddevice_data_transmission int auto_increment
        primary key,
    id                         varchar(300)                          null,
    patient_sub                varchar(45)                           null,
    provider_sub               varchar(2000)                         null,
    device_name                varchar(45)                           null,
    detailed_value             varchar(500)                          null,
    created                    datetime    default CURRENT_TIMESTAMP not null,
    timestamp                  datetime                              null,
    local_timestamp            datetime                              null,
    app_name                   varchar(45)                           null,
    manual_entry               tinyint                               not null,
    entry_type                 varchar(45)                           null,
    alert_setting              varchar(500)                          null,
    out_of_range_alert         tinyint                               null,
    critical_alert_settings    varchar(500)                          null,
    critical_alert             tinyint                               null,
    ext_alert                  tinyint                               null,
    ext_alert_comments         longtext                              null,
    review_start_date          datetime                              null,
    review_end_date            datetime                              null,
    dataTransmissionDate       datetime                              null,
    highSys                    tinyint                               null,
    lowSys                     tinyint                               null,
    highDia                    tinyint                               null,
    lowDia                     tinyint                               null,
    highPulse                  tinyint                               null,
    lowPulse                   tinyint                               null,
    lowSpo2                    tinyint                               null,
    highBMI                    tinyint                               null,
    highSugar                  tinyint                               null,
    web_sync                   varchar(45) default 'no'              null,
    constraint id_UNIQUE
        unique (id)
)
    charset = latin1;

create index idx_ddt_critical_alert
    on device_data_transmission (critical_alert, timestamp, patient_sub);

create index idx_ddt_device_timestamp_patient
    on device_data_transmission (device_name, timestamp, patient_sub);

create index idx_ddt_glucose_entry_type
    on device_data_transmission (device_name, timestamp, entry_type, patient_sub);

create index idx_ddt_patient_timestamp
    on device_data_transmission (patient_sub, timestamp);

create index idx_ddt_weight_patient_timestamp
    on device_data_transmission (device_name, patient_sub, timestamp);

create index idx_device_data_transmission_device_name
    on device_data_transmission (device_name);

create index idx_device_data_transmission_timestamp
    on device_data_transmission (timestamp);

create index idx_device_data_transmission_timestamp_device_name
    on device_data_transmission (timestamp, device_name);

create table diagnosis
(
    id                  int auto_increment
        primary key,
    patient_sub         varchar(200)  null,
    primary_diagnosis   varchar(2000) null,
    secondary_diagnosis varchar(2000) null,
    education_location  varchar(45)   null,
    created             timestamp     null,
    modified            timestamp     null
)
    charset = latin1;

create index idx_diagnosis_patient_primary
    on diagnosis (patient_sub, primary_diagnosis);

create index idx_diagnosis_patient_sub
    on diagnosis (patient_sub);

create table diagnosis_types
(
    id             int           not null
        primary key,
    diagnosis_type varchar(1000) null,
    code           varchar(45)   not null,
    ordering       int           null
)
    charset = latin1;

create table enrollment_summary
(
    id                       int auto_increment
        primary key,
    summary_date             date                                not null,
    practice_id              varchar(200)                        null,
    physician_id             varchar(200)                        null,
    insurance_type           varchar(100)                        null,
    total_patients           int       default 0                 null,
    registered_count         int       default 0                 null,
    eligible_count           int       default 0                 null,
    engaged_count            int       default 0                 null,
    not_interested_count     int       default 0                 null,
    waiting_for_call_count   int       default 0                 null,
    undecided_count          int       default 0                 null,
    unreachable_count        int       default 0                 null,
    enrolled_count           int       default 0                 null,
    cancelled_count          int       default 0                 null,
    active_count             int       default 0                 null,
    unenrolled_count         int       default 0                 null,
    shipped_devices_count    int       default 0                 null,
    unreachable_de_count     int       default 0                 null,
    unreachable_return_count int       default 0                 null,
    created_at               timestamp default CURRENT_TIMESTAMP null,
    updated_at               timestamp default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP
);

create index idx_physician_id
    on enrollment_summary (physician_id);

create index idx_practice_id
    on enrollment_summary (practice_id);

create index idx_summary_date
    on enrollment_summary (summary_date);

create table patient
(
    sub                  varchar(200)                 not null
        primary key,
    modules              varchar(50)  default 'RPM'   null,
    zohoid               varchar(45)                  null,
    firstName            varchar(200)                 null,
    lastName             varchar(200)                 null,
    email                varchar(200)                 null,
    gender               varchar(45)                  null,
    phone_number         varchar(45)                  null,
    phone_mobile         tinyint      default 0       not null,
    address              longtext                     null,
    mrn                  varchar(255)                 null,
    mrn1                 varchar(255)                 null,
    home_address1        varchar(255)                 null,
    home_city            varchar(255)                 null,
    home_state           varchar(255)                 null,
    home_pin             varchar(255)                 null,
    pr_office_address1   varchar(255)                 null,
    primary_office_city  varchar(255)                 null,
    primary_office_state varchar(255)                 null,
    primary_office_pin   varchar(255)                 null,
    phoneNoSms           varchar(45)                  null,
    sms_mobile           tinyint      default 0       not null,
    isSmsAllowed         tinyint                      null,
    isremainder          tinyint      default 0       not null,
    remainderTime        tinyint      default 3       not null comment '1.	10AM
2.	02PM
3.	Both Time',
    readingWelldone      tinyint      default 0       not null,
    readingLink          tinyint      default 0       not null,
    readingLinkValid     tinyint      default 0       not null comment '0.	Non-Validated
1.	Validated (DOB)
2.	Validated (OTP)',
    p_timezone           varchar(45)  default 'PST'   not null,
    p_language           varchar(255) default 'en-US' not null,
    title                varchar(255)                 null,
    specialty            varchar(255)                 null,
    additional_info      varchar(255)                 null,
    country              varchar(255)                 null,
    providerid1          varchar(255)                 null,
    providerid2          varchar(255)                 null,
    devicetoken          longtext                     null,
    assign               longtext                     null,
    consent              int                          null,
    isOnline             int                          null,
    enrollDate           datetime                     null,
    consentDate          datetime                     null,
    deviceEducationDate  datetime                     null,
    dataTransmissionDate datetime                     null,
    reviewComplete       varchar(255)                 null,
    rpmReviewDuration    varchar(255)                 null,
    height               double                       null,
    note                 varchar(1000)                null,
    currentMedication    text                         null,
    isNoteAlert          int          default 0       null,
    facetime             varchar(255)                 null,
    enabled              varchar(45)                  null,
    is_eligibled         int          default 0       null,
    is_part_b            int          default 0       null,
    is_ppo               int          default 0       null,
    is_msp               int          default 0       null,
    is_hmo               int          default 0       null,
    hmoname              varchar(500)                 null,
    pponame              varchar(500)                 null,
    mspname              varchar(500)                 null,
    is_secondary_ins     int          default 0       null,
    is_save_primary      int          default 0       null,
    is_save_secondary    int          default 0       null,
    primary_payername    varchar(500)                 null,
    secondary_payername  varchar(500)                 null,
    primary_coPay        varchar(50)                  null,
    secondary_coPay      varchar(50)                  null,
    lace_risk            varchar(10)  default ''      null,
    ascvd_risk           varchar(10)  default ''      null,
    stroke_risk          varchar(10)  default ''      null,
    register_status      int                          not null,
    register_comment     mediumtext                   null,
    register_history     longtext                     null,
    ccm_register_status  int                          not null,
    ccm_register_comment mediumtext                   null,
    ccm_register_history longtext                     null,
    tcm_register_status  int                          not null,
    tcm_register_comment mediumtext                   null,
    tcm_register_history longtext                     null,
    mtm_register_status  int                          not null,
    mtm_register_comment mediumtext                   null,
    mtm_register_history longtext                     null,
    reporting_provider   varchar(45)                  null,
    ai_agents            varchar(45)                  null,
    constraint sub_UNIQUE
        unique (sub)
)
    charset = latin1;

create index idx_patient_enrolldate
    on patient (enrollDate);

create index idx_patient_provider
    on patient (reporting_provider);

create table provider
(
    sub                     varchar(200)                 not null
        primary key,
    zohoid                  varchar(45)                  null,
    firstName               varchar(200)                 null,
    lastName                varchar(200)                 null,
    email                   varchar(200)                 null,
    gender                  varchar(45)                  null,
    phone_number            varchar(45)                  null,
    address                 longtext                     null,
    mrn                     varchar(255)                 null,
    mrn1                    varchar(255)                 null,
    home_address1           varchar(255)                 null,
    home_city               varchar(255)                 null,
    home_state              varchar(255)                 null,
    home_pin                varchar(255)                 null,
    pr_office_address1      varchar(255)                 null,
    primary_office_city     varchar(255)                 null,
    primary_office_state    varchar(255)                 null,
    primary_office_pin      varchar(255)                 null,
    phoneNoSms              varchar(45)                  null,
    isSmsAllowed            tinyint                      null,
    p_timezone              varchar(45)  default 'PST'   not null,
    p_language              varchar(255) default 'en-US' not null,
    title                   varchar(255)                 null,
    specialty               varchar(255)                 null,
    additional_info         varchar(255)                 null,
    country                 varchar(255)                 null,
    providerid1             varchar(255)                 null,
    providerid2             varchar(255)                 null,
    devicetoken             longtext                     null,
    assign                  longtext                     null,
    consent                 int                          null,
    isOnline                int                          null,
    enrollDate              datetime                     null,
    consentDate             datetime                     null,
    deviceEducationDate     datetime                     null,
    dataTransmissionDate    datetime                     null,
    reviewComplete          varchar(255)                 null,
    rpmReviewDuration       varchar(255)                 null,
    height                  double                       null,
    note                    varchar(1000)                null,
    isNoteAlert             int          default 0       null,
    facetime                varchar(255)                 null,
    enabled                 varchar(45)                  null,
    televisit_flag          tinyint      default 0       null,
    televisit_url           longtext                     null,
    medicare_codes_assigned longtext                     not null,
    npi                     varchar(45)                  null,
    npi_pin                 varchar(45)                  null,
    constraint sub_UNIQUE
        unique (sub)
)
    charset = latin1;

