export const CENTERS = ['대응단', '서교', '염리', '공덕', '성산', '상암'];

export const INCIDENT_TYPES = ['연가', '병가', '공가', '특별휴가', '기타', '초과근무'];

export const DUTY_TYPES = ['주간', '야간', '당번', '기타'];

export const ENTRY_REGEX = /^\[(대응단|서교|염리|공덕|성산|상암)\](.+?)\((주간|야간|당번|기타)-(연가|병가|공가|특별휴가|기타|초과근무)(?:;(\d{2}:\d{2}~\d{2}:\d{2}))?\)$/;

export const DAY_BLOCK = { start: 9 * 60, end: 18 * 60 };
export const NIGHT_BLOCK = { start: 18 * 60, end: (24 + 9) * 60 };

export const DEPARTMENT_ID = 'mapo';

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
