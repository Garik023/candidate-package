import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../../database/entities/job.entity';

function generateJobId(): string {
  const uuid = uuidv4();
  return `job_${uuid.replace(/-/g, '').slice(0, 12)}`;
}

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
  ) {}

  async createJob(orderIds: string[], action: string, reason?: string): Promise<string> {
    const jobId = generateJobId();
    
    const job = this.jobRepository.create({
      id: jobId,
      status: 'processing',
      total: orderIds.length,
      completed: 0,
      failed: 0,
      action,
      reason: reason || null,
    });

    await this.jobRepository.save(job);
    return jobId;
  }

  async getJob(id: string): Promise<any> {
    const job = await this.jobRepository.findOne({ where: { id } });
    
    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    return {
      status: job.status,
      progress: {
        total: job.total,
        completed: job.completed,
        failed: job.failed,
      },
    };
  }

  async updateProgress(id: string, completed: number, failed: number): Promise<void> {
    await this.jobRepository.update(id, {
      completed,
      failed,
    });
  }

  async completeJob(id: string, completed: number, failed: number): Promise<void> {
    const status = failed === completed + failed ? 'failed' : 'completed';
    
    await this.jobRepository.update(id, {
      status,
      completed,
      failed,
      completed_at: new Date(),
    });
  }
}
