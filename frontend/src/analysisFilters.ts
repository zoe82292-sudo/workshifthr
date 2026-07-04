import type { AnalysisResult, EmployeeRecord } from "./types";

export function buildDepartmentLookup(result: AnalysisResult): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const row of result.range_penetration) {
    if (row.employee_id && row.department) {
      lookup.set(row.employee_id, row.department);
    }
  }
  for (const row of result.below_minimum) {
    if (row.employee_id && row.department) {
      lookup.set(row.employee_id, row.department);
    }
  }
  for (const row of result.above_maximum) {
    if (row.employee_id && row.department) {
      lookup.set(row.employee_id, row.department);
    }
  }
  return lookup;
}

export function employeeInDepartment(
  employeeId: string | null | undefined,
  departmentFilter: string,
  lookup: Map<string, string>,
): boolean {
  if (!departmentFilter) return true;
  if (!employeeId) return false;
  return lookup.get(employeeId) === departmentFilter;
}

export function rowMatchesDepartment(
  row: EmployeeRecord,
  departmentFilter: string,
): boolean {
  if (!departmentFilter) return true;
  return (row.department ?? "") === departmentFilter;
}

export function textMatchesSearch(values: Array<string | null | undefined>, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return values.filter(Boolean).join(" ").toLowerCase().includes(query);
}

export function anonymizeLabel(
  employeeId: string | null | undefined,
  employeeName: string | null | undefined,
  anonymize: boolean,
): string {
  if (!anonymize) {
    return employeeName ?? employeeId ?? "—";
  }
  return employeeId ? `Employee ${employeeId}` : "Employee";
}
