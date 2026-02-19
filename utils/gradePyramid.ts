/**
 * Grade pyramid utilities: ordered grade lists and completion counts by grade.
 * Mirrors vertix web lib/dashboard.ts getRouteGradeCounts so mobile chart matches web.
 */

export interface CompletionWithRoute {
  route: { type: string; grade: string };
}

const BOULDER_GRADES = [
  "vfeature",
  "vb",
  "v0",
  "v1",
  "v2",
  "v3",
  "v4",
  "v5",
  "v6",
  "v7",
  "v8",
] as const;

const ROPE_GRADES = [
  "5.feature",
  "5.B",
  "5.7",
  "5.8",
  "5.8+",
  "5.9",
  "5.9+",
  "5.10-",
  "5.10",
  "5.10+",
  "5.11-",
  "5.11",
  "5.11+",
  "5.12-",
  "5.12",
  "5.12+",
] as const;

export interface GradeCount {
  grade: string;
  count: number;
}

export interface GetRouteGradeCountsOptions {
  /** Force the range to extend up to this grade (e.g. user.highestRopeGrade) */
  highestRopeGrade?: string | null;
  /** Force the range to extend up to this grade (e.g. user.highestBoulderGrade) */
  highestBoulderGrade?: string | null;
}

export function getRouteGradeCounts(
  completions: CompletionWithRoute[],
  options: GetRouteGradeCountsOptions = {}
): { boulderGradeCounts: GradeCount[]; ropeGradeCounts: GradeCount[] } {
  const boulderRoutes = completions.filter(c => c.route.type === "BOULDER");
  const ropeRoutes = completions.filter(c => c.route.type === "ROPE");

  const boulderGradeCounts: GradeCount[] = BOULDER_GRADES.map(grade => ({
    grade,
    count: 0,
  }));
  const ropeGradeCounts: GradeCount[] = ROPE_GRADES.map(grade => ({
    grade,
    count: 0,
  }));

  boulderRoutes.forEach(route => {
    const entry = boulderGradeCounts.find(g => g.grade === route.route.grade);
    if (entry) entry.count++;
  });

  ropeRoutes.forEach(route => {
    const entry = ropeGradeCounts.find(g => g.grade === route.route.grade);
    if (entry) entry.count++;
  });

  // Returns the slice from the first grade with sends up to the forced max grade (or
  // last grade with sends, whichever is higher). This ensures the chart always extends
  // to the user's highest grade even if the completion data doesn't match the grade string.
  const toRange = (grades: GradeCount[], forcedMaxGrade?: string | null) => {
    const first = grades.findIndex(g => g.count > 0);
    if (first === -1) return [];

    const lastFromData = grades.length - 1 - [...grades].reverse().findIndex(g => g.count > 0);

    let lastFromForced = -1;
    if (forcedMaxGrade) {
      lastFromForced = grades.findIndex(g => g.grade === forcedMaxGrade);
    }

    const last = Math.max(lastFromData, lastFromForced);
    return grades.slice(first, last + 1);
  };

  return {
    boulderGradeCounts: toRange(boulderGradeCounts, options.highestBoulderGrade),
    ropeGradeCounts: toRange(ropeGradeCounts, options.highestRopeGrade),
  };
}
