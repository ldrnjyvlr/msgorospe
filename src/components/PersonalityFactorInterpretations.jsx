// components/PersonalityFactorInterpretations.jsx
import React from 'react';

const interpretations = {
  warmth: {
    high: "She/he may be uncomfortable in situations where the close relationships they seek are inaccessible",
    low: "She/he can be quite uncomfortable in situations that call for extensive interaction."
  },
  reasoning: {
    high: "She/he has a higher reasoning ability",
    low: "She/he may not accurately reflect one's reasoning ability"
  },
  // Add all other factors from your requirements
};

const PersonalityFactorInterpretations = ({ factorData, patientInfo, isEditable, onUpdate }) => {
  const pronouns = getPronouns(patientInfo?.sex);
  const lastName = getLastName(patientInfo?.name);
  
  const personalizeText = (text) => {
    if (!text) return '';
    
    return text
      .replace(/She\/he/g, pronouns.subject)
      .replace(/Her\/his/g, pronouns.possessive)
      .replace(/Her\/him/g, pronouns.object);
  };
  
  const getInterpretation = (factor, score) => {
    if (!interpretations[factor]) return '';
    
    // Assuming scores are on a scale of 1-10 with 5.5 as midpoint
    const interpretation = parseInt(score) > 5.5 
      ? interpretations[factor].high 
      : interpretations[factor].low;
      
    return personalizeText(interpretation);
  };
  
  return (
    <div className="personality-factors">
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>Factor</th>
            <th>Score</th>
            <th>Interpretation</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(factorData).map(([factor, score]) => (
            <tr key={factor}>
              <td>{formatFactorName(factor)}</td>
              <td>{score}</td>
              <td>
                {isEditable ? (
                  <textarea
                    className="form-control"
                    value={getInterpretation(factor, score)}
                    onChange={(e) => onUpdate(factor, e.target.value)}
                  />
                ) : (
                  <div>{getInterpretation(factor, score)}</div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PersonalityFactorInterpretations;