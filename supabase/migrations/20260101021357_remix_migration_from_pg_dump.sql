CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: user_permission; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_permission AS ENUM (
    'crawl_movies',
    'movies_add',
    'movies_edit',
    'movies_delete',
    'categories_add',
    'categories_edit',
    'categories_delete',
    'menus_add',
    'menus_edit',
    'menus_delete',
    'access_settings'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;


--
-- Name: has_any_permission(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_any_permission(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permissions
    WHERE user_id = _user_id
    LIMIT 1
  ) OR public.is_admin(_user_id)
$$;


--
-- Name: has_permission(uuid, public.user_permission); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_permission(_user_id uuid, _permission public.user_permission) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = _user_id AND permission = _permission
  ) OR public.is_admin(_user_id)
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = 'admin'
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


SET default_table_access_method = heap;

--
-- Name: actors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.actors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    seo_title text,
    seo_description text,
    seo_keyword text,
    deleted_at timestamp with time zone
);


--
-- Name: advertisements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.advertisements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    ad_type text DEFAULT 'banner'::text NOT NULL,
    "position" text DEFAULT 'header'::text NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    pages text[] DEFAULT ARRAY['all'::text],
    display_order integer DEFAULT 0 NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_prompt_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_prompt_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    prompt_content text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.countries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    seo_title text,
    seo_description text,
    seo_keyword text,
    deleted_at timestamp with time zone
);


--
-- Name: crawl_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crawl_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    movies_added integer DEFAULT 0 NOT NULL,
    movies_updated integer DEFAULT 0 NOT NULL,
    duration text,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: deleted_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deleted_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    mime_type text,
    deleted_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_by uuid
);


--
-- Name: directors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.directors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    seo_title text,
    seo_description text,
    seo_keyword text,
    deleted_at timestamp with time zone
);


--
-- Name: episodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.episodes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    movie_id uuid NOT NULL,
    server_name text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    filename text,
    link_embed text,
    link_m3u8 text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    link_mp4 text
);


--
-- Name: genres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.genres (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    seo_title text,
    seo_description text,
    seo_keyword text,
    deleted_at timestamp with time zone
);


--
-- Name: homepage_widgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homepage_widgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    static_path text,
    widget_type text DEFAULT 'carousel'::text NOT NULL,
    status_filter text[] DEFAULT ARRAY['all'::text],
    category_ids uuid[] DEFAULT '{}'::uuid[],
    category_exclude boolean DEFAULT false,
    genre_ids uuid[] DEFAULT '{}'::uuid[],
    genre_exclude boolean DEFAULT false,
    country_ids uuid[] DEFAULT '{}'::uuid[],
    country_exclude boolean DEFAULT false,
    year_ids uuid[] DEFAULT '{}'::uuid[],
    year_exclude boolean DEFAULT false,
    sort_by text DEFAULT 'updated_at'::text NOT NULL,
    posts_count integer DEFAULT 12 NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    type_filter text[] DEFAULT ARRAY['all'::text],
    use_external_api boolean DEFAULT false,
    external_api_source text DEFAULT 'phimapi'::text
);


--
-- Name: media_seo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_seo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_path text NOT NULL,
    alt_text text,
    title text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_id uuid NOT NULL,
    parent_id uuid,
    title character varying(255) NOT NULL,
    url character varying(500),
    link_type character varying(50) DEFAULT 'custom'::character varying,
    link_target character varying(50) DEFAULT '_self'::character varying,
    icon character varying(100),
    css_class character varying(255),
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: menus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menus (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    location character varying(100) DEFAULT 'header'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: movie_actors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movie_actors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    movie_id uuid NOT NULL,
    actor_id uuid NOT NULL
);


--
-- Name: movie_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movie_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    seo_title text,
    seo_description text,
    seo_keyword text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: movie_category_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movie_category_map (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    movie_id uuid NOT NULL,
    category_id uuid NOT NULL
);


--
-- Name: movie_countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movie_countries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    movie_id uuid NOT NULL,
    country_id uuid NOT NULL
);


--
-- Name: movie_directors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movie_directors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    movie_id uuid NOT NULL,
    director_id uuid NOT NULL
);


--
-- Name: movie_genres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movie_genres (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    movie_id uuid NOT NULL,
    genre_id uuid NOT NULL
);


--
-- Name: movie_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movie_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    movie_id uuid NOT NULL,
    ip_hash text NOT NULL,
    rating integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT movie_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: movie_subtitles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movie_subtitles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    movie_id uuid NOT NULL,
    episode_id uuid,
    language text DEFAULT 'vi'::text NOT NULL,
    label text NOT NULL,
    file_url text NOT NULL,
    file_type text DEFAULT 'vtt'::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: movie_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movie_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    movie_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


--
-- Name: movies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    origin_name text,
    content text,
    type text DEFAULT 'single'::text NOT NULL,
    status text DEFAULT 'ongoing'::text NOT NULL,
    poster_url text,
    thumb_url text,
    trailer_url text,
    "time" text,
    episode_current text,
    episode_total text,
    quality text,
    lang text,
    year integer,
    view_count integer DEFAULT 0 NOT NULL,
    view_day integer DEFAULT 0 NOT NULL,
    view_week integer DEFAULT 0 NOT NULL,
    view_month integer DEFAULT 0 NOT NULL,
    is_copyright boolean DEFAULT false NOT NULL,
    chieurap boolean DEFAULT false NOT NULL,
    sub_docquyen boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    seo_title text,
    seo_description text,
    seo_keyword text,
    schema_json text,
    deleted_at timestamp with time zone
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    notification_type text DEFAULT 'info'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    display_order integer DEFAULT 0 NOT NULL,
    show_on_pages text[] DEFAULT ARRAY['all'::text],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: post_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    seo_title text,
    seo_description text,
    seo_keyword text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    content text,
    excerpt text,
    thumbnail_url text,
    status text DEFAULT 'draft'::text NOT NULL,
    seo_title text,
    seo_description text,
    seo_keyword text,
    schema_json text,
    author_id uuid,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category_id uuid
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: seo_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value text,
    setting_type text DEFAULT 'text'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    seo_title text,
    seo_description text,
    seo_keyword text,
    deleted_at timestamp with time zone
);


--
-- Name: tv_channel_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tv_channel_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: tv_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tv_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    logo_url text,
    category_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    schedule_code text,
    streaming_sources jsonb DEFAULT '[]'::jsonb NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    permission public.user_permission NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: years; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.years (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    year integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: actors actors_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actors
    ADD CONSTRAINT actors_name_key UNIQUE (name);


--
-- Name: actors actors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actors
    ADD CONSTRAINT actors_pkey PRIMARY KEY (id);


--
-- Name: actors actors_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actors
    ADD CONSTRAINT actors_slug_key UNIQUE (slug);


--
-- Name: advertisements advertisements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advertisements
    ADD CONSTRAINT advertisements_pkey PRIMARY KEY (id);


--
-- Name: ai_prompt_templates ai_prompt_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompt_templates
    ADD CONSTRAINT ai_prompt_templates_pkey PRIMARY KEY (id);


--
-- Name: countries countries_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_name_key UNIQUE (name);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- Name: countries countries_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_slug_key UNIQUE (slug);


--
-- Name: crawl_logs crawl_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crawl_logs
    ADD CONSTRAINT crawl_logs_pkey PRIMARY KEY (id);


--
-- Name: deleted_media deleted_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_media
    ADD CONSTRAINT deleted_media_pkey PRIMARY KEY (id);


--
-- Name: directors directors_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.directors
    ADD CONSTRAINT directors_name_key UNIQUE (name);


--
-- Name: directors directors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.directors
    ADD CONSTRAINT directors_pkey PRIMARY KEY (id);


--
-- Name: directors directors_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.directors
    ADD CONSTRAINT directors_slug_key UNIQUE (slug);


--
-- Name: episodes episodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.episodes
    ADD CONSTRAINT episodes_pkey PRIMARY KEY (id);


--
-- Name: genres genres_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_name_key UNIQUE (name);


--
-- Name: genres genres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_pkey PRIMARY KEY (id);


--
-- Name: genres genres_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_slug_key UNIQUE (slug);


--
-- Name: homepage_widgets homepage_widgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homepage_widgets
    ADD CONSTRAINT homepage_widgets_pkey PRIMARY KEY (id);


--
-- Name: media_seo media_seo_file_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_seo
    ADD CONSTRAINT media_seo_file_path_key UNIQUE (file_path);


--
-- Name: media_seo media_seo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_seo
    ADD CONSTRAINT media_seo_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: menus menus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_pkey PRIMARY KEY (id);


--
-- Name: menus menus_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_slug_key UNIQUE (slug);


--
-- Name: movie_actors movie_actors_movie_id_actor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_actors
    ADD CONSTRAINT movie_actors_movie_id_actor_id_key UNIQUE (movie_id, actor_id);


--
-- Name: movie_actors movie_actors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_actors
    ADD CONSTRAINT movie_actors_pkey PRIMARY KEY (id);


--
-- Name: movie_categories movie_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_categories
    ADD CONSTRAINT movie_categories_pkey PRIMARY KEY (id);


--
-- Name: movie_categories movie_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_categories
    ADD CONSTRAINT movie_categories_slug_key UNIQUE (slug);


--
-- Name: movie_category_map movie_category_map_movie_id_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_category_map
    ADD CONSTRAINT movie_category_map_movie_id_category_id_key UNIQUE (movie_id, category_id);


--
-- Name: movie_category_map movie_category_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_category_map
    ADD CONSTRAINT movie_category_map_pkey PRIMARY KEY (id);


--
-- Name: movie_countries movie_countries_movie_id_country_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_countries
    ADD CONSTRAINT movie_countries_movie_id_country_id_key UNIQUE (movie_id, country_id);


--
-- Name: movie_countries movie_countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_countries
    ADD CONSTRAINT movie_countries_pkey PRIMARY KEY (id);


--
-- Name: movie_directors movie_directors_movie_id_director_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_directors
    ADD CONSTRAINT movie_directors_movie_id_director_id_key UNIQUE (movie_id, director_id);


--
-- Name: movie_directors movie_directors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_directors
    ADD CONSTRAINT movie_directors_pkey PRIMARY KEY (id);


--
-- Name: movie_genres movie_genres_movie_id_genre_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_genres
    ADD CONSTRAINT movie_genres_movie_id_genre_id_key UNIQUE (movie_id, genre_id);


--
-- Name: movie_genres movie_genres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_genres
    ADD CONSTRAINT movie_genres_pkey PRIMARY KEY (id);


--
-- Name: movie_ratings movie_ratings_movie_id_ip_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_ratings
    ADD CONSTRAINT movie_ratings_movie_id_ip_hash_key UNIQUE (movie_id, ip_hash);


--
-- Name: movie_ratings movie_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_ratings
    ADD CONSTRAINT movie_ratings_pkey PRIMARY KEY (id);


--
-- Name: movie_subtitles movie_subtitles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_subtitles
    ADD CONSTRAINT movie_subtitles_pkey PRIMARY KEY (id);


--
-- Name: movie_tags movie_tags_movie_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_tags
    ADD CONSTRAINT movie_tags_movie_id_tag_id_key UNIQUE (movie_id, tag_id);


--
-- Name: movie_tags movie_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_tags
    ADD CONSTRAINT movie_tags_pkey PRIMARY KEY (id);


--
-- Name: movies movies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movies
    ADD CONSTRAINT movies_pkey PRIMARY KEY (id);


--
-- Name: movies movies_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movies
    ADD CONSTRAINT movies_slug_key UNIQUE (slug);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: post_categories post_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_categories
    ADD CONSTRAINT post_categories_pkey PRIMARY KEY (id);


--
-- Name: post_categories post_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_categories
    ADD CONSTRAINT post_categories_slug_key UNIQUE (slug);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: posts posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_slug_key UNIQUE (slug);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: seo_settings seo_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_settings
    ADD CONSTRAINT seo_settings_pkey PRIMARY KEY (id);


--
-- Name: seo_settings seo_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_settings
    ADD CONSTRAINT seo_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: tags tags_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_slug_key UNIQUE (slug);


--
-- Name: tv_channel_categories tv_channel_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tv_channel_categories
    ADD CONSTRAINT tv_channel_categories_pkey PRIMARY KEY (id);


--
-- Name: tv_channel_categories tv_channel_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tv_channel_categories
    ADD CONSTRAINT tv_channel_categories_slug_key UNIQUE (slug);


--
-- Name: tv_channels tv_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tv_channels
    ADD CONSTRAINT tv_channels_pkey PRIMARY KEY (id);


--
-- Name: tv_channels tv_channels_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tv_channels
    ADD CONSTRAINT tv_channels_slug_key UNIQUE (slug);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_user_id_permission_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_permission_key UNIQUE (user_id, permission);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: years years_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.years
    ADD CONSTRAINT years_pkey PRIMARY KEY (id);


--
-- Name: years years_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.years
    ADD CONSTRAINT years_year_key UNIQUE (year);


--
-- Name: idx_menu_items_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_display_order ON public.menu_items USING btree (display_order);


--
-- Name: idx_menu_items_menu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_menu_id ON public.menu_items USING btree (menu_id);


--
-- Name: idx_menu_items_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_parent_id ON public.menu_items USING btree (parent_id);


--
-- Name: idx_menus_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menus_location ON public.menus USING btree (location);


--
-- Name: idx_post_categories_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_post_categories_deleted_at ON public.post_categories USING btree (deleted_at);


--
-- Name: idx_posts_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_category_id ON public.posts USING btree (category_id);


--
-- Name: advertisements update_advertisements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_advertisements_updated_at BEFORE UPDATE ON public.advertisements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_prompt_templates update_ai_prompt_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_prompt_templates_updated_at BEFORE UPDATE ON public.ai_prompt_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: homepage_widgets update_homepage_widgets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_homepage_widgets_updated_at BEFORE UPDATE ON public.homepage_widgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menu_items update_menu_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menus update_menus_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_menus_updated_at BEFORE UPDATE ON public.menus FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: movies update_movies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_movies_updated_at BEFORE UPDATE ON public.movies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notifications update_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: post_categories update_post_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_post_categories_updated_at BEFORE UPDATE ON public.post_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: posts update_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: seo_settings update_seo_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_seo_settings_updated_at BEFORE UPDATE ON public.seo_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: site_settings update_site_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tv_channels update_tv_channels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tv_channels_updated_at BEFORE UPDATE ON public.tv_channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: deleted_media deleted_media_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deleted_media
    ADD CONSTRAINT deleted_media_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id);


--
-- Name: episodes episodes_movie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.episodes
    ADD CONSTRAINT episodes_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;


--
-- Name: menu_items menu_items_menu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES public.menus(id) ON DELETE CASCADE;


--
-- Name: menu_items menu_items_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: movie_actors movie_actors_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_actors
    ADD CONSTRAINT movie_actors_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE CASCADE;


--
-- Name: movie_actors movie_actors_movie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_actors
    ADD CONSTRAINT movie_actors_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;


--
-- Name: movie_category_map movie_category_map_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_category_map
    ADD CONSTRAINT movie_category_map_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.movie_categories(id) ON DELETE CASCADE;


--
-- Name: movie_category_map movie_category_map_movie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_category_map
    ADD CONSTRAINT movie_category_map_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;


--
-- Name: movie_countries movie_countries_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_countries
    ADD CONSTRAINT movie_countries_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE CASCADE;


--
-- Name: movie_countries movie_countries_movie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_countries
    ADD CONSTRAINT movie_countries_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;


--
-- Name: movie_directors movie_directors_director_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_directors
    ADD CONSTRAINT movie_directors_director_id_fkey FOREIGN KEY (director_id) REFERENCES public.directors(id) ON DELETE CASCADE;


--
-- Name: movie_directors movie_directors_movie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_directors
    ADD CONSTRAINT movie_directors_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;


--
-- Name: movie_genres movie_genres_genre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_genres
    ADD CONSTRAINT movie_genres_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id) ON DELETE CASCADE;


--
-- Name: movie_genres movie_genres_movie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_genres
    ADD CONSTRAINT movie_genres_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;


--
-- Name: movie_ratings movie_ratings_movie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_ratings
    ADD CONSTRAINT movie_ratings_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;


--
-- Name: movie_subtitles movie_subtitles_episode_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_subtitles
    ADD CONSTRAINT movie_subtitles_episode_id_fkey FOREIGN KEY (episode_id) REFERENCES public.episodes(id) ON DELETE CASCADE;


--
-- Name: movie_subtitles movie_subtitles_movie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_subtitles
    ADD CONSTRAINT movie_subtitles_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;


--
-- Name: movie_tags movie_tags_movie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_tags
    ADD CONSTRAINT movie_tags_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;


--
-- Name: movie_tags movie_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movie_tags
    ADD CONSTRAINT movie_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: posts posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id);


--
-- Name: posts posts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.post_categories(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tv_channels tv_channels_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tv_channels
    ADD CONSTRAINT tv_channels_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.tv_channel_categories(id) ON DELETE SET NULL;


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: actors Actors are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Actors are viewable by everyone" ON public.actors FOR SELECT USING (((deleted_at IS NULL) OR public.is_admin(auth.uid())));


--
-- Name: actors Admins can delete actors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete actors" ON public.actors FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: advertisements Admins can delete ads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete ads" ON public.advertisements FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: countries Admins can delete countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete countries" ON public.countries FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: deleted_media Admins can delete deleted media records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete deleted media records" ON public.deleted_media FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: directors Admins can delete directors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete directors" ON public.directors FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: episodes Admins can delete episodes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete episodes" ON public.episodes FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: genres Admins can delete genres; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete genres" ON public.genres FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: media_seo Admins can delete media seo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete media seo" ON public.media_seo FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: movie_actors Admins can delete movie actors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete movie actors" ON public.movie_actors FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: movie_categories Admins can delete movie categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete movie categories" ON public.movie_categories FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: movie_category_map Admins can delete movie category map; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete movie category map" ON public.movie_category_map FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: movie_countries Admins can delete movie countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete movie countries" ON public.movie_countries FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: movie_directors Admins can delete movie directors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete movie directors" ON public.movie_directors FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: movie_genres Admins can delete movie genres; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete movie genres" ON public.movie_genres FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: movie_tags Admins can delete movie tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete movie tags" ON public.movie_tags FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: movies Admins can delete movies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete movies" ON public.movies FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: notifications Admins can delete notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete notifications" ON public.notifications FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: user_permissions Admins can delete permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete permissions" ON public.user_permissions FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: post_categories Admins can delete post categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete post categories" ON public.post_categories FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: posts Admins can delete posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete posts" ON public.posts FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: profiles Admins can delete profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: seo_settings Admins can delete seo settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete seo settings" ON public.seo_settings FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: site_settings Admins can delete site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete site settings" ON public.site_settings FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: movie_subtitles Admins can delete subtitles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete subtitles" ON public.movie_subtitles FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: tags Admins can delete tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete tags" ON public.tags FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: tv_channel_categories Admins can delete tv channel categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete tv channel categories" ON public.tv_channel_categories FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: tv_channels Admins can delete tv channels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete tv channels" ON public.tv_channels FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: homepage_widgets Admins can delete widgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete widgets" ON public.homepage_widgets FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: years Admins can delete years; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete years" ON public.years FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: actors Admins can insert actors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert actors" ON public.actors FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: advertisements Admins can insert ads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert ads" ON public.advertisements FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: countries Admins can insert countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert countries" ON public.countries FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: crawl_logs Admins can insert crawl logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert crawl logs" ON public.crawl_logs FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: deleted_media Admins can insert deleted media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert deleted media" ON public.deleted_media FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: directors Admins can insert directors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert directors" ON public.directors FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: episodes Admins can insert episodes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert episodes" ON public.episodes FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: genres Admins can insert genres; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert genres" ON public.genres FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: media_seo Admins can insert media seo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert media seo" ON public.media_seo FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: movie_actors Admins can insert movie actors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert movie actors" ON public.movie_actors FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: movie_categories Admins can insert movie categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert movie categories" ON public.movie_categories FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: movie_category_map Admins can insert movie category map; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert movie category map" ON public.movie_category_map FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: movie_countries Admins can insert movie countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert movie countries" ON public.movie_countries FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: movie_directors Admins can insert movie directors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert movie directors" ON public.movie_directors FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: movie_genres Admins can insert movie genres; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert movie genres" ON public.movie_genres FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: movie_tags Admins can insert movie tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert movie tags" ON public.movie_tags FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: movies Admins can insert movies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert movies" ON public.movies FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: notifications Admins can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: user_permissions Admins can insert permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert permissions" ON public.user_permissions FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: post_categories Admins can insert post categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert post categories" ON public.post_categories FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: posts Admins can insert posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert posts" ON public.posts FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: seo_settings Admins can insert seo settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert seo settings" ON public.seo_settings FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: site_settings Admins can insert site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert site settings" ON public.site_settings FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: movie_subtitles Admins can insert subtitles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert subtitles" ON public.movie_subtitles FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: tags Admins can insert tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert tags" ON public.tags FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: tv_channel_categories Admins can insert tv channel categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert tv channel categories" ON public.tv_channel_categories FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: tv_channels Admins can insert tv channels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert tv channels" ON public.tv_channels FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: homepage_widgets Admins can insert widgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert widgets" ON public.homepage_widgets FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: years Admins can insert years; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert years" ON public.years FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: menu_items Admins can manage menu items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage menu items" ON public.menu_items USING (public.is_admin(auth.uid()));


--
-- Name: menus Admins can manage menus; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage menus" ON public.menus USING (public.is_admin(auth.uid()));


--
-- Name: actors Admins can update actors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update actors" ON public.actors FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: advertisements Admins can update ads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update ads" ON public.advertisements FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: countries Admins can update countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update countries" ON public.countries FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: crawl_logs Admins can update crawl logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update crawl logs" ON public.crawl_logs FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: directors Admins can update directors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update directors" ON public.directors FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: episodes Admins can update episodes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update episodes" ON public.episodes FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: genres Admins can update genres; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update genres" ON public.genres FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: media_seo Admins can update media seo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update media seo" ON public.media_seo FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: movie_categories Admins can update movie categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update movie categories" ON public.movie_categories FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: movies Admins can update movies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update movies" ON public.movies FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: notifications Admins can update notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update notifications" ON public.notifications FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: post_categories Admins can update post categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update post categories" ON public.post_categories FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: posts Admins can update posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update posts" ON public.posts FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: seo_settings Admins can update seo settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update seo settings" ON public.seo_settings FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: site_settings Admins can update site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update site settings" ON public.site_settings FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: movie_subtitles Admins can update subtitles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update subtitles" ON public.movie_subtitles FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: tags Admins can update tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update tags" ON public.tags FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: tv_channel_categories Admins can update tv channel categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update tv channel categories" ON public.tv_channel_categories FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: tv_channels Admins can update tv channels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update tv channels" ON public.tv_channels FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: homepage_widgets Admins can update widgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update widgets" ON public.homepage_widgets FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: years Admins can update years; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update years" ON public.years FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: notifications Admins can view all notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all notifications" ON public.notifications FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: user_permissions Admins can view all permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all permissions" ON public.user_permissions FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: deleted_media Admins can view deleted media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view deleted media" ON public.deleted_media FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: advertisements Ads are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Ads are viewable by everyone" ON public.advertisements FOR SELECT USING (true);


--
-- Name: movie_ratings Anyone can rate movies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can rate movies" ON public.movie_ratings FOR INSERT WITH CHECK (true);


--
-- Name: movie_ratings Anyone can update their rating; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update their rating" ON public.movie_ratings FOR UPDATE USING (true);


--
-- Name: countries Countries are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Countries are viewable by everyone" ON public.countries FOR SELECT USING (((deleted_at IS NULL) OR public.is_admin(auth.uid())));


--
-- Name: crawl_logs Crawl logs are viewable by admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Crawl logs are viewable by admins" ON public.crawl_logs FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: directors Directors are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Directors are viewable by everyone" ON public.directors FOR SELECT USING (((deleted_at IS NULL) OR public.is_admin(auth.uid())));


--
-- Name: episodes Episodes are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Episodes are viewable by everyone" ON public.episodes FOR SELECT USING (true);


--
-- Name: genres Genres are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Genres are viewable by everyone" ON public.genres FOR SELECT USING (((deleted_at IS NULL) OR public.is_admin(auth.uid())));


--
-- Name: media_seo Media SEO is viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Media SEO is viewable by everyone" ON public.media_seo FOR SELECT USING (true);


--
-- Name: menu_items Menu items are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Menu items are viewable by everyone" ON public.menu_items FOR SELECT USING (true);


--
-- Name: menus Menus are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Menus are viewable by everyone" ON public.menus FOR SELECT USING (true);


--
-- Name: movie_actors Movie actors are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Movie actors are viewable by everyone" ON public.movie_actors FOR SELECT USING (true);


--
-- Name: movie_categories Movie categories are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Movie categories are viewable by everyone" ON public.movie_categories FOR SELECT USING (((deleted_at IS NULL) OR public.is_admin(auth.uid())));


--
-- Name: movie_category_map Movie category map is viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Movie category map is viewable by everyone" ON public.movie_category_map FOR SELECT USING (true);


--
-- Name: movie_countries Movie countries are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Movie countries are viewable by everyone" ON public.movie_countries FOR SELECT USING (true);


--
-- Name: movie_directors Movie directors are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Movie directors are viewable by everyone" ON public.movie_directors FOR SELECT USING (true);


--
-- Name: movie_genres Movie genres are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Movie genres are viewable by everyone" ON public.movie_genres FOR SELECT USING (true);


--
-- Name: movie_tags Movie tags are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Movie tags are viewable by everyone" ON public.movie_tags FOR SELECT USING (true);


--
-- Name: movies Movies are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Movies are viewable by everyone" ON public.movies FOR SELECT USING (((deleted_at IS NULL) OR public.is_admin(auth.uid())));


--
-- Name: notifications Notifications are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Notifications are viewable by everyone" ON public.notifications FOR SELECT USING (((is_active = true) AND ((start_date IS NULL) OR (start_date <= now())) AND ((end_date IS NULL) OR (end_date >= now()))));


--
-- Name: ai_prompt_templates Only admins can manage prompt templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage prompt templates" ON public.ai_prompt_templates USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: post_categories Post categories are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Post categories are viewable by everyone" ON public.post_categories FOR SELECT USING (((deleted_at IS NULL) OR public.is_admin(auth.uid())));


--
-- Name: posts Posts are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING ((deleted_at IS NULL));


--
-- Name: movie_ratings Ratings are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Ratings are viewable by everyone" ON public.movie_ratings FOR SELECT USING (true);


--
-- Name: seo_settings SEO settings are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "SEO settings are viewable by everyone" ON public.seo_settings FOR SELECT USING (true);


--
-- Name: site_settings Site settings are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Site settings are viewable by everyone" ON public.site_settings FOR SELECT USING (true);


--
-- Name: movie_subtitles Subtitles are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Subtitles are viewable by everyone" ON public.movie_subtitles FOR SELECT USING (true);


--
-- Name: tv_channel_categories TV channel categories are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "TV channel categories are viewable by everyone" ON public.tv_channel_categories FOR SELECT USING (((deleted_at IS NULL) OR public.is_admin(auth.uid())));


--
-- Name: tv_channels TV channels are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "TV channels are viewable by everyone" ON public.tv_channels FOR SELECT USING ((((deleted_at IS NULL) AND (is_active = true)) OR public.is_admin(auth.uid())));


--
-- Name: tags Tags are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tags are viewable by everyone" ON public.tags FOR SELECT USING (((deleted_at IS NULL) OR public.is_admin(auth.uid())));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: user_permissions Users can view their own permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own permissions" ON public.user_permissions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: homepage_widgets Widgets are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Widgets are viewable by everyone" ON public.homepage_widgets FOR SELECT USING (((is_active = true) OR public.is_admin(auth.uid())));


--
-- Name: years Years are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Years are viewable by everyone" ON public.years FOR SELECT USING (((deleted_at IS NULL) OR public.is_admin(auth.uid())));


--
-- Name: actors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.actors ENABLE ROW LEVEL SECURITY;

--
-- Name: advertisements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_prompt_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: countries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

--
-- Name: crawl_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crawl_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: deleted_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deleted_media ENABLE ROW LEVEL SECURITY;

--
-- Name: directors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.directors ENABLE ROW LEVEL SECURITY;

--
-- Name: episodes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

--
-- Name: genres; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

--
-- Name: homepage_widgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.homepage_widgets ENABLE ROW LEVEL SECURITY;

--
-- Name: media_seo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.media_seo ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

--
-- Name: menus; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

--
-- Name: movie_actors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.movie_actors ENABLE ROW LEVEL SECURITY;

--
-- Name: movie_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.movie_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: movie_category_map; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.movie_category_map ENABLE ROW LEVEL SECURITY;

--
-- Name: movie_countries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.movie_countries ENABLE ROW LEVEL SECURITY;

--
-- Name: movie_directors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.movie_directors ENABLE ROW LEVEL SECURITY;

--
-- Name: movie_genres; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.movie_genres ENABLE ROW LEVEL SECURITY;

--
-- Name: movie_ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.movie_ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: movie_subtitles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.movie_subtitles ENABLE ROW LEVEL SECURITY;

--
-- Name: movie_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.movie_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: movies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: post_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: seo_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

--
-- Name: tv_channel_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tv_channel_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: tv_channels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tv_channels ENABLE ROW LEVEL SECURITY;

--
-- Name: user_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: years; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.years ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;