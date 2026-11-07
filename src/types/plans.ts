// src/types/plans.ts

export type PlanStatus = 'draft' | 'submitted' | 'approved' | 'needs_revision' | 'cancelled';

export interface SpecialistPlan {
  user_id: string;
  nameAr: string;
  nameEn: string;
  email: string;
  employee_number: string | null;
  specAr: string;
  specEn: string;
  plan_id: string | null;
  region_id?: string;
  regionAr?: string;
  regionEn?: string;
  rl_planned: number;
  tls_planned: number;
  target_total_visits: number;
  entity_ids: string[];
  status: PlanStatus | null;
  submitted_at: string | null;
  approved_at: string | null;
  last_review_note: string | null;
  revision_count: number;
  notes: string | null;
  plan_created_at: string | null;
  plan_updated_at?: string | null;
}

export interface PlanReview {
  id: string;
  action: 'comment' | 'approve' | 'request_revision' | 'reject';
  note: string | null;
  created_at: string;
  reviewerName: string;
  reviewer_id: string;
}

export interface PlanEntity {
  id: string;
  nameAr: string;
  nameEn: string;
  type: 'school' | 'tls_center';
  typeAr?: string;
}

export interface PlanRegion {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface PlanFilters {
  search?: string;
  regionId?: string;
  status?: PlanStatus | '';
}