-- Supabase Seed Dummy Data SQL
-- 이 스크립트는 schema.sql이 반영된 Supabase 프로젝트의 SQL Editor에서
-- 직접 실행하여 더미 데이터를 생성할 수 있습니다.

-- 1. auth.users 테이블 더미 사용자 생성 (외래키 제약 준수용)
-- 실제 비밀번호는 해싱 처리되나 더미이므로 임의 UUID와 이메일을 바인딩합니다.
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-0000-0000-000000000001', 'insect@bookclub.com', '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000002', 'mint@bookclub.com', '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000003', 'meditation@bookclub.com', '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- 2. profiles (사용자 프로필)
insert into public.profiles (id, username, avatar_url)
values
  ('00000000-0000-0000-0000-000000000001', '차분한 책벌레', 'https://api.dicebear.com/7.x/bottts/svg?seed=user1'),
  ('00000000-0000-0000-0000-000000000002', '민트초코 독서가', 'https://api.dicebear.com/7.x/bottts/svg?seed=user2'),
  ('00000000-0000-0000-0000-000000000003', '오후의 사색', 'https://api.dicebear.com/7.x/bottts/svg?seed=user3')
on conflict (id) do nothing;

-- 3. groups (독서방)
-- group-1: 숲속의 북클럽 (그룹 모임)
-- group-2: 나만의 고요한 서재 (Solo 독서방)
insert into public.groups (id, title, description, invite_code, type, visibility, created_by)
values
  ('00000000-0000-0000-0000-000000000101', '숲속의 북클럽 🌲', '자연, 사색, 그리고 삶에 관한 에세이를 차분히 완독하는 소모임입니다.', 'SAGE123', 'group', 'group', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000102', '나만의 고요한 서재 📚', '타인에게 방해받지 않고 온전히 나만의 사색 질문을 던지고 기록하는 공간입니다.', null, 'solo', 'private', '00000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

-- 4. group_members (모임 구성원)
insert into public.group_members (id, group_id, user_id, role)
values
  -- group-1 (그룹모임) 멤버 구성
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'admin'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', 'member'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000003', 'member'),
  -- group-2 (Solo 독서방) 멤버 구성 (오직 개설자 1명만 존재)
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002', 'admin')
on conflict (id) do nothing;

-- 5. books (도서 마스터 DB)
insert into public.books (id, title, author, total_pages, cover_url)
values
  ('00000000-0000-0000-0000-000000000301', '월든 (Walden)', '헨리 데이비드 소로', 450, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80'),
  ('00000000-0000-0000-0000-000000000302', '코스모스 (Cosmos)', '칼 세이건', 700, 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&auto=format&fit=crop&q=80'),
  ('00000000-0000-0000-0000-000000000303', '어린 왕자', '앙투안 드 생텍쥐페리', 150, null)
on conflict (id) do nothing;

-- 6. user_books (개인 책장 서재)
insert into public.user_books (id, user_id, book_id, status, current_page, is_recommended, recommend_type, recommend_comment)
values
  -- user-1의 책장
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000301', 'reading', 180, false, null, null),
  -- user-2의 책장 (월든 완독 및 코스모스 읽기중 및 추천)
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000301', 'completed', 450, false, null, null),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000302', 'reading', 230, true, 'read', '우주의 고요한 아름다움을 함께 사색하고 싶어 추천합니다.'),
  -- user-3의 책장
  ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000301', 'reading', 80, false, null, null)
on conflict (id) do nothing;

-- 7. user_book_memos (비공개 개인책장 한 줄 메모)
insert into public.user_book_memos (id, user_book_id, page, content)
values
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000401', 50, '자연의 고독은 도망이 아닌 자아의 성찰이라는 문구에 깊이 공감한다.'),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000402', 450, '마지막 장을 덮으며 숲을 나오는 주인공의 발걸음이 내 일상으로 이어진다.')
on conflict (id) do nothing;

-- 8. monthly_books (공유책 선정 및 일정 흐름)
-- group-1: 숲속의 북클럽의 2026년 5월 공유 도서로 '월든' 매핑 (질문 정제 단계)
insert into public.monthly_books (id, group_id, book_id, month, stage, timeline_reading, timeline_question, timeline_discussion)
values
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000301', '2026-05', 'question', '05.01~05.14', '05.15~05.25', '05.26~05.31')
on conflict (id) do nothing;

-- 9. questions (사색 질문 제안함)
insert into public.questions (id, group_id, book_id, user_id, content, status, is_spoiler, reaction_curious_count, reaction_talk_count)
values
  -- group-1 선정 질문들
  ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000002', 'Q. 주인공이 문명사회를 등지고 숲속으로 들어간 행동은 현실 기피일까요, 아니면 온전한 자아 회복을 위한 필요적 격리였을까요?', 'selected', false, 5, 3),
  ('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000003', 'Q. 저자가 설파하는 단순함(Simplicity)의 실천이 바쁜 일상을 살아가는 2026년 현대의 우리에게도 동일하게 적용될 수 있을까요?', 'selected', false, 4, 2),
  ('00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', 'Q. 고독을 예찬하는 주인공의 시선을 보며, 일상에서 우리 자신을 마주하는 온전한 시간이 얼마나 확보되어 있는지 묻고 싶습니다.', 'suggested', false, 8, 5)
on conflict (id) do nothing;

-- 10. question_feedback (질문 다듬기 의견)
insert into public.question_feedback (id, question_id, user_id, content)
values
  ('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000002', '더 대답하기 편하게 현실의 구체적인 시간(예: 스마트폰을 끄는 10분 등)을 대입해보면 어떨까요?')
on conflict (id) do nothing;

-- 11. discussion_comments (토론 댓글 및 개인 자문자답 생각 보드)
insert into public.discussion_comments (id, question_id, user_id, content)
values
  ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000002', '도망이라기보다 스스로의 한계를 시험하고 진짜 삶을 가늠하기 위한 실험적 행동이라고 생각해요.'),
  ('00000000-0000-0000-0000-000000000902', '00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000003', '현대의 관점에서 본다면 조용한 안식처를 향한 귀농이나 템플스테이 같은 자발적 휴식에 가깝지 않을까요?')
on conflict (id) do nothing;

-- 12. book_recommendations (다음 달 후보 추천 등록)
insert into public.book_recommendations (id, group_id, user_id, book_id, recommend_type, comment, reaction_curious_count, reaction_wish_count)
values
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000302', 'read', '우주라는 깊은 사색을 함께 나누기 위해 추천합니다.', 10, 6)
on conflict (id) do nothing;
