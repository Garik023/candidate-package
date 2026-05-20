import { useState, useEffect, useCallback } from 'react';
import { getJob } from '../api/jobs.api';
import { Job } from '../types/api.types';

interface UseBulkJobPollingResult {
  job: Job | null;
  isPolling: boolean;
  error: string | null;
  startPolling: (jobId: string) => void;
  reset: () => void;
}

export function useBulkJobPolling(
  onComplete?: (job: Job) => void
): UseBulkJobPollingResult {
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPolling = useCallback((id: string) => {
    setJobId(id);
    setJob(null);
    setError(null);
    setIsPolling(true);
  }, []);

  const reset = useCallback(() => {
    setJobId(null);
    setJob(null);
    setError(null);
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (!jobId || !isPolling) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const result = await getJob(jobId);
        if (cancelled) return;

        setJob(result);

        if (result.status === 'completed' || result.status === 'failed') {
          setIsPolling(false);
          onComplete?.(result);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch job status');
        setIsPolling(false);
      }
    };

    poll();

    const interval = setInterval(poll, 500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId, isPolling, onComplete]);

  return { job, isPolling, error, startPolling, reset };
}
