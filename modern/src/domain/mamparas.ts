export interface MamparaReportRow {
  fecha: string;
  hora: string;
  empresa: string;
  placa: string;
  chofer: string;
  lugar: string;
  incorreccion: string;
  responsable: string;
  observaciones: string;
}

export interface ReportFilters {
  month: string;
  operator: string;
}

export interface MamparasReportRepository {
  listOperators(): Promise<string[]>;
  listRows(filters: ReportFilters): Promise<MamparaReportRow[]>;
}
