-- 1. Profiles (사용자 프로필)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security) 설정
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

-- 2. Book Clubs (독서 모임)
create table if not exists public.book_clubs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  invite_code varchar(10) unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.profiles(id) on delete set null
);

alter table public.book_clubs enable row level security;

-- 로그인한 사용자만 모임 조회 및 생성 가능
create policy "Authenticated users can view clubs they are member of." on public.book_clubs
  for select using (
    auth.uid() in (
      select user_id from public.club_members where club_id = id
    ) or created_by = auth.uid()
  );

create policy "Authenticated users can create clubs." on public.book_clubs
  for insert with check (auth.uid() = created_by);

-- 3. Club Members (모임 멤버)
create table if not exists public.club_members (
  id uuid default gen_random_uuid() primary key,
  club_id uuid references public.book_clubs(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  role varchar(20) default 'member' not null, -- 'admin', 'member'
  unique(club_id, user_id)
);

alter table public.club_members enable row level security;

create policy "Members can view club members." on public.club_members
  for select using (
    auth.uid() in (
      select user_id from public.club_members where club_id = club_id
    )
  );

create policy "Users can join a club." on public.club_members
  for insert with check (auth.uid() = user_id);

-- 4. Books (함께 읽는 책)
create table if not exists public.books (
  id uuid default gen_random_uuid() primary key,
  club_id uuid references public.book_clubs(id) on delete cascade not null,
  title text not null,
  author text not null,
  total_pages integer not null check (total_pages > 0),
  cover_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.books enable row level security;

create policy "Members can view books of their club." on public.books
  for select using (
    auth.uid() in (
      select user_id from public.club_members where club_id = club_id
    )
  );

create policy "Club members can add books." on public.books
  for insert with check (
    auth.uid() in (
      select user_id from public.club_members where club_id = club_id
    )
  );

-- 5. User Book Progress (사용자별 독서 진행 상태)
create table if not exists public.user_book_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  current_page integer default 0 not null check (current_page >= 0),
  status varchar(20) default 'reading' not null, -- 'reading', 'completed', 'paused'
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, book_id)
);

alter table public.user_book_progress enable row level security;

create policy "Members can view other members' progress in the same club." on public.user_book_progress
  for select using (
    auth.uid() in (
      select cm.user_id 
      from public.club_members cm
      join public.books b on b.club_id = cm.club_id
      where b.id = book_id
    )
  );

create policy "Users can insert their own progress." on public.user_book_progress
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own progress." on public.user_book_progress
  for update using (auth.uid() = user_id);
