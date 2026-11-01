-- 0012_safety.sql
-- Chat messages are now sent through the server (/api/messages), which checks them for
-- sexual content, hate and violence first. Browsers may still read their own chats.
drop policy if exists "messages: members send" on public.messages;
revoke insert on public.messages from anon, authenticated;

-- Reports carry a category so they can be sorted quickly.
alter table public.reports add column if not exists category text
  check (category in ('scam', 'sexual', 'abuse', 'hate', 'minor', 'spam', 'other'));
