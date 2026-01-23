export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      actors: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          seo_description: string | null
          seo_keyword: string | null
          seo_title: string | null
          slug: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug?: string
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          ad_type: string
          content: string
          created_at: string
          display_order: number
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          pages: string[] | null
          position: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          ad_type?: string
          content: string
          created_at?: string
          display_order?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          pages?: string[] | null
          position?: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          ad_type?: string
          content?: string
          created_at?: string
          display_order?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          pages?: string[] | null
          position?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_prompt_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          prompt_content: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          prompt_content: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          prompt_content?: string
          updated_at?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          seo_description: string | null
          seo_keyword: string | null
          seo_title: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug?: string
        }
        Relationships: []
      }
      crawl_logs: {
        Row: {
          created_at: string
          duration: string | null
          id: string
          message: string | null
          movies_added: number
          movies_updated: number
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          duration?: string | null
          id?: string
          message?: string | null
          movies_added?: number
          movies_updated?: number
          status?: string
          type: string
        }
        Update: {
          created_at?: string
          duration?: string | null
          id?: string
          message?: string | null
          movies_added?: number
          movies_updated?: number
          status?: string
          type?: string
        }
        Relationships: []
      }
      deleted_media: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
        }
        Relationships: []
      }
      directors: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          seo_description: string | null
          seo_keyword: string | null
          seo_title: string | null
          slug: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug?: string
        }
        Relationships: []
      }
      episodes: {
        Row: {
          created_at: string
          filename: string | null
          id: string
          link_embed: string | null
          link_m3u8: string | null
          link_mp4: string | null
          movie_id: string
          name: string
          server_name: string
          slug: string
        }
        Insert: {
          created_at?: string
          filename?: string | null
          id?: string
          link_embed?: string | null
          link_m3u8?: string | null
          link_mp4?: string | null
          movie_id: string
          name: string
          server_name: string
          slug: string
        }
        Update: {
          created_at?: string
          filename?: string | null
          id?: string
          link_embed?: string | null
          link_m3u8?: string | null
          link_mp4?: string | null
          movie_id?: string
          name?: string
          server_name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          seo_description: string | null
          seo_keyword: string | null
          seo_title: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug?: string
        }
        Relationships: []
      }
      homepage_widgets: {
        Row: {
          category_exclude: boolean | null
          category_ids: string[] | null
          country_exclude: boolean | null
          country_ids: string[] | null
          created_at: string
          display_order: number
          external_api_source: string | null
          genre_exclude: boolean | null
          genre_ids: string[] | null
          id: string
          is_active: boolean
          posts_count: number
          sort_by: string
          static_path: string | null
          status_filter: string[] | null
          title: string
          type_filter: string[] | null
          updated_at: string
          use_external_api: boolean | null
          widget_type: string
          year_exclude: boolean | null
          year_ids: string[] | null
        }
        Insert: {
          category_exclude?: boolean | null
          category_ids?: string[] | null
          country_exclude?: boolean | null
          country_ids?: string[] | null
          created_at?: string
          display_order?: number
          external_api_source?: string | null
          genre_exclude?: boolean | null
          genre_ids?: string[] | null
          id?: string
          is_active?: boolean
          posts_count?: number
          sort_by?: string
          static_path?: string | null
          status_filter?: string[] | null
          title: string
          type_filter?: string[] | null
          updated_at?: string
          use_external_api?: boolean | null
          widget_type?: string
          year_exclude?: boolean | null
          year_ids?: string[] | null
        }
        Update: {
          category_exclude?: boolean | null
          category_ids?: string[] | null
          country_exclude?: boolean | null
          country_ids?: string[] | null
          created_at?: string
          display_order?: number
          external_api_source?: string | null
          genre_exclude?: boolean | null
          genre_ids?: string[] | null
          id?: string
          is_active?: boolean
          posts_count?: number
          sort_by?: string
          static_path?: string | null
          status_filter?: string[] | null
          title?: string
          type_filter?: string[] | null
          updated_at?: string
          use_external_api?: boolean | null
          widget_type?: string
          year_exclude?: boolean | null
          year_ids?: string[] | null
        }
        Relationships: []
      }
      media_seo: {
        Row: {
          alt_text: string | null
          created_at: string
          description: string | null
          file_path: string
          id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          file_path: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          file_path?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          created_at: string
          css_class: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          link_target: string | null
          link_type: string | null
          menu_id: string
          parent_id: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          css_class?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          link_target?: string | null
          link_type?: string | null
          menu_id: string
          parent_id?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          css_class?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          link_target?: string | null
          link_type?: string | null
          menu_id?: string
          parent_id?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      movie_actors: {
        Row: {
          actor_id: string
          id: string
          movie_id: string
        }
        Insert: {
          actor_id: string
          id?: string
          movie_id: string
        }
        Update: {
          actor_id?: string
          id?: string
          movie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_actors_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_actors_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          seo_description: string | null
          seo_keyword: string | null
          seo_title: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug?: string
        }
        Relationships: []
      }
      movie_category_map: {
        Row: {
          category_id: string
          id: string
          movie_id: string
        }
        Insert: {
          category_id: string
          id?: string
          movie_id: string
        }
        Update: {
          category_id?: string
          id?: string
          movie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_category_map_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "movie_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_category_map_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_countries: {
        Row: {
          country_id: string
          id: string
          movie_id: string
        }
        Insert: {
          country_id: string
          id?: string
          movie_id: string
        }
        Update: {
          country_id?: string
          id?: string
          movie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_countries_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_countries_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_directors: {
        Row: {
          director_id: string
          id: string
          movie_id: string
        }
        Insert: {
          director_id: string
          id?: string
          movie_id: string
        }
        Update: {
          director_id?: string
          id?: string
          movie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_directors_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "directors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_directors_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_genres: {
        Row: {
          genre_id: string
          id: string
          movie_id: string
        }
        Insert: {
          genre_id: string
          id?: string
          movie_id: string
        }
        Update: {
          genre_id?: string
          id?: string
          movie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_genres_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_ratings: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
          movie_id: string
          rating: number
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
          movie_id: string
          rating: number
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
          movie_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "movie_ratings_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_subtitles: {
        Row: {
          created_at: string
          display_order: number
          episode_id: string | null
          file_type: string
          file_url: string
          id: string
          label: string
          language: string
          movie_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          episode_id?: string | null
          file_type?: string
          file_url: string
          id?: string
          label: string
          language?: string
          movie_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          episode_id?: string | null
          file_type?: string
          file_url?: string
          id?: string
          label?: string
          language?: string
          movie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_subtitles_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_subtitles_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_tags: {
        Row: {
          id: string
          movie_id: string
          tag_id: string
        }
        Insert: {
          id?: string
          movie_id: string
          tag_id: string
        }
        Update: {
          id?: string
          movie_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_tags_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          chieurap: boolean
          content: string | null
          created_at: string
          deleted_at: string | null
          episode_current: string | null
          episode_total: string | null
          id: string
          is_copyright: boolean
          lang: string | null
          name: string
          origin_name: string | null
          poster_url: string | null
          quality: string | null
          schema_json: string | null
          seo_description: string | null
          seo_keyword: string | null
          seo_title: string | null
          slug: string
          status: string
          sub_docquyen: boolean
          thumb_url: string | null
          time: string | null
          trailer_url: string | null
          type: string
          updated_at: string
          view_count: number
          view_day: number
          view_month: number
          view_week: number
          year: number | null
        }
        Insert: {
          chieurap?: boolean
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          episode_current?: string | null
          episode_total?: string | null
          id?: string
          is_copyright?: boolean
          lang?: string | null
          name: string
          origin_name?: string | null
          poster_url?: string | null
          quality?: string | null
          schema_json?: string | null
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          sub_docquyen?: boolean
          thumb_url?: string | null
          time?: string | null
          trailer_url?: string | null
          type?: string
          updated_at?: string
          view_count?: number
          view_day?: number
          view_month?: number
          view_week?: number
          year?: number | null
        }
        Update: {
          chieurap?: boolean
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          episode_current?: string | null
          episode_total?: string | null
          id?: string
          is_copyright?: boolean
          lang?: string | null
          name?: string
          origin_name?: string | null
          poster_url?: string | null
          quality?: string | null
          schema_json?: string | null
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          sub_docquyen?: boolean
          thumb_url?: string | null
          time?: string | null
          trailer_url?: string | null
          type?: string
          updated_at?: string
          view_count?: number
          view_day?: number
          view_month?: number
          view_week?: number
          year?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          display_order: number
          end_date: string | null
          id: string
          is_active: boolean
          notification_type: string
          show_on_pages: string[] | null
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          display_order?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          notification_type?: string
          show_on_pages?: string[] | null
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          display_order?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          notification_type?: string
          show_on_pages?: string[] | null
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          seo_description: string | null
          seo_keyword: string | null
          seo_title: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string | null
          created_at: string
          deleted_at: string | null
          excerpt: string | null
          id: string
          schema_json: string | null
          seo_description: string | null
          seo_keyword: string | null
          seo_title: string | null
          slug: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          schema_json?: string | null
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          schema_json?: string | null
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "post_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_type: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          seo_description: string | null
          seo_keyword: string | null
          seo_title: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          seo_description?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug?: string
        }
        Relationships: []
      }
      tv_channel_categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_order: number
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      tv_channels: {
        Row: {
          category_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          schedule_code: string | null
          slug: string
          streaming_sources: Json
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          schedule_code?: string | null
          slug: string
          streaming_sources?: Json
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          schedule_code?: string | null
          slug?: string
          streaming_sources?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_channels_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tv_channel_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          id: string
          permission: Database["public"]["Enums"]["user_permission"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: Database["public"]["Enums"]["user_permission"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["user_permission"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      years: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          year: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          year: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_permission: { Args: { _user_id: string }; Returns: boolean }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["user_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      user_permission:
        | "crawl_movies"
        | "movies_add"
        | "movies_edit"
        | "movies_delete"
        | "categories_add"
        | "categories_edit"
        | "categories_delete"
        | "menus_add"
        | "menus_edit"
        | "menus_delete"
        | "access_settings"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      user_permission: [
        "crawl_movies",
        "movies_add",
        "movies_edit",
        "movies_delete",
        "categories_add",
        "categories_edit",
        "categories_delete",
        "menus_add",
        "menus_edit",
        "menus_delete",
        "access_settings",
      ],
    },
  },
} as const
