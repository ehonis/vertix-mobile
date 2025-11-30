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
}): { xp: number; baseXp: number; xpExtrapolated: { type: string; xp: number }[] } {
  const firstTimeXp = 25;
  const newHighestGradeBonusXP = 250;

  const baseXp = getRouteXp(grade);
  const isFeatureRoute =
    grade.toLowerCase() === 'vfeature' || grade.toLowerCase() === '5.feature';

  if (isFeatureRoute && previousCompletions > 0) {
    return {
      xp: 0,
      baseXp: 0,
      xpExtrapolated: [{ type: 'Repeated Feature Route', xp: 0 }],
    };
  }

  const xpExtrapolated: { type: string; xp: number }[] = [];

  let totalXp = 0;

  // Base XP for completing the route (0 for feature routes)
  if (!isFeatureRoute) {
    totalXp += baseXp;
  }

  // First time completion bonus
  if (previousCompletions === 0) {
    totalXp += firstTimeXp;
    xpExtrapolated.push({ type: 'First Send Bonus', xp: firstTimeXp });
    if (bonusXp > 0) {
      totalXp += bonusXp;
      xpExtrapolated.push({ type: 'Bonus XP', xp: bonusXp });
    }
  }

  // New highest grade bonus
  if (newHighestGrade) {
    totalXp += newHighestGradeBonusXP;
    xpExtrapolated.push({
      type: 'New Highest Grade Bonus',
      xp: newHighestGradeBonusXP,
    });
  }

  // Additional sends penalty (diminishing returns) - only applies to non-feature routes
  if (previousCompletions > 0 && !isFeatureRoute) {
    const additionalXp = Math.floor(previousCompletions * (baseXp * 0.2));
    totalXp -= additionalXp;
    if (totalXp < 0) {
      totalXp = 0;
    }
    xpExtrapolated.push({
      type: 'Repeated Send XP Penalty',
      xp: -additionalXp,
    });
  }

  return { xp: totalXp, baseXp, xpExtrapolated };
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

export function getGradeRange(grade: string): string[] {
  const ropeGrades = [
    '5.feature',
    '5.B',
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
  const boulderGrades = [
    'vfeature',
    'vb',
    'v0',
    'v1',
    'v2',
    'v3',
    'v4',
    'v5',
    'v6',
    'v7',
    'v8',
    'v9',
    'v10',
  ];

  const isBoulderGrade = grade[0] === 'v';
  const gradeList = isBoulderGrade ? boulderGrades : ropeGrades;
  const index = gradeList.findIndex((element) => grade === element);

  if (index === -1) return []; // Handle case where grade isn't found

  if (isBoulderGrade) {
    if (index === 0) return ['vfeature', 'vb', 'v0'];
    if (index === 1) return ['vfeature', 'vb', 'v0', 'v1'];
    if (index === gradeList.length - 1) return ['v8', 'v9', 'v10'];
    return gradeList.slice(
      Math.max(0, index - 1),
      Math.min(gradeList.length, index + 2)
    );
  } else {
    if (index === 0) return ['5.feature', '5.B', '5.7-', '5.7'];
    if (index <= 2)
      return ['5.feature', '5.B', '5.7-', '5.7', '5.7+', '5.8-'];
    if (index >= gradeList.length - 3)
      return ['5.12', '5.12+', '5.13-', '5.13', '5.13+'];
    return gradeList.slice(index - 2, index + 3);
  }
}

export function findCommunityGradeForRoute(communityGrades: Array<{ grade: string }>): string {
  // Return "none" if no community grades exist
  if (!communityGrades.length) return 'none';

  // Separate rope and boulder grades based on whether they start with 'v'
  const ropeGrades = communityGrades.filter(
    (grade) =>
      !grade.grade.toLowerCase().startsWith('v') &&
      grade.grade.toLowerCase() !== '5.feature'
  );
  const boulderGrades = communityGrades.filter(
    (grade) =>
      grade.grade.toLowerCase().startsWith('v') &&
      grade.grade.toLowerCase() !== 'vfeature'
  );

  // Handle rope grades if any exist
  if (ropeGrades.length > 0) {
    const ropeGradeMap: Record<string, number> = {
      '5.b': 6.0,
      '5.7-': 7.0,
      '5.7': 7.2,
      '5.7+': 7.3,
      '5.8-': 8.0,
      '5.8': 8.2,
      '5.8+': 8.3,
      '5.9-': 9.0,
      '5.9': 9.2,
      '5.9+': 9.3,
      '5.10-': 10.0,
      '5.10': 10.2,
      '5.10+': 10.3,
      '5.11-': 11.0,
      '5.11': 11.2,
      '5.11+': 11.3,
      '5.12-': 12.0,
      '5.12': 12.2,
      '5.12+': 12.3,
      '5.13-': 13.0,
      '5.13': 13.2,
      '5.13+': 13.3,
    };

    const numericGrades = ropeGrades
      .map((grade) => ropeGradeMap[grade.grade.toLowerCase()])
      .filter((grade): grade is number => grade !== undefined);

    if (!numericGrades.length) return 'none';

    const averageNumeric =
      numericGrades.reduce((sum, num) => sum + num, 0) / numericGrades.length;

    // Find closest grade
    let closestGrade = '';
    let minDiff = Infinity;
    for (const [grade, value] of Object.entries(ropeGradeMap)) {
      const diff = Math.abs(value - averageNumeric);
      if (diff < minDiff) {
        minDiff = diff;
        closestGrade = grade;
      }
    }
    return closestGrade || 'none';
  }

  // Handle boulder grades
  if (boulderGrades.length > 0) {
    const boulderGradeMap: Record<string, number> = {
      vb: 0,
      v0: 1,
      v1: 2,
      v2: 3,
      v3: 4,
      v4: 5,
      v5: 6,
      v6: 7,
      v7: 8,
      v8: 9,
      v9: 10,
      v10: 11,
    };

    const numericGrades = boulderGrades
      .map((grade) => boulderGradeMap[grade.grade.toLowerCase()])
      .filter((grade): grade is number => grade !== undefined);

    if (!numericGrades.length) return 'none';

    const averageNumeric =
      numericGrades.reduce((sum, num) => sum + num, 0) / numericGrades.length;
    const closestNumeric = Math.round(averageNumeric);

    return (
      Object.entries(boulderGradeMap).find(([_, value]) => value === closestNumeric)?.[0] ||
      'none'
    );
  }

  return 'none';
}