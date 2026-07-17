interface HarmonyVariable {
  name: string;
  longName?: string;
  href: string;
  units?: string;
}

export interface RecommendedVariable extends HarmonyVariable {
  isRecommended: boolean;
  reason?: string;
  score: number;
}

export const getRecommendations = (
  keyword: string,
  variables: HarmonyVariable[],
): RecommendedVariable[] => {
  if (!keyword || !variables?.length) {
    return (variables || []).map((v) => ({
      ...v,
      isRecommended: false,
      score: 0,
    }));
  }

  const lowerKeyword = keyword.toLowerCase();

  // Define categories and their matching terms
  const categories = [
    {
      id: "wind",
      searchTerms: [
        "wind",
        "speed",
        "velocity",
        "gust",
        "cyclone",
        "hurricane",
        "storm",
      ],
      varTerms: [
        "wind",
        "speed",
        "velocity",
        "gust",
        "u10m",
        "v10m",
        "u50m",
        "v50m",
      ],
      reason: "Matches wind/storm keywords in your query",
    },
    {
      id: "temp",
      searchTerms: [
        "temp",
        "temperature",
        "heat",
        "cold",
        "warm",
        "surface temp",
      ],
      varTerms: [
        "temp",
        "temperature",
        "t2m",
        "ts",
        "skin_temp",
        "surface_temp",
      ],
      reason: "Matches temperature/heat keywords in your query",
    },
    {
      id: "humidity",
      searchTerms: ["humidity", "moisture", "dry", "wet", "vapor"],
      varTerms: [
        "humidity",
        "moisture",
        "vapor",
        "qv2m",
        "rh",
        "specific_humidity",
        "relative_humidity",
      ],
      reason: "Matches humidity/moisture keywords in your query",
    },
    {
      id: "precip",
      searchTerms: [
        "precip",
        "precipitation",
        "rain",
        "snow",
        "drought",
        "wet",
      ],
      varTerms: [
        "precip",
        "precipitation",
        "rain",
        "snow",
        "water",
        "prcp",
        "tprec",
        "total_precipitation",
      ],
      reason: "Matches precipitation/rain keywords in your query",
    },
  ];

  // Find active categories in the search keyword
  const activeCategories = categories.filter((cat) =>
    cat.searchTerms.some((term) => lowerKeyword.includes(term)),
  );

  return variables.map((v) => {
    const varName = v.name.toLowerCase();
    const varLong = (v.longName || "").toLowerCase();

    let score = 0;
    let reason = "";

    // 1. Category matching (preferred for context-aware reasons)
    for (const cat of activeCategories) {
      if (
        cat.varTerms.some(
          (term) => varName.includes(term) || varLong.includes(term),
        )
      ) {
        // Count total occurrences of searchTerms in lowerKeyword
        const matchCount = cat.searchTerms.reduce((count, term) => {
          const occurrences = lowerKeyword.split(term).length - 1;
          return count + occurrences;
        }, 0);

        score += matchCount * 10;
        reason = cat.reason;
      }
    }

    // 2. Direct word overlap check (fallback for exact word matches)
    const keywordWords = lowerKeyword.split(/\s+/).filter((w) => w.length > 3);
    for (const word of keywordWords) {
      if (varName.includes(word) || varLong.includes(word)) {
        score += 2;
        if (!reason) {
          reason = `Matches '${word}' directly from your query`;
        }
      }
    }

    return {
      ...v,
      isRecommended: score > 0,
      reason: reason || undefined,
      score,
    };
  });
};
