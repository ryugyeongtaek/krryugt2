-- Agent 운영형 대화 저장. 질문과 답변은 save_agent_turn RPC에서 한 transaction으로 저장합니다.
create table if not exists core.agent_conversation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  title text not null,
  started_at timestamptz not null default now(),
  last_at timestamptz not null default now()
);

create table if not exists core.agent_message (
  message_id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references core.agent_conversation(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool', 'system')),
  content text not null,
  answer jsonb,
  tool_trace jsonb,
  usage jsonb,
  guardrail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ix_agent_conversation_user_last on core.agent_conversation(user_id, last_at desc);
create index if not exists ix_agent_message_conversation_created on core.agent_message(conversation_id, created_at);

alter table core.agent_conversation enable row level security;
alter table core.agent_message enable row level security;

drop policy if exists agent_conversation_select on core.agent_conversation;
drop policy if exists conv_select_admin on core.agent_conversation;
drop policy if exists conv_select_own on core.agent_conversation;
drop policy if exists conv_insert_own on core.agent_conversation;
drop policy if exists conv_update_own on core.agent_conversation;
create policy agent_conversation_select on core.agent_conversation
  for select to authenticated
  using ((select auth.uid()) = user_id or (select core.is_admin()));

drop policy if exists agent_conversation_insert on core.agent_conversation;
create policy agent_conversation_insert on core.agent_conversation
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists agent_message_select on core.agent_message;
drop policy if exists msg_select_own on core.agent_message;
drop policy if exists msg_insert_own on core.agent_message;
create policy agent_message_select on core.agent_message
  for select to authenticated
  using (exists (
    select 1 from core.agent_conversation c
    where c.id = agent_message.conversation_id
      and ((select auth.uid()) = c.user_id or (select core.is_admin()))
  ));

drop policy if exists agent_message_insert on core.agent_message;
create policy agent_message_insert on core.agent_message
  for insert to authenticated
  with check (exists (
    select 1 from core.agent_conversation c
    where c.id = agent_message.conversation_id
      and (select auth.uid()) = c.user_id
  ));

revoke all on core.agent_conversation, core.agent_message from anon;
grant usage on schema core to authenticated;
grant select, insert on core.agent_conversation, core.agent_message to authenticated;

create or replace function core.save_agent_turn(
  p_conversation_id uuid default null,
  p_user_email text default null,
  p_title text default 'SCM Agent 대화',
  p_question text default null,
  p_answer jsonb default null,
  p_tool_trace jsonb default null,
  p_usage jsonb default null,
  p_guardrail jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = core, public
as $$
declare
  v_conversation_id uuid := p_conversation_id;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_question is null or p_answer is null then
    raise exception 'INVALID_AGENT_TURN';
  end if;

  if v_conversation_id is null then
    insert into core.agent_conversation(user_id, user_email, title)
    values (auth.uid(), coalesce(p_user_email, ''), coalesce(nullif(p_title, ''), 'SCM Agent 대화'))
    returning id into v_conversation_id;
  else
    if not exists (select 1 from core.agent_conversation where id = v_conversation_id and user_id = auth.uid()) then
      raise exception 'CONVERSATION_NOT_FOUND';
    end if;
    update core.agent_conversation set last_at = now() where id = v_conversation_id;
  end if;

  insert into core.agent_message(conversation_id, role, content)
  values (v_conversation_id, 'user', p_question);
  insert into core.agent_message(conversation_id, role, content, answer, tool_trace, usage, guardrail)
  values (v_conversation_id, 'assistant', p_answer::text, p_answer, p_tool_trace, p_usage, p_guardrail);
  update core.agent_conversation set last_at = now() where id = v_conversation_id;
  return v_conversation_id;
end;
$$;

revoke all on function core.save_agent_turn(uuid, text, text, text, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function core.save_agent_turn(uuid, text, text, text, jsonb, jsonb, jsonb, jsonb) to authenticated;

comment on table core.agent_conversation is 'Agent 대화 헤더. user_id 기준으로 격리';
comment on table core.agent_message is 'Agent 질문/답변 저장. 원본 Tool 데이터 대신 요약 trace만 저장';
comment on function core.save_agent_turn(uuid, text, text, text, jsonb, jsonb, jsonb, jsonb) is '질문과 구조화 답변을 한 transaction으로 저장';
