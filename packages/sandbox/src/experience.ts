/**
 * Experience Engine — `magoco.experience` (Phase 3.6).
 *
 * This engine ENFORCES experience capture, embedding, retrieval, and injection.
 * All agent decisions MUST query the experience engine first.
 */

import type { Experience, ExperienceVector, ExperienceStore } from './experience-types.js';

// ============================================================================
// CORE ENGINE — ENFORCED CAPTURE & INJECTION
// ============================================================================

export interface ExperienceCapture {
  /**
   * ENFORCED: capture a browser interaction as experience.
   * @returns new experience ID
   */
  capture(context: string, action: string, outcome: string, metadata: Record<string, any>): Promise<string>;
  
  /**
   * ENFORCED: inject relevant experiences into agent context before decision.
   */
  inject(task: string, topK: number): Promise<Experience[]>;
  
  /**
   * ENFORCED: evaluate and reflect after task completion.
   */
  reflect(taskId: string, success: boolean, details: string): Promise<void>;
}

// ============================================================================
// MEMORY STORE (VECTOR + META)
// ============================================================================

/**
 * Simple in-memory vector store (placeholder for future FAISS/Qdrant).
 * TODO: Replace with proper vector DB.
 */
export class MemoryExperienceStore implements ExperienceStore {
  private experiences: Map<string, Experience> = new Map();
  private vectors: Map<string, number[]> = new Map();
  
  async capture(
    context: string,
    action: string,
    outcome: string,
    metadata: Record<string, any>
  ): Promise<string> {
    const id = `exp_${Date.now()}`;
    const exp: Experience = { id, context, action, outcome, metadata, createdAt: Date.now() };
    this.experiences.set(id, exp);
    
    // Simple hash-based vector (placeholder for real embedding)
    const vector = this.simpleHashVector(context + action);
    this.vectors.set(id, vector);
    
    return id;
  }
  
  async inject(task: string, topK: number): Promise<Experience[]> {
    // Compute query vector
    const queryVec = this.simpleHashVector(task);
    
    // Find most similar (dot product)
    const scores = Array.from(this.vectors.entries())
      .map(([id, vec]) => ({ id, score: this.dotProduct(queryVec, vec) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    
    return scores
      .map(s => this.experiences.get(s.id))
      .filter((x): x is Experience => x !== undefined);
  }
  
  async reflect(taskId: string, success: boolean, details: string): Promise<void> {
    // Update experience with outcome
    console.log('Reflecting on task:', taskId, 'success:', success);
    // TODO: Persist to long-term store
  }
  
  // Simple hash-based vector (REPLACE with real embedding model)
  private simpleHashVector(input: string): number[] {
    const vec = new Array(128).fill(0);
    for (let i = 0; i < input.length; i++) {
      const idx = input.charCodeAt(i) % 128;
      vec[idx] += 1;
    }
    // Normalize
    const sum = vec.reduce((a, b) => a + b, 0);
    if (sum > 0) vec.forEach((_, i) => { vec[i] = vec[i] / sum; });
    return vec;
  }
  
  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, _, i) => sum + (a[i] ?? 0) * (b[i] ?? 0), 0);
  }
}

// ============================================================================
// ENFORCED EXPERIENCE CAPTURE (MUST BE CALLED)
// ============================================================================

/**
 * ENFORCED wrapper around experience capture.
 * Call this AFTER any agent action in browser.
 */
export async function captureBrowserExperience(
  store: ExperienceStore,
  page: string,
  action: string,
  outcome: string,
  metadata: Record<string, any>
): Promise<string> {
  const id = await store.capture(`${page}: ${action}`, action, outcome, { ...metadata });
  console.log('Experience captured:', id);
  return id;
}

/**
 * ENFORCED wrapper around experience injection.
 * Call this BEFORE any agent decision.
 */
export async function injectExperience(
  store: ExperienceStore,
  task: string,
  topK = 5
): Promise<string> {
  const exps = await store.inject(task, topK);
  return JSON.stringify(exps);
}
