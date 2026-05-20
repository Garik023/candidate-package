import { apiClient } from './client';
import { Job } from '../types/api.types';

export async function getJob(id: string): Promise<Job> {
  return apiClient<Job>(`/jobs/${id}`);
}
