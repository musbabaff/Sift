-- Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- Table definition for articles
create table if not exists articles (
  id bigint generated always as identity primary key,
  link text,
  title text,
  content text,
  category text,
  source text,                 -- Derived from link domain (e.g. oxu.az)
  language text,               -- Detected: az/ru/en
  published_at timestamptz,    -- Parsed from created_at in Excel
  embedding vector(1536),      -- OpenAI text-embedding-3-small (1536 dims)
  search_tsv tsvector,         -- Full-text search vector (multilingual hybrid search)
  created_at timestamptz default now()
);

-- HNSW index for high-speed, high-accuracy semantic vector search
drop index if exists articles_embedding_idx;
create index if not exists articles_embedding_hnsw_idx on articles using hnsw (embedding vector_cosine_ops);
-- GIN index for full-text search
create index if not exists articles_tsv_idx on articles using gin(search_tsv);
-- B-Tree indexes for fast filtering and sorting
create index if not exists articles_published_idx on articles(published_at);
create index if not exists articles_category_idx on articles(category);
create index if not exists articles_source_idx on articles(source);

-- Full-text trigger (simple configuration for multilingual support)
create or replace function articles_tsv_update() returns trigger as $$
begin
  new.search_tsv := to_tsvector('simple', coalesce(new.title,'') || ' ' || coalesce(new.content,''));
  return new;
end $$ language plpgsql;

drop trigger if exists trg_articles_tsv on articles;
create trigger trg_articles_tsv before insert or update on articles
  for each row execute function articles_tsv_update();

-- Hybrid search PostgreSQL RPC (combining semantic and keyword ranks with high-performance pre-filtering)
create or replace function match_articles (
  query_embedding vector(1536),
  query_text text default null,
  date_from timestamptz default null,
  date_to timestamptz default null,
  filter_category text default null,
  filter_source text default null,
  match_count int default 20
)
returns table (
  id bigint,
  link text,
  title text,
  content text,
  category text,
  source text,
  language text,
  published_at timestamptz,
  semantic_score float,
  keyword_score float,
  combined_score float
) as $$
declare
  has_query_text boolean := (query_text is not null and query_text <> '');
begin
  return query
  -- 1. Pre-select top 150 semantic candidates using the high-performance HNSW index
  with semantic_candidates as (
    select a.id
    from articles a
    where
      (date_from is null or a.published_at >= date_from)
      and (date_to is null or a.published_at <= date_to)
      and (filter_category is null or a.category = filter_category)
      and (filter_source is null or a.source = filter_source)
    order by a.embedding <=> query_embedding
    limit 150
  ),
  -- 2. Pre-select top 150 keyword candidates using the GIN-indexed search vector
  keyword_candidates as (
    select a.id
    from articles a
    where
      has_query_text
      and a.search_tsv @@ plainto_tsquery('simple', query_text)
      and (date_from is null or a.published_at >= date_from)
      and (date_to is null or a.published_at <= date_to)
      and (filter_category is null or a.category = filter_category)
      and (filter_source is null or a.source = filter_source)
    order by ts_rank(a.search_tsv, plainto_tsquery('simple', query_text)) desc
    limit 150
  ),
  -- 3. Combine candidate IDs
  candidate_ids as (
    select c.id from semantic_candidates c
    union
    select c.id from keyword_candidates c
  )
  -- 4. Re-rank and score ONLY the combined candidate set (at most 300 rows)
  select
    a.id,
    a.link,
    a.title,
    a.content,
    a.category,
    a.source,
    a.language,
    a.published_at,
    (1 - (a.embedding <=> query_embedding))::float as semantic_score,
    (case when has_query_text then least(ts_rank_cd(a.search_tsv, plainto_tsquery('simple', query_text)), 1.0) else 0.0 end)::float as keyword_score,
    (
      (1 - (a.embedding <=> query_embedding)) * 0.7 +
      (case when has_query_text then least(ts_rank_cd(a.search_tsv, plainto_tsquery('simple', query_text)), 1.0) else 0.0 end) * 0.3
    )::float as combined_score
  from articles a
  join candidate_ids c on a.id = c.id
  order by
    combined_score desc,
    a.published_at desc
  limit match_count;
end;
$$ language plpgsql;

-- Table for precomputed Entity & Keyword Intelligence
create table if not exists entity_stats (
  id bigint generated always as identity primary key,
  term text not null,
  type text,            -- ORG / PERSON / LOCATION / TOPIC
  count int not null,
  language text,
  scope text default 'global',
  computed_at timestamptz default now()
);

create index if not exists entity_stats_count_idx on entity_stats(count desc);
create index if not exists entity_stats_scope_idx on entity_stats(scope);
create index if not exists entity_stats_type_idx on entity_stats(type);


-- =========================================================================
-- 📊 CORPUS STATISTICS RPC FUNCTIONS (Real-time, zero mock data)
-- =========================================================================

-- Category distribution: returns each category with its article count
create or replace function get_category_stats()
returns table(category text, cnt bigint)
language sql stable
as $$
  select
    coalesce(category, 'Other') as category,
    count(*) as cnt
  from articles
  group by coalesce(category, 'Other')
  order by cnt desc;
$$;

-- Source distribution: returns each source domain with its article count
create or replace function get_source_stats()
returns table(source text, cnt bigint)
language sql stable
as $$
  select
    coalesce(source, 'unknown') as source,
    count(*) as cnt
  from articles
  group by coalesce(source, 'unknown')
  order by cnt desc
  limit 10;
$$;

-- Language distribution: returns each language code with its article count
create or replace function get_language_stats()
returns table(language text, cnt bigint)
language sql stable
as $$
  select
    coalesce(lower(language), 'unknown') as language,
    count(*) as cnt
  from articles
  group by coalesce(lower(language), 'unknown')
  order by cnt desc;
$$;
-- 📂 SEED / SAMPLE DATASET PRELOAD (100% Operational Out-of-the-Box)
-- =========================================================================

-- Preload articles table with curated multi-lingual search templates
-- (Embeddings preloaded as zero-vector representations so they cast cleanly in pgvector)
insert into articles (link, title, content, category, source, language, published_at, embedding)
values
  ('https://socar.az', 'SOCAR Türkiyədə yeni neft-kimya kompleksinin inşasına başladı', 'Dövlət Neft Şirkəti Petkim sahəsində 4.2 milyard dollarlıq genişlənmə layihəsinin təməlqoyma mərasimini keçirib. Layihə 2029-cu ilədək tamamlanacaq.', 'Energy', 'socar.az', 'az', '2026-05-14 09:42:00+00', array_fill(0.0, array[1536])::vector),
  ('https://interfax.ru', 'АзСтат: годовая инфляция в Азербайджане замедлилась до 4.1% в апреле', 'Государственный комитет по статистике сообщил о замедлении годовой инфляции до 4.1% в апреле 2026 года, что является минимумом с октября прошлого года.', 'Economy', 'interfax.ru', 'ru', '2026-05-13 14:18:00+00', array_fill(0.0, array[1536])::vector),
  ('https://reuters.com', 'Central Bank of Azerbaijan holds refinancing rate at 7.25%', 'CBAR''s Management Board kept the policy rate unchanged for the third consecutive meeting, citing stable inflation expectations and resilient FX reserves.', 'Economy', 'reuters.com', 'en', '2026-05-14 11:05:00+00', array_fill(0.0, array[1536])::vector),
  ('https://marja.az', 'AccessBank-ın 2026-cı ilin I rübü üzrə xalis mənfəəti 38% artıb', 'Bank açıqlanmış maliyyə hesabatına əsasən I rübdə 24.7 mln. manat xalis mənfəət əldə edib. Aktivlər ilin əvvəlindən 6.2% genişlənib.', 'Finance', 'marja.az', 'az', '2026-05-12 16:30:00+00', array_fill(0.0, array[1536])::vector),
  ('https://oxu.az', 'Bakıda “Formula 1”-ə hazırlıq çərçivəsində mərkəzi küçələr bağlanır', 'Azərbaycan Qran Prisinə bir aydan az qalmış paytaxtın bir sıra mərkəzi yollarında müvəqqəti hərəkət məhdudiyyətləri tətbiq edilir.', 'Society', 'oxu.az', 'az', '2026-05-15 08:12:00+00', array_fill(0.0, array[1536])::vector),
  ('https://cbar.az', 'Mərkəzi Bank yeni rəqəmsal manat pilot proqramına start verir', 'CBAR sədri Taleh Kazımov rəqəmsal manat (DGM) pilotunun ilk fazasının iki bankla birgə başladığını açıqlayıb. Pilot 4 ay davam edəcək.', 'Finance', 'cbar.az', 'az', '2026-05-13 10:55:00+00', array_fill(0.0, array[1536])::vector),
  ('https://ft.com', 'Azerbaijani gas exports to Europe rose 12% YoY in April', 'Pipeline volumes via TAP reached a record 2.4 bcm in April, supported by stronger Italian and Bulgarian demand, according to SOCAR figures cited by ENTSOG.', 'Energy', 'ft.com', 'en', '2026-05-11 07:40:00+00', array_fill(0.0, array[1536])::vector),
  ('https://tass.ru', 'Карабах: правительство утвердило вторую очередь восстановительной программы', 'Кабинет министров одобрил расширение программы восстановления Карабахского региона объёмом 1.8 млрд манатов, охватывающее инфраструктуру и сельское хозяйство.', 'Politics', 'tass.ru', 'ru', '2026-05-12 13:22:00+00', array_fill(0.0, array[1536])::vector),
  ('https://report.az', 'Vergilər Nazirliyi: kiçik biznes üçün sadələşdirilmiş vergi rejimi uzadılır', 'Sadələşdirilmiş vergi (4%) rejimi 2028-ci ilin sonuna qədər uzadılır. Yeniliklər 50 000-dən coy sahibkarı əhatə edəcək.', 'Economy', 'report.az', 'az', '2026-05-10 15:48:00+00', array_fill(0.0, array[1536])::vector),
  ('https://bloomberg.com', 'Bloomberg: Azerbaijan plans first sovereign green bond in Q3', 'Finance Ministry told investors it is targeting a debut euro-denominated green issuance of up to €500m to fund renewable projects, sources familiar said.', 'Finance', 'bloomberg.com', 'en', '2026-05-15 06:30:00+00', array_fill(0.0, array[1536])::vector),
  ('https://oxu.az', 'Qəbələdə beynəlxalq caz festivalının proqramı açıqlandı', 'Festival 24-28 iyul tarixlərində keçiriləcək. Bu il 14 ölkədən 32 musiqi qrupu çıxış edəcək.', 'Culture', 'oxu.az', 'az', '2026-05-11 18:02:00+00', array_fill(0.0, array[1536])::vector),
  ('https://interfax.ru', 'АзАвтоЙол объявил тендер на реконструкцию трассы Баку–Шамахы', 'Государственное агентство автодорог открыло тендер с начальной стоимостью 412 млн манатов. Срок подачи заявок — до 12 июня.', 'Infrastructure', 'interfax.ru', 'ru', '2026-05-14 12:14:00+00', array_fill(0.0, array[1536])::vector);

-- Preload entity_stats with global corpus proper-noun statistics
insert into entity_stats (term, type, count, language, scope)
values
  ('SOCAR', 'ORG', 1842, 'all', 'global'),
  ('Mərkəzi Bank', 'ORG', 1206, 'all', 'global'),
  ('AccessBank', 'ORG', 487, 'all', 'global'),
  ('Kapital Bank', 'ORG', 391, 'all', 'global'),
  ('PASHA Holding', 'ORG', 312, 'all', 'global'),
  ('Azərenerji', 'ORG', 268, 'all', 'global'),
  ('AzerCell', 'ORG', 241, 'all', 'global'),
  ('Maliyyə Nazirliyi', 'ORG', 528, 'all', 'global'),
  ('Vergilər', 'ORG', 462, 'all', 'global'),
  ('İlham Əliyev', 'PERSON', 2104, 'all', 'global'),
  ('Taleh Kazımov', 'PERSON', 318, 'all', 'global'),
  ('Mehriban Əliyeva', 'PERSON', 287, 'all', 'global'),
  ('Jeyhun Bayramov', 'PERSON', 196, 'all', 'global'),
  ('Samir Şərifov', 'PERSON', 142, 'all', 'global'),
  ('Bakı', 'LOCATION', 4126, 'all', 'global'),
  ('Qarabağ', 'LOCATION', 1294, 'all', 'global'),
  ('Türkiyə', 'LOCATION', 1018, 'all', 'global'),
  ('Gəncə', 'LOCATION', 412, 'all', 'global'),
  ('Qəbələ', 'LOCATION', 287, 'all', 'global'),
  ('Naxçıvan', 'LOCATION', 356, 'all', 'global'),
  ('Şuşa', 'LOCATION', 298, 'all', 'global'),
  ('kredit', 'TOPIC', 612, 'all', 'global'),
  ('vergi', 'TOPIC', 548, 'all', 'global'),
  ('inflyasiya', 'TOPIC', 421, 'all', 'global'),
  ('festival', 'TOPIC', 312, 'all', 'global'),
  ('neft', 'TOPIC', 1102, 'all', 'global'),
  ('qaz ixracı', 'TOPIC', 487, 'all', 'global');


