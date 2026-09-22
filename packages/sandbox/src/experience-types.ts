/**
 * Experience Engine types.
 */

export interface Experience {
  id: string;
  context: string;
  action: string;
  outcome: string;
  metadata: Record<string, any>;
  createdAt: number;
}

export interface ExperienceVector {
  id: string;
  vector: number[];
  similarity: number;
}

export interface ExperienceStore {
  capture(
    context: string,
    action: string,
    outcome: string,
    metadata: Record<string, any>
  ): Promise<string>;
  
  inject(task: string, topK: number): Promise<Experience[]>;
  
  reflect(taskId: string, success: boolean, details: string): Promise<void>;
}
