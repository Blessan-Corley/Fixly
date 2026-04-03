// validation.js
interface SkillCategoryInput {
  category: string;
  skills: string[];
}

interface CityInput {
  name: string;
  state: string;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const validateSkillCategory = (category: unknown): true => {
  if (!isObjectRecord(category)) {
    throw new Error('Invalid category object');
  }
  if (!category.category || typeof category.category !== 'string') {
    throw new Error('Invalid category name');
  }
  if (!Array.isArray(category.skills) || category.skills.length === 0) {
    throw new Error('Skills must be a non-empty array');
  }
  if (category.skills.some((skill: unknown): boolean => typeof skill !== 'string')) {
    throw new Error('All skills must be strings');
  }

  const normalizedCategory: SkillCategoryInput = {
    category: category.category,
    skills: category.skills,
  };
  void normalizedCategory;

  return true;
};

const validateCity = (city: unknown): true => {
  if (!isObjectRecord(city)) {
    throw new Error('Invalid city object');
  }
  if (!city.name || typeof city.name !== 'string') {
    throw new Error('Invalid city name');
  }
  if (!city.state || typeof city.state !== 'string') {
    throw new Error('Invalid state name');
  }

  const normalizedCity: CityInput = {
    name: city.name,
    state: city.state,
  };
  void normalizedCity;

  return true;
};

export { validateSkillCategory, validateCity };
