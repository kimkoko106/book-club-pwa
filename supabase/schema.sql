-- Supabase PostgreSQL Database Schema
-- 독서 PWA (1인 독서방 & 그룹 독서모임 융합 구조)
-- RLS 무한 재귀 오류 방지를 위한 헬퍼 함수 적용 버전

-- 1. Profiles (사용자 프로필)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);


-- 2. Groups (독서 공간 - 1인 독서방 및 독서 모임 공통 지원)
create table if not exists public.groups (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  invite_code varchar(10) unique, -- solo 모드일 경우 초대 코드가 없을 수 있음
  type varchar(20) default 'group' not null, -- 'solo' (1인 독서방), 'group' (그룹 독서모임)
  visibility varchar(20) default 'group' not null, -- 'private' (나만 보기), 'group' (모임만), 'public' (전체공개)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.profiles(id) on delete set null
);

alter table public.groups enable row level security;


-- 3. Group Members (공간 구성원)
create table if not exists public.group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  role varchar(20) default 'member' not null, -- 'admin', 'member'
  unique(group_id, user_id)
);

alter table public.group_members enable row level security;


-- RLS 무한 재귀 방지용 Security Definer 헬퍼 함수 정의
-- 이 함수는 RLS를 거치지 않고 superuser 권한으로 group_members 레코드를 검증합니다.
create or replace function public.is_group_member(target_group_id uuid, target_user_id uuid)
returns boolean
security definer
language plpgsql
stable -- 동일 입력값에 대해 항상 동일 결과 반환
as $$
begin
  return exists (
    select 1 
    from public.group_members 
    where group_members.group_id = target_group_id 
      and group_members.user_id = target_user_id
  );
end;
$$;


-- 2-1. Groups RLS Select/Update 규칙 재정의 (헬퍼 함수 활용)
create policy "Users can view public groups, groups they are member of, or they created." on public.groups
  for select using (
    visibility = 'public' or
    created_by = auth.uid() or
    public.is_group_member(id, auth.uid())
  );

create policy "Group creators or admins can update groups." on public.groups
  for update using (
    created_by = auth.uid() or
    exists (
      select 1 
      from public.group_members 
      where group_id = id 
        and user_id = auth.uid() 
        and role = 'admin'
    )
  );


-- 3-1. Group Members RLS 규칙 재정의 (헬퍼 함수 활용)
create policy "Members can view other members in the same group." on public.group_members
  for select using (
    auth.uid() = user_id or
    public.is_group_member(group_id, auth.uid())
  );

create policy "Users can join a group." on public.group_members
  for insert with check (auth.uid() = user_id);

create policy "Admins can manage group members." on public.group_members
  for update using (
    exists (
      select 1 
      from public.group_members 
      where group_id = group_members.group_id 
        and user_id = auth.uid() 
        and role = 'admin'
    )
  );

create policy "Members can leave or admins can kick from group." on public.group_members
  for delete using (
    auth.uid() = user_id or
    exists (
      select 1 
      from public.group_members 
      where group_id = group_members.group_id 
        and user_id = auth.uid() 
        and role = 'admin'
    )
  );


-- 4. Books Master (도서 마스터 정보 - 여러 서재 및 모임에서 재사용 가능)
create table if not exists public.books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text not null,
  total_pages integer not null check (total_pages > 0),
  cover_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.books enable row level security;

create policy "Authenticated users can view any master books." on public.books
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert new master books." on public.books
  for insert with check (auth.role() = 'authenticated');


-- 5. User Books (개인 서재 도서)
create table if not exists public.user_books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  status varchar(20) default 'reading' not null, -- 'reading' (읽는 중), 'completed' (다 읽음), 'wished' (읽고 싶음)
  current_page integer default 0 not null check (current_page >= 0),
  is_recommended boolean default false not null, -- 모임 다음 책 후보로 추천했는지 여부
  recommend_type varchar(20), -- 'read' (읽어보고 추천), 'wish' (같이 읽고 싶음)
  recommend_comment text, -- 추천 코멘트
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, book_id)
);

alter table public.user_books enable row level security;

create policy "Users can view, add, update, delete their own library books." on public.user_books
  for all using (auth.uid() = user_id);

create policy "Group members can view other members' user_books if recommended." on public.user_books
  for select using (
    is_recommended = true or 
    auth.uid() = user_id
  );


-- 6. User Book Memos (개인책장 도서 사색 한 줄 메모 - 비공개 원칙)
create table if not exists public.user_book_memos (
  id uuid default gen_random_uuid() primary key,
  user_book_id uuid references public.user_books(id) on delete cascade not null,
  page integer check (page >= 0),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_book_memos enable row level security;

create policy "Users can manage memos of their own library books." on public.user_book_memos
  for all using (
    exists (
      select 1 
      from public.user_books 
      where id = user_book_id 
        and user_id = auth.uid()
    )
  );


-- 7. Monthly Books (모임/개인 공간별 월간 선정 공유 도서)
create table if not exists public.monthly_books (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  month varchar(7) not null, -- '2026-05' 등 연-월 형식
  stage varchar(20) default 'reading' not null, -- 'reading' (📖 읽기중), 'question' (🌱 질문 수집), 'discussion' (💬 토론 진행), 'recap' (🌙 결산 회고)
  timeline_reading text, -- '05.01~05.14' 형식
  timeline_question text,
  timeline_discussion text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(group_id, month)
);

alter table public.monthly_books enable row level security;

create policy "Members can view monthly books of their groups." on public.monthly_books
  for select using (
    public.is_group_member(group_id, auth.uid()) or
    exists (
      select 1 
      from public.groups 
      where id = group_id 
        and created_by = auth.uid()
    )
  );

create policy "Group admins can insert/update monthly books." on public.monthly_books
  for all using (
    exists (
      select 1 
      from public.group_members 
      where group_id = monthly_books.group_id 
        and user_id = auth.uid() 
        and role = 'admin'
    ) or
    exists (
      select 1 
      from public.groups 
      where id = monthly_books.group_id 
        and created_by = auth.uid()
    )
  );


-- 8. Questions (사색 질문 제안함)
create table if not exists public.questions (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  content text not null,
  status varchar(20) default 'suggested' not null, -- 'suggested' (후보 제안), 'selected' (토론 선정), 'archived' (보류/결산)
  is_spoiler boolean default false not null, -- 운영자의 스포일러 경고 적용 플래그
  reaction_curious_count integer default 0 not null,
  reaction_talk_count integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.questions enable row level security;

create policy "Group members can view questions in their group." on public.questions
  for select using (
    public.is_group_member(group_id, auth.uid())
  );

create policy "Group members can suggest questions." on public.questions
  for insert with check (
    auth.uid() = user_id and
    public.is_group_member(group_id, auth.uid())
  );

create policy "Group members can update reactions, or admins can manage status/spoiler." on public.questions
  for update using (
    public.is_group_member(group_id, auth.uid())
  );


-- 9. Question Feedback (질문 다듬기 피드백 메모 - 사색 확장 전용)
create table if not exists public.question_feedback (
  id uuid default gen_random_uuid() primary key,
  question_id uuid references public.questions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.question_feedback enable row level security;

create policy "Group members can view feedbacks on questions of their group." on public.question_feedback
  for select using (
    exists (
      select 1 
      from public.questions q 
      where q.id = question_id 
        and public.is_group_member(q.group_id, auth.uid())
    )
  );

create policy "Group members can write feedback." on public.question_feedback
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 
      from public.questions q 
      where q.id = question_id 
        and public.is_group_member(q.group_id, auth.uid())
    )
  );


-- 10. Discussion Comments (토론 댓글 및 개인 자문자답 생각 보드)
create table if not exists public.discussion_comments (
  id uuid default gen_random_uuid() primary key,
  question_id uuid references public.questions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.discussion_comments enable row level security;

create policy "Group members can view comments on questions of their group." on public.discussion_comments
  for select using (
    exists (
      select 1 
      from public.questions q 
      where q.id = question_id 
        and public.is_group_member(q.group_id, auth.uid())
    )
  );

create policy "Group members can post comments." on public.discussion_comments
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 
      from public.questions q 
      where q.id = question_id 
        and public.is_group_member(q.group_id, auth.uid())
    )
  );


-- 11. Book Recommendations (다음 달 함께 읽을 책 추천 - 후보방 연동)
create table if not exists public.book_recommendations (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  recommend_type varchar(20) default 'wish' not null, -- 'read' (읽어봤고 추천해요), 'wish' (같이 읽고 싶어요)
  comment text,
  reaction_curious_count integer default 0 not null,
  reaction_wish_count integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(group_id, user_id, book_id)
);

alter table public.book_recommendations enable row level security;

create policy "Group members can view recommendations in their group." on public.book_recommendations
  for select using (
    public.is_group_member(group_id, auth.uid())
  );

create policy "Group members can submit book recommendations." on public.book_recommendations
  for insert with check (
    auth.uid() = user_id and
    public.is_group_member(group_id, auth.uid())
  );

create policy "Group members can update recommendation reactions." on public.book_recommendations
  for update using (
    public.is_group_member(group_id, auth.uid())
  );

create policy "Recommender or admin can remove recommendation." on public.book_recommendations
  for delete using (
    auth.uid() = user_id or
    exists (
      select 1 
      from public.group_members 
      where group_id = book_recommendations.group_id 
        and user_id = auth.uid() 
        and role = 'admin'
    )
  );


-- 12. Archives (월별 모임/개인 기록 요약 보관함)
create table if not exists public.archives (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  month varchar(7) not null, -- '2026-05' 등 연-월 형식
  total_questions integer default 0 not null,
  total_comments integer default 0 not null,
  total_reactions integer default 0 not null,
  total_members integer default 0 not null,
  summary_text text, -- 여운을 달래는 맺음말
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(group_id, month)
);

alter table public.archives enable row level security;

create policy "Members can view archives of their group." on public.archives
  for select using (
    public.is_group_member(group_id, auth.uid()) or
    exists (
      select 1 
      from public.groups 
      where id = group_id 
        and created_by = auth.uid()
    )
  );

create policy "Only system or admin can create archives." on public.archives
  for insert with check (
    exists (
      select 1 
      from public.group_members 
      where group_id = archives.group_id 
        and user_id = auth.uid() 
        and role = 'admin'
    ) or
    exists (
      select 1 
      from public.groups 
      where id = archives.group_id 
        and created_by = auth.uid()
    )
  );
