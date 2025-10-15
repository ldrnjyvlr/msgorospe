// utilities/jsonHelper.js
export const safelyParseJSON = (jsonString, defaultValue = {}) => {
  if (!jsonString) return defaultValue;
  if (typeof jsonString === 'object') return jsonString;
  
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Error parsing JSON:', e);
    return defaultValue;
  }
};
