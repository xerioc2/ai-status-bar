export type StatusLevel = 'Operational' | 'Degraded' | 'PartialOutage' | 'MajorOutage' | 'Maintenance' | 'Unknown';
export type IncidentStage = 'Investigating' | 'Identified' | 'Monitoring' | 'Resolved';

export interface Incident {
  title: string;
  stage: IncidentStage;
  impact: StatusLevel;
  latestUpdate: string;
  updatedAt: string;
  url: string;
}

export interface ServiceStatus {
  providerId: string;
  displayName: string;
  level: StatusLevel;
  affectedComponents: { name: string; level: StatusLevel }[];
  incidents: Incident[];
  checkedAt: string;
  error?: string;
  history?: HistoryDay[];
  historyCheckedAt?: string;
}

export interface HistoryDay {
  date: string;
  level: StatusLevel;
  incidents: string[];
}
