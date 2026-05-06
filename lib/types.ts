export type CellValue = string | number | boolean;

export type ColumnType = "text" | "number" | "date" | "select" | "textarea";

export interface SheetColumn {
  id: string;
  label: string;
  type: ColumnType;
  options?: string[];
  width?: string;
}

export type SheetRow = Record<string, CellValue>;

export interface SheetData {
  columns: SheetColumn[];
  rows: SheetRow[];
}

export type SheetKey = "projects" | "leads" | "revenue" | "team" | "content" | "services";

export interface DashboardMetric {
  label: string;
  value: string;
  helper: string;
}
