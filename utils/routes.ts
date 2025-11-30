export function getBoulderGradeMapping(grade: string) {
  let mappedGrade = '';
  if (grade === 'vfeature') {
    mappedGrade = 'vfeature';
  } else if (grade === 'v1' || grade === 'v0') {
    mappedGrade = 'v0-v2';
  } else if (grade === 'v2') {
    mappedGrade = 'v1-v3';
  } else if (grade === 'v3') {
    mappedGrade = 'v2-v4';
  } else if (grade === 'v4') {
    mappedGrade = 'v3-v5';
  } else if (grade === 'v5') {
    mappedGrade = 'v4-v6';
  } else if (grade === 'v6') {
    mappedGrade = 'v5-v7';
  } else if (grade === 'v7') {
    mappedGrade = 'v6-v8';
  } else if (grade === 'v8') {
    mappedGrade = 'v7-v9';
  } else if (grade === 'v9') {
    mappedGrade = 'v8-v10';
  } else if (grade === 'v10') {
    mappedGrade = 'v9-v11';
  } else {
    mappedGrade = 'vb';
  }

  return mappedGrade;
}

export function getRouteXp(grade: string): number {
  const boulderGrades: Record<string, number> = {
    vfeature: 0,
    vb: 10,
    v0: 20,
    v1: 21,
    v2: 26,
    v3: 35,
    v4: 44,
    v5: 64,
    v6: 88,
    v7: 110,
    v8: 155,
    v9: 175,
    v10: 210,
  };

  const ropeGrades: Record<string, number> = {
    '5.feature': 0,
    '5.b': 10,
    '5.7-': 20,
    '5.7': 20,
    '5.7+': 21,
    '5.8-': 21,
    '5.8': 26,
    '5.8+': 28,
    '5.9-': 28,
    '5.9': 31,
    '5.9+': 35,
    '5.10-': 39,
    '5.10': 42,
    '5.10+': 48,
    '5.11-': 60,
    '5.11': 73,
    '5.11+': 88,
    '5.12-': 105,
    '5.12': 123,
    '5.12+': 143,
    '5.13-': 164,
    '5.13': 187,
    '5.13+': 212,
  };

  const gradeLower = grade.toLowerCase();
  if (gradeLower.startsWith('v')) {
    return boulderGrades[gradeLower] ?? 0;
  } else {
    return ropeGrades[gradeLower] ?? 0;
  }
}

export function calculateCompletionXpForRoute({
  grade,
  previousCompletions,
  newHighestGrade,
  bonusXp = 0,
}: {
  grade: string;
  previousCompletions: number;
  newHighestGrade: boolean;
  bonusXp?: number;
}): { xp: number; baseXp: number } {
  const firstTimeXp = 25;
  const newHighestGradeBonusXP = 250;

  const baseXp = getRouteXp(grade);
  const isFeatureRoute =
    grade.toLowerCase() === 'vfeature' || grade.toLowerCase() === '5.feature';

  if (isFeatureRoute && previousCompletions > 0) {
    return { xp: 0, baseXp: 0 };
  }

  let totalXp = 0;

  // Base XP for completing the route (0 for feature routes)
  if (!isFeatureRoute) {
    totalXp += baseXp;
  }

  // First time completion bonus
  if (previousCompletions === 0) {
    totalXp += firstTimeXp;
    if (bonusXp > 0) {
      totalXp += bonusXp;
    }
  }

  // New highest grade bonus
  if (newHighestGrade) {
    totalXp += newHighestGradeBonusXP;
  }

  // Additional sends penalty (diminishing returns) - only applies to non-feature routes
  if (previousCompletions > 0 && !isFeatureRoute) {
    const additionalXp = Math.floor(previousCompletions * (baseXp * 0.2));
    totalXp -= additionalXp;
    if (totalXp < 0) {
      totalXp = 0;
    }
  }

  return { xp: totalXp, baseXp };
}

export function isGradeHigher(
  userHighestGrade: string | null | undefined,
  newGrade: string,
  type: 'rope' | 'boulder'
): boolean {
  const ropeGrades = [
    '5.b',
    '5.7-',
    '5.7',
    '5.7+',
    '5.8-',
    '5.8',
    '5.8+',
    '5.9-',
    '5.9',
    '5.9+',
    '5.10-',
    '5.10',
    '5.10+',
    '5.11-',
    '5.11',
    '5.11+',
    '5.12-',
    '5.12',
    '5.12+',
    '5.13-',
    '5.13',
    '5.13+',
  ];

  const boulderGrades = ['vb', 'v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'];

  if (!userHighestGrade) {
    return true;
  }

  if (type === 'rope') {
    const userIndex = ropeGrades.indexOf(userHighestGrade);
    const newIndex = ropeGrades.indexOf(newGrade);
    return userIndex < newIndex && newIndex !== -1;
  } else {
    const userIndex = boulderGrades.indexOf(userHighestGrade);
    const newIndex = boulderGrades.indexOf(newGrade);
    return userIndex < newIndex && newIndex !== -1;
  }
}

export function getLevelForXp(xp: number): number {
  if (xp < 0) return 0;
  const K = 10;
  return Math.floor(Math.sqrt(xp / K));
}

export function getXpForLevel(level: number): number {
  const K = 10;
  return Math.floor(K * level * level);
}