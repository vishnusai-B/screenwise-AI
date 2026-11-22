import { ScreenAnalysisData } from '../types';

export type SpeechSectionId =
  | 'all'
  | 'summary'
  | 'whatItMeans'
  | 'importantItems'
  | 'recommendedSteps'
  | 'warnings'
  | 'uncertainties';

/**
 * Clean text for natural Text-To-Speech pronunciation
 */
function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/[*_#`~]/g, '') // Remove markdown formatting
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Converts structured ScreenAnalysisData into smooth, natural spoken English
 * @param analysis The structured analysis data (Original or Simplified)
 * @param section Optional specific section to read; defaults to full analysis ('all')
 */
export function prepareSpeechContent(
  analysis: ScreenAnalysisData,
  section: SpeechSectionId = 'all'
): string {
  if (!analysis) return '';

  const speechParts: string[] = [];

  switch (section) {
    case 'summary': {
      if (analysis.screenTitle) {
        speechParts.push(cleanTextForSpeech(analysis.screenTitle));
      }
      if (analysis.summary) {
        speechParts.push(cleanTextForSpeech(analysis.summary));
      }
      break;
    }

    case 'whatItMeans': {
      if (analysis.whatItMeans && analysis.whatItMeans.length > 0) {
        speechParts.push('What this means:');
        analysis.whatItMeans.forEach((point) => {
          speechParts.push(cleanTextForSpeech(point));
        });
      }
      break;
    }

    case 'importantItems': {
      if (analysis.importantItems && analysis.importantItems.length > 0) {
        speechParts.push('Important visible information:');
        analysis.importantItems.forEach((item) => {
          speechParts.push(`${cleanTextForSpeech(item.label)}. ${cleanTextForSpeech(item.explanation)}`);
        });
      }
      break;
    }

    case 'recommendedSteps': {
      if (analysis.recommendedSteps && analysis.recommendedSteps.length > 0) {
        speechParts.push('Recommended steps to follow:');
        analysis.recommendedSteps.forEach((step) => {
          speechParts.push(`Step ${step.step}: ${cleanTextForSpeech(step.title)}. ${cleanTextForSpeech(step.description)}`);
        });
      }
      break;
    }

    case 'warnings': {
      if (analysis.warnings && analysis.warnings.length > 0) {
        speechParts.push('Safety precautions and warnings:');
        analysis.warnings.forEach((warn) => {
          speechParts.push(cleanTextForSpeech(warn));
        });
      }
      break;
    }

    case 'uncertainties': {
      if (analysis.uncertainties && analysis.uncertainties.length > 0) {
        speechParts.push('Unclear or blurry elements noted:');
        analysis.uncertainties.forEach((unc) => {
          speechParts.push(cleanTextForSpeech(unc));
        });
      }
      break;
    }

    case 'all':
    default: {
      // 1. Title and Overview Summary
      if (analysis.screenTitle) {
        speechParts.push(cleanTextForSpeech(analysis.screenTitle));
      }
      if (analysis.summary) {
        speechParts.push(cleanTextForSpeech(analysis.summary));
      }

      // 2. What this means
      if (analysis.whatItMeans && analysis.whatItMeans.length > 0) {
        speechParts.push('What this means:');
        analysis.whatItMeans.forEach((point) => {
          speechParts.push(cleanTextForSpeech(point));
        });
      }

      // 3. Important Visible Items
      if (analysis.importantItems && analysis.importantItems.length > 0) {
        speechParts.push('Important visible items:');
        analysis.importantItems.forEach((item) => {
          speechParts.push(`${cleanTextForSpeech(item.label)}. ${cleanTextForSpeech(item.explanation)}`);
        });
      }

      // 4. Recommended Steps
      if (analysis.recommendedSteps && analysis.recommendedSteps.length > 0) {
        speechParts.push('Recommended steps to follow:');
        analysis.recommendedSteps.forEach((step) => {
          speechParts.push(`Step ${step.step}: ${cleanTextForSpeech(step.title)}. ${cleanTextForSpeech(step.description)}`);
        });
      }

      // 5. Safety Warnings
      if (analysis.warnings && analysis.warnings.length > 0) {
        speechParts.push('Safety precautions and warnings:');
        analysis.warnings.forEach((warn) => {
          speechParts.push(cleanTextForSpeech(warn));
        });
      }

      // 6. Uncertainties
      if (analysis.uncertainties && analysis.uncertainties.length > 0) {
        speechParts.push('Unclear elements:');
        analysis.uncertainties.forEach((unc) => {
          speechParts.push(cleanTextForSpeech(unc));
        });
      }
      break;
    }
  }

  return speechParts.join(' ');
}

