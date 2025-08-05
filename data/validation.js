// validation.js
const validateSkillCategory = (category) => {
  if (!category.category || typeof category.category !== 'string') {
    throw new Error('Invalid category name');
  }
  if (!Array.isArray(category.skills) || category.skills.length === 0) {
    throw new Error('Skills must be a non-empty array');
  }
  if (category.skills.some(skill => typeof skill !== 'string')) {
    throw new Error('All skills must be strings');
  }
  return true;
};

const validateCity = (city) => {
  if (!city.name || typeof city.name !== 'string') {
    throw new Error('Invalid city name');
  }
  if (!city.state || typeof city.state !== 'string') {
    throw new Error('Invalid state name');
  }
  return true;
};

export { validateSkillCategory, validateCity };
