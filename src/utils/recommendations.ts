interface HarmonyVariable {
  name: string;
  longName?: string;
  href: string;
  units?: string;
}

export interface RecommendedVariable extends HarmonyVariable {
  isRecommended: boolean;
  reason?: string;
}

export const getRecommendations = (
  keyword: string,
  variables: HarmonyVariable[],
): RecommendedVariable[] => {
  if (!keyword || !variables?.length) {
    return (variables || []).map((v) => ({ ...v, isRecommended: false }));
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

    // 1. Category matching (preferred for context-aware reasons)
    for (const cat of activeCategories) {
      if (
        cat.varTerms.some(
          (term) => varName.includes(term) || varLong.includes(term),
        )
      ) {
        return {
          ...v,
          isRecommended: true,
          reason: cat.reason,
        };
      }
    }

    // 2. Direct word overlap check (fallback for exact word matches)
    const keywordWords = lowerKeyword.split(/\s+/).filter((w) => w.length > 3);
    const directMatch = keywordWords.find(
      (word) => varName.includes(word) || varLong.includes(word),
    );
    if (directMatch) {
      return {
        ...v,
        isRecommended: true,
        reason: `Matches '${directMatch}' directly from your query`,
      };
    }

    return { ...v, isRecommended: false };
  });
};
