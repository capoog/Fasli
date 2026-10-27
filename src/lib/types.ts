export type Role = 'student' | 'teacher' | 'parent' | 'admin';
export type Curriculum = 'american' | 'igcse' | 'stem' | 'bac';
export type QType = 'mcq' | 'tf' | 'num' | 'written';
export type Lang = 'ar' | 'en';

export type Profile = {
  id: string;
  full_name: string;
  role: Role | null;
  school_id: string | null;
  locale: Lang;
};

export type School = { id: string; name: string };

export type ClassRow = {
  id: string;
  school_id: string;
  teacher_id: string;
  name: string;
  subject: string;
  curriculum: Curriculum;
  grade_level: string;
  join_code: string;
  created_at: string;
};

export type Session = {
  id: string;
  class_id: string;
  title: string;
  starts_at: string;
  status: 'scheduled' | 'live' | 'ended';
  notes: string;
};

export type Material = {
  id: string;
  class_id: string;
  title: string;
  kind: 'pdf' | 'image' | 'text' | 'note';
  storage_path: string | null;
  mime_type: string | null;
  text_content: string;
  summary: string;
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
};

export type Exam = {
  id: string;
  class_id: string;
  title: string;
  duration_min: number;
  status: 'draft' | 'published' | 'closed';
  created_at: string;
  published_at: string | null;
};

export type Rubric = { n: string; max: number };
export type Mark = { n: string; max: number; got: number; note: string };

export type Question = {
  id: string;
  exam_id: string;
  position: number;
  type: QType;
  prompt: string;
  options: string[];
  rubric: Rubric[];
  points: number;
  tag: string;
};

/** A question being edited in the builder (includes its answer key). */
export type DraftQuestion = {
  type: QType;
  prompt: string;
  options?: string[];
  rubric?: Rubric[];
  points: number;
  tag?: string;
  answer: string | number | boolean | null;
};

export type Submission = {
  id: string;
  exam_id: string;
  student_id: string;
  status: 'in_progress' | 'grading' | 'graded' | 'approved';
  started_at: string;
  submitted_at: string | null;
  score: number;
  max_score: number;
  ai_graded: boolean;
};

export type Answer = {
  submission_id: string;
  question_id: string;
  response: unknown;
  points: number;
  marks: Mark[];
  ai_marks: Mark[];
};

export type Message = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null };
