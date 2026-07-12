-- The /s/<code> short-link feature was removed — the userid URL
-- (/<username>) is the one short URL. Drop its table and public resolver.

drop function if exists public.resolve_short_link(text);
drop table if exists public.short_links;
