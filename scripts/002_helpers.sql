-- You can run this to create a helper function in Supabase (Postgres)
create or replace function public.get_random_questions_without_answers(p_limit int)
returns table(id uuid, question_text text, options jsonb)
language sql
as $$
  select q.id, q.question_text, q.options
  from public.questions q
  order by random()
  limit p_limit;
$$;
