-- Remove the retired PDF to Word tool from Supabase.
begin;

delete from public.redirects
where from_path in ('/tool/pdf-to-word', '/pdf-to-word')
   or to_path = '/tool/pdf-to-word';

delete from public.tools
where slug = 'pdf-to-word';

update public.categories
set tool_count = (
  select count(*)
  from public.tools
  where tools.category_id = categories.id
    and tools.status = 'published'
)
where slug = 'pdf-tools';

commit;
