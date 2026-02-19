export type CategoryStatus = 'upcoming' | 'submission' | 'voting' | 'closed';

export interface Category {
  id: string;
  name: string;
  description: string;
  emoji: string;
  status: CategoryStatus;
  submission_start: string;
  submission_end: string;
  voting_start: string;
  voting_end: string;
  created_at: string;
}

export interface Submission {
  id: string;
  category_id: string;
  user_id: string;
  photo_url: string;
  caption: string | null;
  score: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  // joined
  profiles?: Profile;
}

export interface Vote {
  id: string;
  submission_id: string;
  voter_id: string;
  value: 1 | -1;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}
