-- Fasli · initial schema
-- Schools, people, classes, live sessions, library materials, exams, grading, messages, AI tutor.
-- Every table has row-level security. Server-side AI functions use the service role.

-- gen_random_uuid() is built into Postgres 13+.

-- ───────────────────────── Types ─────────────────────────
create type public.user_role as enum ('student', 'teacher', 'parent', 'admin');
create type public.curriculum as enum ('american', 'igcse', 'stem', 'bac');
create type public.question_type as enum ('mcq', 'tf', 'num', 'written');
create type public.exam_status as enum ('draft', 'published', 'closed');
create type public.submission_status as enum ('in_progress', 'grading', 'graded', 'approved');
create type public.material_kind as enum ('pdf', 'image', 'text', 'note');
create type public.session_status as enum ('scheduled', 'live', 'ended');

create or replace function public.short_code(len int default 6)
returns text language sql volatile set search_path = public as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, len)
$$;

-- ───────────────────────── Tables ─────────────────────────
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 120),
  student_code text not null unique default public.short_code(6),
  staff_code text not null unique default public.short_code(8),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.user_role,
  school_id uuid references public.schools(id) on delete set null,
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  link_code text not null unique default public.short_code(6), -- a student shares this with a parent
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  subject text not null default '',
  curriculum public.curriculum not null,
  grade_level text not null default '',
  join_code text not null unique default public.short_code(6),
  created_at timestamptz not null default now()
);
create index on public.classes (school_id);
create index on public.classes (teacher_id);

create table public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index on public.class_members (student_id);

create table public.parent_links (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id)
);
create index on public.parent_links (student_id);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null default now(),
  status public.session_status not null default 'scheduled',
  notes text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.live_sessions (class_id, starts_at desc);

create table public.attendance (
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, student_id)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  kind public.material_kind not null,
  storage_path text,
  mime_type text,
  text_content text not null default '',
  summary text not null default '',
  status text not null default 'ready' check (status in ('processing', 'ready', 'failed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.materials (class_id, created_at desc);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  duration_min int not null default 30 check (duration_min between 1 and 600),
  status public.exam_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index on public.exams (class_id, created_at desc);

-- Questions are visible to students once the exam is published, so answers live in question_keys.
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  position int not null default 0,
  type public.question_type not null,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,   -- mcq: ["A","B","C","D"]
  rubric jsonb not null default '[]'::jsonb,    -- written: [{"n":"criterion","max":2}]
  points numeric not null default 1 check (points > 0),
  tag text not null default ''
);
create index on public.questions (exam_id, position);

create table public.question_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  answer jsonb not null  -- mcq: "option text", tf: true/false, num: 4.5, written: null
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status public.submission_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric not null default 0,
  max_score numeric not null default 0,
  ai_graded boolean not null default false,
  unique (exam_id, student_id)
);
create index on public.submissions (student_id);

create table public.answers (
  submission_id uuid not null references public.submissions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  response jsonb,
  points numeric not null default 0,
  marks jsonb not null default '[]'::jsonb,     -- written: [{"n","max","got","note"}] final marks
  ai_marks jsonb not null default '[]'::jsonb,  -- written: what the AI suggested
  primary key (submission_id, question_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index on public.messages (recipient_id, created_at desc);
create index on public.messages (sender_id, created_at desc);

create table public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index on public.tutor_messages (user_id, class_id, created_at);

-- ───────────────────────── Helpers (security definer, used by policies) ─────────────────────────
create or replace function public.my_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.my_school() returns uuid
language sql stable security definer set search_path = public as $$
  select school_id from profiles where id = auth.uid()
$$;

create or replace function public.teaches(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from classes where id = cid and teacher_id = auth.uid())
$$;

create or replace function public.in_class(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from class_members where class_id = cid and student_id = auth.uid())
$$;

create or replace function public.parent_of(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from parent_links where parent_id = auth.uid() and student_id = sid)
$$;

create or replace function public.child_in_class(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from class_members m join parent_links p on p.student_id = m.student_id
    where m.class_id = cid and p.parent_id = auth.uid())
$$;

create or replace function public.admin_of_class(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from classes c join profiles p on p.school_id = c.school_id
    where c.id = cid and p.id = auth.uid() and p.role = 'admin')
$$;

create or replace function public.class_of_exam(eid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select class_id from exams where id = eid
$$;

create or replace function public.exam_open(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from exams where id = eid and status in ('published', 'closed'))
$$;

create or replace function public.can_see_class(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select teaches(cid) or in_class(cid) or child_in_class(cid) or admin_of_class(cid)
$$;

-- ───────────────────────── New user → profile ─────────────────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'ar' end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Onboarding RPCs ─────────────────────────
-- Admin creates a school and becomes its admin.
create or replace function public.create_school(school_name text, admin_name text)
returns schools language plpgsql security definer set search_path = public as $$
declare s schools;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if (select school_id from profiles where id = auth.uid()) is not null then
    raise exception 'already in a school';
  end if;
  insert into schools (name, created_by) values (trim(school_name), auth.uid()) returning * into s;
  update profiles set role = 'admin', school_id = s.id, full_name = trim(admin_name) where id = auth.uid();
  return s;
end $$;

-- Teachers join with the staff code; students and parents with the student code.
create or replace function public.join_school(code text, as_role public.user_role, person_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if as_role = 'admin' then raise exception 'admins create a school'; end if;
  if (select school_id from profiles where id = auth.uid()) is not null then
    raise exception 'already in a school';
  end if;
  if as_role = 'teacher' then
    select id into sid from schools where staff_code = upper(trim(code));
  else
    select id into sid from schools where student_code = upper(trim(code));
  end if;
  if sid is null then raise exception 'invalid code'; end if;
  update profiles set role = as_role, school_id = sid, full_name = trim(person_name) where id = auth.uid();
  return sid;
end $$;

create or replace function public.join_class(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if my_role() is distinct from 'student' then raise exception 'only students join classes'; end if;
  select id into cid from classes where join_code = upper(trim(code)) and school_id = my_school();
  if cid is null then raise exception 'invalid code'; end if;
  insert into class_members (class_id, student_id) values (cid, auth.uid()) on conflict do nothing;
  return cid;
end $$;

create or replace function public.link_child(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if my_role() is distinct from 'parent' then raise exception 'only parents link children'; end if;
  select id into sid from profiles where link_code = upper(trim(code)) and role = 'student' and school_id = my_school();
  if sid is null then raise exception 'invalid code'; end if;
  insert into parent_links (parent_id, student_id) values (auth.uid(), sid) on conflict do nothing;
  return sid;
end $$;

-- ───────────────────────── Exam RPCs ─────────────────────────
-- Teacher saves a whole exam (questions + keys) in one call.
-- Editing a draft saves a new copy; the app then removes the old draft (teachers may remove their own exams).
create or replace function public.save_exam(p_exam_id uuid, p_class_id uuid, p_title text, p_duration int, p_publish boolean, p_questions jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare eid uuid; q jsonb; qid uuid; i int := 0;
begin
  if not teaches(p_class_id) then raise exception 'not your class'; end if;
  if p_exam_id is not null and exists (select 1 from submissions where exam_id = p_exam_id) then
    raise exception 'exam already has submissions';
  end if;
  insert into exams (class_id, title, duration_min, created_by) values (p_class_id, p_title, p_duration, auth.uid()) returning id into eid;
  for q in select * from jsonb_array_elements(p_questions) loop
    insert into questions (exam_id, position, type, prompt, options, rubric, points, tag)
    values (eid, i, (q->>'type')::question_type, q->>'prompt', coalesce(q->'options', '[]'), coalesce(q->'rubric', '[]'),
            greatest(coalesce((q->>'points')::numeric, 1), 0.5), coalesce(q->>'tag', ''))
    returning id into qid;
    insert into question_keys (question_id, answer) values (qid, coalesce(q->'answer', 'null'::jsonb));
    i := i + 1;
  end loop;
  if p_publish then update exams set status = 'published', published_at = now() where id = eid; end if;
  return eid;
end $$;

-- Student starts (or resumes) an exam.
create or replace function public.start_exam(p_exam_id uuid)
returns submissions language plpgsql security definer set search_path = public as $$
declare s submissions;
begin
  if not in_class(class_of_exam(p_exam_id)) then raise exception 'not in class'; end if;
  if not exists (select 1 from exams where id = p_exam_id and status = 'published') then raise exception 'exam not open'; end if;
  insert into submissions (exam_id, student_id, max_score)
  values (p_exam_id, auth.uid(), (select coalesce(sum(points), 0) from questions where exam_id = p_exam_id))
  on conflict (exam_id, student_id) do nothing;
  select * into s from submissions where exam_id = p_exam_id and student_id = auth.uid();
  return s;
end $$;

-- Student submits: objective questions are marked here against the hidden keys.
create or replace function public.submit_exam(p_submission_id uuid, p_answers jsonb)
returns submissions language plpgsql security definer set search_path = public as $$
declare s submissions; q record; resp jsonb; pts numeric; has_written boolean := false;
begin
  select * into s from submissions where id = p_submission_id and student_id = auth.uid();
  if s.id is null then raise exception 'submission not found'; end if;
  if s.status <> 'in_progress' then raise exception 'already submitted'; end if;
  for q in select qu.*, k.answer from questions qu left join question_keys k on k.question_id = qu.id where qu.exam_id = s.exam_id loop
    resp := p_answers -> (q.id::text);
    pts := 0;
    if q.type = 'written' then
      has_written := true;
    elsif resp is not null and resp <> 'null'::jsonb then
      if q.type = 'num' then
        begin
          if abs((resp #>> '{}')::numeric - (q.answer #>> '{}')::numeric) < 0.000001 then pts := q.points; end if;
        exception when others then pts := 0;
        end;
      elsif resp = q.answer then
        pts := q.points;
      end if;
    end if;
    insert into answers (submission_id, question_id, response, points)
    values (s.id, q.id, resp, pts)
    on conflict (submission_id, question_id) do update set response = excluded.response, points = excluded.points;
  end loop;
  update submissions set
    status = case when has_written then 'grading'::submission_status else 'graded'::submission_status end,
    submitted_at = now(),
    score = (select coalesce(sum(points), 0) from answers where submission_id = s.id)
  where id = s.id returning * into s;
  return s;
end $$;

-- Teacher adjusts written marks and/or approves.
create or replace function public.review_answer(p_submission_id uuid, p_question_id uuid, p_marks jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid; total numeric;
begin
  select class_of_exam(exam_id) into cid from submissions where id = p_submission_id;
  if not teaches(cid) then raise exception 'not your class'; end if;
  select coalesce(sum((m->>'got')::numeric), 0) into total from jsonb_array_elements(p_marks) m;
  update answers set marks = p_marks, points = total where submission_id = p_submission_id and question_id = p_question_id;
  update submissions set score = (select coalesce(sum(points), 0) from answers where submission_id = p_submission_id) where id = p_submission_id;
end $$;

create or replace function public.approve_submission(p_submission_id uuid, p_approved boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select class_of_exam(exam_id) into cid from submissions where id = p_submission_id;
  if not teaches(cid) then raise exception 'not your class'; end if;
  update submissions set status = case when p_approved then 'approved'::submission_status else 'graded'::submission_status end
  where id = p_submission_id and status in ('graded', 'approved');
end $$;

-- What a student sees after grading: correct answers for objective questions once submitted.
create or replace function public.result_keys(p_submission_id uuid)
returns table (question_id uuid, answer jsonb) language sql stable security definer set search_path = public as $$
  select k.question_id, k.answer
  from submissions s join questions q on q.exam_id = s.exam_id join question_keys k on k.question_id = q.id
  where s.id = p_submission_id and s.status <> 'in_progress'
    and (s.student_id = auth.uid() or parent_of(s.student_id) or teaches(class_of_exam(s.exam_id)))
$$;

-- Admin dashboard numbers.
create or replace function public.school_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when my_role() = 'admin' then jsonb_build_object(
    'students', (select count(*) from profiles where school_id = my_school() and role = 'student'),
    'teachers', (select count(*) from profiles where school_id = my_school() and role = 'teacher'),
    'parents',  (select count(*) from profiles where school_id = my_school() and role = 'parent'),
    'classes',  (select count(*) from classes where school_id = my_school()),
    'avg_score', (select round(avg(case when s.max_score > 0 then s.score / s.max_score * 100 end), 1)
                  from submissions s join exams e on e.id = s.exam_id join classes c on c.id = e.class_id
                  where c.school_id = my_school() and s.status in ('graded', 'approved')),
    'curricula', (select coalesce(jsonb_object_agg(curriculum, n), '{}'::jsonb) from (
                  select c.curriculum, count(m.*) n from classes c left join class_members m on m.class_id = c.id
                  where c.school_id = my_school() group by c.curriculum) x)
  ) end
$$;

-- ───────────────────────── Row-level security ─────────────────────────
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.parent_links enable row level security;
alter table public.live_sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.materials enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.question_keys enable row level security;
alter table public.submissions enable row level security;
alter table public.answers enable row level security;
alter table public.messages enable row level security;
alter table public.tutor_messages enable row level security;

-- Schools: members read their school's name. Join codes are hidden from table reads (column grants
-- below) and only come out through school_codes(), so a student can never read the staff code.
create policy "school members read" on public.schools for select using (id = public.my_school());
create policy "admin updates school" on public.schools for update using (id = public.my_school() and public.my_role() = 'admin');

create policy "read own profile" on public.profiles for select using (id = auth.uid());
create policy "read school profiles" on public.profiles for select using (school_id is not null and school_id = public.my_school());
-- Role and school only change through the RPCs above.
create policy "update own profile" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role is not distinct from public.my_role() and school_id is not distinct from public.my_school());

create policy "classes visible in school" on public.classes for select using (school_id = public.my_school());
create policy "teachers create classes" on public.classes for insert
  with check (teacher_id = auth.uid() and school_id = public.my_school() and public.my_role() = 'teacher');
create policy "teacher or admin edits class" on public.classes for update using (teacher_id = auth.uid() or public.admin_of_class(id));
create policy "teacher or admin removes class" on public.classes for delete using (teacher_id = auth.uid() or public.admin_of_class(id));

create policy "members visible" on public.class_members for select
  using (student_id = auth.uid() or public.teaches(class_id) or public.parent_of(student_id) or public.admin_of_class(class_id));
create policy "teacher removes member" on public.class_members for delete using (public.teaches(class_id) or student_id = auth.uid());

create policy "parent links visible" on public.parent_links for select using (parent_id = auth.uid() or student_id = auth.uid());
create policy "parent unlinks" on public.parent_links for delete using (parent_id = auth.uid());

create policy "sessions visible" on public.live_sessions for select using (public.can_see_class(class_id));
create policy "teacher manages sessions" on public.live_sessions for all using (public.teaches(class_id)) with check (public.teaches(class_id));

create policy "attendance visible" on public.attendance for select
  using (student_id = auth.uid() or public.parent_of(student_id)
         or exists (select 1 from live_sessions s where s.id = session_id and (public.teaches(s.class_id) or public.admin_of_class(s.class_id))));

create policy "materials visible" on public.materials for select using (public.teaches(class_id) or public.in_class(class_id) or public.admin_of_class(class_id));
create policy "teacher manages materials" on public.materials for all using (public.teaches(class_id)) with check (public.teaches(class_id));

create policy "exams visible" on public.exams for select
  using (public.teaches(class_id) or public.admin_of_class(class_id)
         or ((public.in_class(class_id) or public.child_in_class(class_id)) and status in ('published', 'closed')));
create policy "teacher updates exams" on public.exams for update using (public.teaches(class_id)) with check (public.teaches(class_id));
create policy "teacher removes exams" on public.exams for delete using (public.teaches(class_id));

create policy "questions visible" on public.questions for select
  using (public.teaches(public.class_of_exam(exam_id))
         or (public.exam_open(exam_id) and (public.in_class(public.class_of_exam(exam_id)) or public.admin_of_class(public.class_of_exam(exam_id)))));

create policy "keys for teacher" on public.question_keys for select
  using (exists (select 1 from questions q where q.id = question_id and public.teaches(public.class_of_exam(q.exam_id))));

create policy "submissions visible" on public.submissions for select
  using (student_id = auth.uid() or public.parent_of(student_id)
         or public.teaches(public.class_of_exam(exam_id)) or public.admin_of_class(public.class_of_exam(exam_id)));

create policy "answers visible" on public.answers for select
  using (exists (select 1 from submissions s where s.id = submission_id
         and (s.student_id = auth.uid() or public.parent_of(s.student_id) or public.teaches(public.class_of_exam(s.exam_id)))));

create policy "own messages" on public.messages for select using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "send messages in school" on public.messages for insert
  with check (sender_id = auth.uid() and exists (select 1 from profiles p where p.id = recipient_id and p.school_id = public.my_school()));
create policy "mark read" on public.messages for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy "own tutor chat" on public.tutor_messages for select using (user_id = auth.uid());
create policy "write own tutor chat" on public.tutor_messages for insert with check (user_id = auth.uid());
create policy "clear own tutor chat" on public.tutor_messages for delete using (user_id = auth.uid());

-- Column-level protection for secret codes.
revoke select on public.schools from anon, authenticated;
grant select (id, name, created_by, created_at) on public.schools to authenticated;
revoke select on public.profiles from anon, authenticated;
grant select (id, full_name, role, school_id, locale, created_at) on public.profiles to authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (full_name, locale) on public.profiles to authenticated;

create or replace function public.school_codes()
returns jsonb language sql stable security definer set search_path = public as $$
  select case
    when my_role() = 'admin' then (select jsonb_build_object('student_code', student_code, 'staff_code', staff_code) from schools where id = my_school())
    when my_role() = 'teacher' then (select jsonb_build_object('student_code', student_code) from schools where id = my_school())
  end
$$;

create or replace function public.my_link_code()
returns text language sql stable security definer set search_path = public as $$
  select link_code from profiles where id = auth.uid() and role = 'student'
$$;

create or replace function public.regenerate_codes()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'admins only'; end if;
  update schools set student_code = short_code(6), staff_code = short_code(8) where id = my_school();
  return school_codes();
end $$;

-- ───────────────────────── Storage: course materials ─────────────────────────
-- Files live at materials/<class_id>/<file>. Only the class teacher writes; class members read.
insert into storage.buckets (id, name, public, file_size_limit)
values ('materials', 'materials', false, 20971520)
on conflict (id) do nothing;

create policy "class reads materials" on storage.objects for select
  using (bucket_id = 'materials' and public.can_see_class(((storage.foldername(name))[1])::uuid));
create policy "teacher uploads materials" on storage.objects for insert
  with check (bucket_id = 'materials' and public.teaches(((storage.foldername(name))[1])::uuid));
create policy "teacher removes materials" on storage.objects for delete
  using (bucket_id = 'materials' and public.teaches(((storage.foldername(name))[1])::uuid));

-- ───────────────────────── Realtime ─────────────────────────
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.submissions;
alter publication supabase_realtime add table public.live_sessions;

-- ───────────────────────── Function permissions ─────────────────────────
-- Signed-out visitors can call nothing; the sign-up trigger function is not callable directly.
revoke execute on all functions in schema public from anon, public;
revoke execute on function public.handle_new_user() from authenticated;
grant execute on function
  public.my_role(), public.my_school(), public.teaches(uuid), public.in_class(uuid), public.parent_of(uuid),
  public.child_in_class(uuid), public.admin_of_class(uuid), public.class_of_exam(uuid), public.exam_open(uuid),
  public.can_see_class(uuid), public.short_code(int),
  public.create_school(text, text), public.join_school(text, public.user_role, text), public.join_class(text),
  public.link_child(text), public.save_exam(uuid, uuid, text, int, boolean, jsonb), public.start_exam(uuid),
  public.submit_exam(uuid, jsonb), public.review_answer(uuid, uuid, jsonb), public.approve_submission(uuid, boolean),
  public.result_keys(uuid), public.school_stats(), public.school_codes(), public.my_link_code(), public.regenerate_codes()
to authenticated;
alter default privileges in schema public revoke execute on functions from anon, public;
