// ═══════════════════════════════════════════════════════════
// Summarization Engine — Local Arabic Text Clustering (v2)
// ═══════════════════════════════════════════════════════════

import type { SummaryPoint, SummarizationOptions } from '../types/summaries';

// ═══════════════════════════════════════════════════════════
// Default Options
// ═══════════════════════════════════════════════════════════

export const DEFAULT_SUMMARIZATION_OPTIONS: SummarizationOptions = {
  similarity_threshold: 0.72,
  min_point_length: 8,
  max_strengths: 15,
  max_improvements: 15,
  include_manual_activities: false,
};

// ═══════════════════════════════════════════════════════════
// Text Normalization (Arabic-aware)
// ═══════════════════════════════════════════════════════════

export function normalizeArabic(text: string): string {
  if (!text) return '';

  return text
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[،؛:!?.,()\[\]{}"'«»…\-–—]/g, ' ')
    .replace(/[0-9٠-٩]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ═══════════════════════════════════════════════════════════
// Arabic Stemming (improved — v2)
// ═══════════════════════════════════════════════════════════

const ARABIC_PREFIXES = ['ال', 'و', 'ب', 'ك', 'ف', 'ل', 'س'];
const ARABIC_SUFFIXES = ['ات', 'ون', 'ين', 'ان', 'ها', 'هم', 'هن', 'كم', 'كن', 'نا', 'ه', 'ي'];

/**
 * Light Arabic stemmer (v2):
 * - Normalizes first
 * - Strips up to 2 prefixes
 * - Strips up to 2 suffixes
 */
export function stemArabic(word: string): string {
  if (!word) return '';

  // ⭐ Normalize inside
  let w = normalizeArabic(word);
  if (w.length < 3) return w;

  // Strip up to 2 prefixes
  for (let iter = 0; iter < 2; iter++) {
    let stripped = false;
    for (const prefix of ARABIC_PREFIXES) {
      if (w.startsWith(prefix) && w.length - prefix.length >= 3) {
        w = w.slice(prefix.length);
        stripped = true;
        break;
      }
    }
    if (!stripped) break;
  }

  // Strip up to 2 suffixes
  for (let iter = 0; iter < 2; iter++) {
    let stripped = false;
    for (const suffix of ARABIC_SUFFIXES) {
      if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
        w = w.slice(0, -suffix.length);
        stripped = true;
        break;
      }
    }
    if (!stripped) break;
  }

  return w;
}

// ═══════════════════════════════════════════════════════════
// Tokenization
// ═══════════════════════════════════════════════════════════

const STOP_WORDS = new Set([
  'في', 'من', 'على', 'الى', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك',
  'التي', 'الذي', 'الذين', 'اللاتي', 'كان', 'كانت', 'يكون', 'تكون',
  'لم', 'لن', 'لا', 'ما', 'قد', 'كل', 'بعض', 'بين', 'عند', 'لدى',
  'هو', 'هي', 'هم', 'هن', 'انا', 'نحن', 'انت', 'انتم',
  'او', 'ثم', 'بل', 'لكن', 'حيث', 'كما', 'ايضا', 'جدا', 'فقط',
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'for',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'this', 'that', 'these', 'those', 'it', 'its', 'by', 'with', 'as',
]);

export function tokenize(text: string): string[] {
  const normalized = normalizeArabic(text);
  if (!normalized) return [];

  return normalized
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .filter((w) => !STOP_WORDS.has(w))
    .map(stemArabic)
    .filter((w) => w.length >= 2);
}

// ═══════════════════════════════════════════════════════════
// Jaccard Similarity
// ═══════════════════════════════════════════════════════════

export function jaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ═══════════════════════════════════════════════════════════
// Levenshtein Distance
// ═══════════════════════════════════════════════════════════

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function levenshteinSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// ═══════════════════════════════════════════════════════════
// Combined Similarity
// ═══════════════════════════════════════════════════════════

export function similarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  const jaccard = jaccardSimilarity(tokensA, tokensB);
  const lev = levenshteinSimilarity(
    normalizeArabic(a),
    normalizeArabic(b)
  );

  return 0.6 * jaccard + 0.4 * lev;
}

// ═══════════════════════════════════════════════════════════
// Split Text into Points
// ═══════════════════════════════════════════════════════════

export function splitIntoPoints(rawText: string): string[] {
  if (!rawText) return [];

  let text = rawText
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/؛/g, ';');

  const separators = [
    /\n+/g,
    /[;]/g,
    /(?=[0-9٠-٩]+[\.\)]\s)/g,
    /[•✓]/g,
    /(?:^|\s)-\s+/g,
  ];

  let parts = [text];
  for (const sep of separators) {
    parts = parts.flatMap((p) => p.split(sep));
  }

  return parts
    .map((p) => p.trim())
    .map((p) => p.replace(/^[0-9٠-٩]+[\.\)]\s*/, '').trim())
    .map((p) => p.replace(/^[•\-*✓]\s*/, '').trim())
    .map((p) => p.replace(/[\.]+$/, '').trim())
    .filter((p) => p.length > 0);
}

// ═══════════════════════════════════════════════════════════
// Clustering
// ═══════════════════════════════════════════════════════════

interface RawPoint {
  text: string;
  source_report_id: string;
}

interface Cluster {
  texts: string[];
  source_report_ids: Set<string>;
  representative: string;
}

export function clusterPoints(
  points: RawPoint[],
  threshold: number
): Cluster[] {
  const clusters: Cluster[] = [];

  for (const point of points) {
    let bestCluster: Cluster | null = null;
    let bestScore = 0;

    for (const cluster of clusters) {
      const score = similarity(point.text, cluster.representative);
      if (score > bestScore) {
        bestScore = score;
        bestCluster = cluster;
      }
    }

    if (bestCluster && bestScore >= threshold) {
      bestCluster.texts.push(point.text);
      bestCluster.source_report_ids.add(point.source_report_id);
      if (point.text.length > bestCluster.representative.length) {
        bestCluster.representative = point.text;
      }
    } else {
      clusters.push({
        texts: [point.text],
        source_report_ids: new Set([point.source_report_id]),
        representative: point.text,
      });
    }
  }

  return clusters;
}

// ═══════════════════════════════════════════════════════════
// Cluster → SummaryPoint
// ═══════════════════════════════════════════════════════════

function clusterToSummaryPoint(cluster: Cluster): SummaryPoint {
  const mentions = cluster.texts.length;
  const confidence = Math.min(1.0, 0.5 + (mentions - 1) * 0.15);

  return {
    text: cleanFinalText(cluster.representative),
    source_report_ids: Array.from(cluster.source_report_ids),
    merged_from: cluster.texts.length > 1 ? [...cluster.texts] : [],
    confidence: Math.round(confidence * 100) / 100,
  };
}

function cleanFinalText(text: string): string {
  let cleaned = text.trim().replace(/\s+/g, ' ');
  if (cleaned.length > 0 && /[a-z]/.test(cleaned[0])) {
    cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  }
  if (cleaned.length > 0 && !/[.!?؟]$/.test(cleaned) && /[a-z]$/i.test(cleaned)) {
    cleaned = cleaned + '.';
  }
  return cleaned;
}

// ═══════════════════════════════════════════════════════════
// Main Summarization Function
// ═══════════════════════════════════════════════════════════

export interface RawSummaryInput {
  report_id: string;
  strengths_text: string | null;
  improvements_text: string | null;
}

export interface SummarizationResult {
  strengths: SummaryPoint[];
  improvements: SummaryPoint[];
  stats: {
    total_reports: number;
    strengths_raw_count: number;
    improvements_raw_count: number;
    strengths_final_count: number;
    improvements_final_count: number;
    strengths_merged_count: number;
    improvements_merged_count: number;
  };
}

export function summarize(
  input: RawSummaryInput[],
  options: Partial<SummarizationOptions> = {}
): SummarizationResult {
  const opts = { ...DEFAULT_SUMMARIZATION_OPTIONS, ...options };

  const rawStrengths: RawPoint[] = [];
  const rawImprovements: RawPoint[] = [];

  for (const report of input) {
    if (report.strengths_text) {
      const points = splitIntoPoints(report.strengths_text);
      for (const p of points) {
        if (p.length >= opts.min_point_length) {
          rawStrengths.push({ text: p, source_report_id: report.report_id });
        }
      }
    }

    if (report.improvements_text) {
      const points = splitIntoPoints(report.improvements_text);
      for (const p of points) {
        if (p.length >= opts.min_point_length) {
          rawImprovements.push({ text: p, source_report_id: report.report_id });
        }
      }
    }
  }

  const strengthClusters = clusterPoints(rawStrengths, opts.similarity_threshold);
  const improvementClusters = clusterPoints(rawImprovements, opts.similarity_threshold);

  strengthClusters.sort((a, b) => {
    const diff = b.source_report_ids.size - a.source_report_ids.size;
    if (diff !== 0) return diff;
    return b.representative.length - a.representative.length;
  });

  improvementClusters.sort((a, b) => {
    const diff = b.source_report_ids.size - a.source_report_ids.size;
    if (diff !== 0) return diff;
    return b.representative.length - a.representative.length;
  });

  const topStrengths = strengthClusters.slice(0, opts.max_strengths);
  const topImprovements = improvementClusters.slice(0, opts.max_improvements);

  const strengths = topStrengths.map(clusterToSummaryPoint);
  const improvements = topImprovements.map(clusterToSummaryPoint);

  return {
    strengths,
    improvements,
    stats: {
      total_reports: input.length,
      strengths_raw_count: rawStrengths.length,
      improvements_raw_count: rawImprovements.length,
      strengths_final_count: strengths.length,
      improvements_final_count: improvements.length,
      strengths_merged_count: rawStrengths.length - strengths.length,
      improvements_merged_count: rawImprovements.length - improvements.length,
    },
  };
}

// ═══════════════════════════════════════════════════════════
// Preview-only
// ═══════════════════════════════════════════════════════════

export function previewSummary(
  input: RawSummaryInput[],
  options: Partial<SummarizationOptions> = {}
) {
  const opts = { ...DEFAULT_SUMMARIZATION_OPTIONS, ...options };

  let strengthPoints = 0;
  let improvementPoints = 0;

  for (const report of input) {
    if (report.strengths_text) {
      const points = splitIntoPoints(report.strengths_text);
      strengthPoints += points.filter((p) => p.length >= opts.min_point_length).length;
    }
    if (report.improvements_text) {
      const points = splitIntoPoints(report.improvements_text);
      improvementPoints += points.filter((p) => p.length >= opts.min_point_length).length;
    }
  }

  return {
    total_reports: input.length,
    estimated_strengths_raw: strengthPoints,
    estimated_improvements_raw: improvementPoints,
    estimated_strengths_final: Math.min(strengthPoints, opts.max_strengths),
    estimated_improvements_final: Math.min(improvementPoints, opts.max_improvements),
  };
}