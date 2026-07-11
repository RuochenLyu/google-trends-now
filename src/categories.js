export const categories = Object.freeze({
  all: 0,
  autos_and_vehicles: 1,
  beauty_and_fashion: 2,
  business_and_finance: 3,
  entertainment: 4,
  food_and_drink: 5,
  games: 6,
  health: 7,
  hobbies_and_leisure: 8,
  jobs_and_education: 9,
  law_and_government: 10,
  other: 11,
  pets_and_animals: 13,
  politics: 14,
  science: 15,
  shopping: 16,
  sports: 17,
  technology: 18,
  travel_and_transportation: 19,
  climate: 20
});

export const categoryNames = Object.freeze({
  0: "All",
  1: "Autos and Vehicles",
  2: "Beauty and Fashion",
  3: "Business and Finance",
  4: "Entertainment",
  5: "Food and Drink",
  6: "Games",
  7: "Health",
  8: "Hobbies and Leisure",
  9: "Jobs and Education",
  10: "Law and Government",
  11: "Other",
  13: "Pets and Animals",
  14: "Politics",
  15: "Science",
  16: "Shopping",
  17: "Sports",
  18: "Technology",
  19: "Travel and Transportation",
  20: "Climate"
});

export function categoryId(value = "all") {
  const raw = String(value ?? "all").trim().toLowerCase();
  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }
  if (Object.hasOwn(categories, raw)) {
    return categories[raw];
  }
  throw new Error(
    `Unknown category: ${value}. Use one of: ${Object.keys(categories).join(", ")} or a numeric category id.`
  );
}

export function categoryName(id) {
  return categoryNames[Number(id)] ?? String(id);
}

export function categoryRows() {
  return Object.entries(categories).map(([alias, id]) => ({
    alias,
    id,
    name: categoryName(id)
  }));
}
