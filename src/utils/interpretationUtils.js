// utils/interpretationUtils.js
import { supabase } from '../lib/supabaseClient';

/**
 * Get CFIT interpretation based on IQ score
 * @param {number} iqScore - IQ equivalent score
 * @returns {string} - Interpretation text
 */
export const getCFITInterpretation = async (iqScore) => {
  if (!iqScore) return '';

  let scoreRange;
  const score = parseInt(iqScore);

  if (score >= 130) scoreRange = 'very_superior';
  else if (score >= 120) scoreRange = 'superior';
  else if (score >= 110) scoreRange = 'high_average';
  else if (score >= 90) scoreRange = 'average';
  else if (score >= 80) scoreRange = 'low_average';
  else if (score >= 70) scoreRange = 'below_average';
  else scoreRange = 'low';

  try {
    const { data, error } = await supabase
      .from('interpretation_templates')
      .select('interpretation')
      .eq('test_type', 'CFIT')
      .eq('category', 'intelligence')
      .eq('score_range', scoreRange)
      .single();

    if (error) throw error;
    return data?.interpretation || '';
  } catch (error) {
    console.error('Error fetching CFIT interpretation:', error);
    return getDefaultCFITInterpretation(scoreRange);
  }
};

/**
 * Get 16PF factor interpretation
 * @param {string} factor - Personality factor key
 * @param {number} score - Score value (1-10)
 * @returns {string} - Interpretation text
 */
export const getPersonalityFactorInterpretation = async (factor, score) => {
  if (!factor || !score) return '';

  const scoreRange = parseInt(score) <= 5 ? 'low' : 'high';

  try {
    const { data, error } = await supabase
      .from('interpretation_templates')
      .select('interpretation')
      .eq('test_type', '16PF')
      .eq('category', factor)
      .eq('score_range', scoreRange)
      .single();

    if (error) throw error;
    return data?.interpretation || '';
  } catch (error) {
    console.error(`Error fetching 16PF interpretation for ${factor}:`, error);
    return getDefault16PFInterpretation(factor, scoreRange);
  }
};

/**
 * Get workplace skill interpretation
 * @param {string} skill - Workplace skill key
 * @param {string} rating - Rating (below_average, average, above_average)
 * @returns {string} - Interpretation text
 */
export const getWorkplaceSkillInterpretation = async (skill, rating) => {
  if (!skill || !rating) return '';

  try {
    const { data, error } = await supabase
      .from('interpretation_templates')
      .select('interpretation')
      .eq('test_type', 'WSS')
      .eq('category', skill)
      .eq('score_range', rating)
      .single();

    if (error) throw error;
    return data?.interpretation || '';
  } catch (error) {
    console.error(`Error fetching WSS interpretation for ${skill}:`, error);
    return getDefaultWSSInterpretation(skill, rating);
  }
};

/**
 * Get composite workplace skills rating
 * @param {Object} workplaceSkills - Object with workplace skills ratings
 * @returns {string} - Composite rating (below_average, average, above_average)
 */
export const getCompositeWorkplaceRating = (workplaceSkills) => {
  if (!workplaceSkills) return 'average';

  // Count occurrences of each rating
  const counts = {
    'above_average': 0,
    'average': 0,
    'below_average': 0
  };

  const skillsToCount = [
    'communication',
    'adaptingToChange',
    'problemSolving',
    'workEthics',
    'technologicalLiteracy',
    'teamwork'
  ];

  skillsToCount.forEach(skill => {
    if (workplaceSkills[skill]) {
      counts[workplaceSkills[skill]]++;
    }
  });

  // Determine composite rating
  if (counts['above_average'] > counts['below_average'] && counts['above_average'] >= counts['average']) {
    return 'above_average';
  } else if (counts['below_average'] > counts['above_average'] && counts['below_average'] >= counts['average']) {
    return 'below_average';
  } else {
    return 'average';
  }
};

/**
 * Generate workplace skills summary
 * @param {Object} workplaceSkills - Object with workplace skills ratings
 * @returns {Promise<string>} - Summary text
 */
export const generateWorkplaceSkillsSummary = async (workplaceSkills) => {
  if (!workplaceSkills) return '';

  const rating = getCompositeWorkplaceRating(workplaceSkills);

  try {
    const { data, error } = await supabase
      .from('interpretation_templates')
      .select('interpretation')
      .eq('test_type', 'WSS')
      .eq('category', 'summary')
      .eq('score_range', rating)
      .single();

    if (error) throw error;
    return data?.interpretation || getDefaultWSSInterpretation('summary', rating);
  } catch (error) {
    console.error('Error fetching WSS summary:', error);
    return getDefaultWSSInterpretation('summary', rating);
  }
};

// Default interpretation functions if database lookup fails

const getDefaultCFITInterpretation = (scoreRange) => {
  const interpretations = {
    'very_superior': "The client obtained a \"Superior\" score on the Culture Fair Intelligence Test which indicates an exceptional ability to perceive relationships in shapes and in figures. This only signifies mental efficiency to acquire and use knowledge for solving problems and adapting to the world. The client is fully equipped with the ability to think abstractly and the capacity to effortlessly create solutions to daily problems.",
    'superior': "The client obtained a \"Superior\" score on the Culture Fair Intelligence Test which indicates an exceptional ability to perceive relationships in shapes and in figures. This only signifies mental efficiency to acquire and use knowledge for solving problems and adapting to the world. The client is fully equipped with the ability to think abstractly and the capacity to effortlessly create solutions to daily problems.",
    'high_average': "The client obtained a \"High Average\" score in the Culture Fair Intelligence Test which indicates a more than satisfactory ability to perceive relationships in shapes and in figures. This revealed ability with different perceptual tasks that measure composite non-verbal intelligence. The client can learn new things without difficulty and apply appropriate knowledge as the situation requires.",
    'average': "The client obtained an \"Average\" score in the Culture Fair Intelligence Test which indicates a satisfactory ability to perceive relationships in shapes and in figures. This signifies adequate equipment with the necessary aptitude to execute job related tasks that involve cognitive ability as well as perceiving relationships in shapes and figures.",
    'low_average': "The client obtained a \"Low Average\" score in the Culture Fair Intelligence Test which indicates a slight ineptness in perceiving relationships in shapes and in figures. The client may need a considerable time and effort to apply knowledge and to learn new things.",
    'below_average': "The client obtained a \"Below Average\" score in the Culture Fair Intelligence Test which indicates ineptness in perceiving relationships between shapes and figures. The client may need a considerable time and effort to apply knowledge and to learn new things.",
    'low': "The client obtained a \"Low\" score in the Culture Fair Intelligence Test which indicates ineptness in perceiving relationships between shapes and figures. The client may need a considerable time and effort to apply knowledge and to learn new things."
  };

  return interpretations[scoreRange] || '';
};

const getDefault16PFInterpretation = (factor, scoreRange) => {
  const factorInterpretations = {
    warmth: {
      low: "The client can be quite uncomfortable in situations that call for extensive interaction and is self-effacing and willing to set aside wishes and feelings.",
      high: "The client is outgoing, kindly, easygoing, participating, and warm-hearted."
    },
    // Add default interpretations for other factors as needed
  };

  return factorInterpretations[factor]?.[scoreRange] || '';
};

const getDefaultWSSInterpretation = (skill, rating) => {
  const wssInterpretations = {
    summary: {
      'above_average': "The client obtained a composite rating of \"Above Average.\" This signifies that the client has competence and the necessary abilities and skills needed in the different areas of workplace success across industries and job levels.",
      'average': "The client obtained a composite rating of \"Average.\" This signifies that though the client has the necessary abilities and skills needed in the different areas of workplace success across industries and job levels, further improvement and development is needed.",
      'below_average': "The client obtained a composite rating of \"Below Average\". This signifies that the client has significant limitations in the different areas of workplace success across industries and job levels."
    },
    communication: {
      'above_average': "Results show that the client has an above average ability to understand oral and written communication. This indicates competence and ability to properly and efficiently express ideas and messages to others in a clear, concise and effective manner.",
      'average': "Results show that the client has an average ability to understand oral and written communication. This indicates that though the client has the capacity to express ideas and messages to others, further improvement and development is necessary.",
      'below_average': "Results show that the client has a below average ability to understand oral and written communication. This indicates ineptness in the ability to properly and efficiently express ideas and messages to others in a clear, concise and effective manner."
    },
    adaptingToChange: {
      'above_average': "It was shown that the client's aptitude to adapt to job-related changes is above average. This implies competency and ability to adjust to changing expectations, and be flexible when confronted with new or ambiguous circumstances or situations.",
      'average': "It was shown that the client's aptitude to adapt to job-related changes is average. This implies that though the client has the ability to adjust to changing expectations, further improvement and development is necessary in order to ensure work efficiency.",
      'below_average': "It was shown that the client's aptitude to adapt to job-related changes is below average. This indicates ineptness in the ability to adjust to changing expectations, and be flexible when confronted with new or ambiguous circumstances or situations."
    },
    problemSolving: {
      'above_average': "The client obtained an above average rating in the area that measured aptitude in skills related to problem solving. This indicates competence and necessary abilities to evaluate systems and operations, to identify causes, problems, patterns or issues, and to explore workable solutions.",
      'average': "The client obtained an average rating in the area that measured aptitude in skills related to problem solving. This indicates that though the client is able to evaluate systems and operations, further improvement and development is necessary.",
      'below_average': "The client obtained a below average rating in the area that measured aptitude in skills related to problem solving. This indicates ineptness in the ability to evaluate systems and operations, to identify causes, problems, patterns or issues."
    },
    workEthics: {
      'above_average': "The client obtained an above average rating as regards belief in the importance of doing work and the determination to work hard. This indicates competence and ability to identify established policies and understand time management techniques.",
      'average': "The client obtained an average rating as regards belief in the importance of doing work and the determination to work hard. This indicates that further improvement is necessary to fully acquire the ability to identify established policies.",
      'below_average': "The client obtained a below average rating as regards belief in the importance of doing work and the determination to work hard. This indicates significant limitation in identifying established policies."
    },
    technologicalLiteracy: {
      'above_average': "The client's skills concerning the effective use of technology in the workplace are above average. This indicates competency and necessary knowledge regarding information technology and the capacity to apply the same in the workplace.",
      'average': "The client's skills concerning the effective use of technology in the workplace are average. This indicates basic knowledge regarding information technology but a need for further improvement in application.",
      'below_average': "The client's skills concerning the effective use of technology in the workplace are below average. This indicates ineptness in knowledge regarding information technology and consequent difficulty in application."
    },
    teamwork: {
      'above_average': "Based on the results, the client's ability to work in a team is above average. This indicates the attitude and personality needed to easily cooperate, contribute and collaborate as a member of a group.",
      'average': "Based on the results, the client's ability to work in a team is average. This indicates that though the client has the attitude needed to cooperate as a group member, certain difficulties may still be encountered.",
      'below_average': "Based on the results, the client's ability to work in a team is below average. This indicates ineptness in the attitude and personality needed to cooperate, contribute and collaborate as a member of a group."
    }
  };

  return wssInterpretations[skill]?.[rating] || '';
};

export default {
  getCFITInterpretation,
  getPersonalityFactorInterpretation,
  getWorkplaceSkillInterpretation,
  getCompositeWorkplaceRating,
  generateWorkplaceSkillsSummary
};