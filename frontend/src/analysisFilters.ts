import type { AnalysisResult, EmployeeRecord } from "./types";

function employeeRecordLists(result: AnalysisResult): EmployeeRecord[][] {
  return [result.range_penetration, result.below_minimum, result.above_maximum, result.missing_data];
}

export function buildDepartmentLookup(result: AnalysisResult): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const rows of employeeRecordLists(result)) {
    for (const row of rows) {
      if (row.employee_id && row.department) {
        lookup.set(row.employee_id, row.department);
      }
    }
  }
  return lookup;
}

export function collectDepartments(result: AnalysisResult): string[] {
  const values = new Set<string>();
  for (const rows of employeeRecordLists(result)) {
    for (const row of rows) {
      const department = row.department?.trim();
      if (department) {
        values.add(department);
      }
    }
  }
  return Array.from(values).sort((left, right) => left.localeCompare(right));
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

export function employeeIsExcluded(
  employeeId: string | null | undefined,
  excludeNonCore: boolean,
  excludedIds: Set<string>,
): boolean {
  if (!excludeNonCore || !employeeId) return false;
  return excludedIds.has(employeeId);
}

export function rowPassesCoreFilter(
  employeeId: string | null | undefined,
  excludeNonCore: boolean,
  excludedIds: Set<string>,
): boolean {
  return !employeeIsExcluded(employeeId, excludeNonCore, excludedIds);
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
