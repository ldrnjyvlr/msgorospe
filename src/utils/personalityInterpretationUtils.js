// Utility functions for 16PF personality factor interpretations
// This ensures consistent interpretation logic across the application

/**
 * Get pronouns based on gender
 * @param {string} gender - The gender of the person
 * @returns {object} Object containing subject, object, possessive, and reflexive pronouns
 */
export const getPronouns = (gender) => {
  if (!gender) return { subject: 'they', object: 'them', possessive: 'their', reflexive: 'themselves' };
  
  const normalizedGender = gender.toLowerCase();
  if (normalizedGender === 'male' || normalizedGender === 'boy') {
    return { subject: 'he', object: 'him', possessive: 'his', reflexive: 'himself' };
  } else if (normalizedGender === 'female' || normalizedGender === 'girl') {
    return { subject: 'she', object: 'her', possessive: 'her', reflexive: 'herself' };
  }
  
  return { subject: 'they', object: 'them', possessive: 'their', reflexive: 'themselves' };
};

/**
 * Extract last name from full name
 * @param {string} fullName - The full name of the person
 * @returns {string} The last name or 'the client' if not available
 */
export const getLastName = (fullName) => {
  if (!fullName) return 'the client';
  
  // Assumes format "Last, First Middle"
  const parts = fullName.split(',');
  if (parts.length > 1) {
    return parts[0].trim();
  }
  
  // If not in that format, try to get last word
  const nameParts = fullName.split(' ');
  return nameParts[nameParts.length - 1].trim();
};

/**
 * Generate interpretation for a single personality factor
 * @param {string} factor - The personality factor key
 * @param {number} score - The score (1-10)
 * @param {string} lastName - The person's last name
 * @param {object} pronouns - The pronouns object
 * @returns {string} The interpretation text
 */
export const generateSingleFactorInterpretation = (factor, score, lastName, pronouns) => {
  const isHigh = score >= 6; // Threshold: 1-5 low, 6-10 high
  
  switch(factor) {
    case 'warmth':
      return isHigh 
        ? `${lastName} may be uncomfortable in situations where the close relationships ${pronouns.subject} seeks are inaccessible`
        : `${lastName} can be quite uncomfortable in situations that call for extensive interaction`;
    
    case 'reasoning':
      return isHigh 
        ? `${lastName} has a higher reasoning ability`
        : `${lastName} may not accurately reflect one's reasoning ability`;
    
    case 'emotionalStability':
      return isHigh 
        ? `${lastName} makes adaptive or proactive choices in managing ${pronouns.possessive} life`
        : `${lastName} tends to feel a certain lack of control over life`;
    
    case 'dominance':
      return isHigh 
        ? `${lastName} tends to be forceful, vocal in expressing ${pronouns.possessive} wishes and opinions even when not invited to do so, and pushy about obtaining what ${pronouns.subject} wants`
        : `${lastName} is self-effacing and willing to set aside ${pronouns.possessive} wishes and feelings`;
    
    case 'liveliness':
      return isHigh 
        ? `${lastName} is enthusiastic, spontaneous and attention seeking`
        : `${lastName} tends to inhibit their spontaneity, sometimes to the point of appearing constricted or saturnine`;
    
    case 'ruleConsciousness':
      return isHigh 
        ? `${lastName} is rule-conscious, ${pronouns.subject} tends to perceive ${pronouns.reflexive} as strict follower of rules, principles and manners`
        : `${lastName} tends to eschew rules and regulations, doing so either because ${pronouns.subject} has a poorly developed sense of right and wrong`;
    
    case 'socialBoldness':
      return isHigh 
        ? `${lastName} tends to initiate social contacts and isn't shy in the face of new social settings`
        : `${lastName} finds speaking in front of a group to be a difficult experience`;
    
    case 'sensitivity':
      return isHigh 
        ? `${lastName} tends to base judgements on personal tastes`
        : `${lastName} tends to be concerned with utility and objectivity and may exclude people's feelings from consideration`;
    
    case 'vigilance':
      return isHigh 
        ? `${lastName} expects to be misunderstood or taken advantage of`
        : `${lastName} tends to expect fair treatment, loyalty, and good intentions from others`;
    
    case 'abstractedness':
      return isHigh 
        ? `${lastName} tends to reflect an intense inner life rather than a focus on the outer environment`
        : `${lastName} may not be able to generate possible solutions to problems`;
    
    case 'privateness':
      return isHigh 
        ? `${lastName} tends to be personally guarded`
        : `${lastName} tends to talk about ${pronouns.possessive} self readily`;
    
    case 'apprehension':
      return isHigh 
        ? `${lastName} tends to worry about things and to feel apprehensive`
        : `${lastName} tends to be more self-assured`;
    
    case 'opennessToChange':
      return isHigh 
        ? `${lastName} tends to think of ways to improve things`
        : `${lastName} prefers life to be predictable and familiar, even if life is not ideal`;
    
    case 'selfReliance':
      return isHigh 
        ? `${lastName} enjoys time alone and prefers to make decisions for ${pronouns.reflexive}`
        : `${lastName} prefers to be around people and likes to do things with others`;
    
    case 'perfectionism':
      return isHigh 
        ? `${lastName} tends to be organized, to keep things in their proper places, and to plan ahead`
        : `${lastName} may not be able to muster a clear motivation for behaving in planful or organized ways, especially if these behaviors are unimportant to ${pronouns.object}`;
    
    case 'tension':
      return isHigh 
        ? `${lastName} tends to have restless energy and to be fidgety when made to wait`
        : `${lastName} is patient and slow to become frustrated`;
    
    default:
      return '';
  }
};

/**
 * Generate interpretations for all personality factors
 * @param {object} personalityFactors - Object containing factor scores
 * @param {string} patientName - The patient's full name
 * @param {string} patientGender - The patient's gender
 * @returns {object} Object containing interpretations for each factor
 */
export const generatePersonalityInterpretations = (personalityFactors, patientName, patientGender) => {
  const pronouns = getPronouns(patientGender);
  const lastName = getLastName(patientName);
  
  const interpretations = {};
  
  // Generate interpretation for each factor
  Object.entries(personalityFactors).forEach(([factor, value]) => {
    const score = parseInt(value);
    interpretations[factor] = generateSingleFactorInterpretation(factor, score, lastName, pronouns);
  });
  
  return interpretations;
};
