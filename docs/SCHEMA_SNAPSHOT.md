# Live schema snapshot (Supabase project askshree-com-db, pesqeykpspvjqwljeubc)

Generated 2026-09-19 by Claude from the live database. Read-only reference. Do not apply SQL. Tables shown: ATS (talent_*), job_postings/job_applications (legacy, being retired), organizations, profiles, apply_candidates, feature access, notifications, offers.

All public tables (72): application_questionnaires, apply_candidates, apply_usage, ask_shree_conversations, ask_shree_logs, ask_shree_memory, ask_shree_messages, assessment_assignments, assessment_responses, chat_channels, chat_messages, contracts_envelopes, contracts_events, contracts_fields, contracts_recipients, feature_access, gauri_accounts, gauri_cases, gauri_orders, gauri_products, gauri_sessions, gauri_usage, job_applications, job_posting_email_verifications, job_posting_usage, job_postings, jotz_items, notifications, offers, organizations, personal_clock_pins, personal_events, personal_notes, personal_todos, profiles, shortlist_activity_log, shortlist_candidate_notes, shortlist_candidates, shortlist_job_matches, shortlist_jobs, shortlist_status_history, smart_screen_batches, smart_screen_candidates, smart_source_candidates, smart_source_project_members, smart_source_projects, smart_source_searches, talent_approval_steps, talent_audit_log, talent_candidate_list_members, talent_candidate_lists, talent_candidate_questionnaire_responses, talent_candidates, talent_email_log, talent_interview_round_templates, talent_interviews, talent_notes, talent_people, talent_questionnaire_templates, talent_requisition_assignment, talent_requisition_status_history, talent_requisitions, talent_scorecards, talent_stage_history, talent_user_roles, admin_activity_log, email_failures, platform_settings, jdstudio_uploads, jdstudio_question_sets, jdstudio_requests, user_feature_access

## public.apply_candidates  (rls=True, rows=2)
PK: id
- id uuid DEFAULT gen_random_uuid()
- name text NULL
- email text NULL
- phone text NULL
- location text NULL
- years_experience numeric NULL
- skills _text DEFAULT '{}'::text[]
- resume_text text NULL
- resume_path text NULL
- source text NULL
- whatsapp_opt_in bool DEFAULT false
- terms_accepted_at timestamptz NULL
- created_at timestamptz DEFAULT now()
- updated_at timestamptz DEFAULT now()
FK: {"name": "job_applications_apply_candidate_id_fkey", "source_table": "public.job_applications", "source_columns": ["apply_candidate_id"], "target_table": "public.apply_candidates", "target_columns": ["id"]}

## public.feature_access  (rls=True, rows=7)
PK: id
- id uuid DEFAULT gen_random_uuid()
- user_id uuid NULL
- feature_key text
- granted_by uuid NULL
- granted_at timestamptz DEFAULT now()
- org_id uuid NULL
FK: {"name": "feature_access_org_id_fkey", "source_table": "public.feature_access", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "feature_access_granted_by_fkey", "source_table": "public.feature_access", "source_columns": ["granted_by"], "target_table": "public.profiles", "target_columns": ["id"]}
FK: {"name": "feature_access_user_id_fkey", "source_table": "public.feature_access", "source_columns": ["user_id"], "target_table": "public.profiles", "target_columns": ["id"]}

## public.job_applications  (rls=True, rows=0)
PK: id
- id uuid DEFAULT gen_random_uuid()
- job_posting_id uuid
- candidate_name text
- candidate_email text
- candidate_phone text NULL
- cover_note text NULL
- resume_path text
- status text DEFAULT 'pending_approval'::text
- rejection_reason text NULL
- reviewed_by uuid NULL
- reviewed_at timestamptz NULL
- created_at timestamptz DEFAULT now()
- updated_at timestamptz DEFAULT now()
- match_score int4 NULL
- matched_skills _text DEFAULT '{}'::text[]
- missing_skills _text DEFAULT '{}'::text[]
- ai_evidence text NULL
- ai_cover_note text NULL
- applied_via text NULL
- shortlisted bool DEFAULT false
- shortlist_sent_at timestamptz NULL
- apply_candidate_id uuid NULL
FK: {"name": "application_questionnaires_application_id_fkey", "source_table": "public.application_questionnaires", "source_columns": ["application_id"], "target_table": "public.job_applications", "target_columns": ["id"]}
FK: {"name": "job_applications_apply_candidate_id_fkey", "source_table": "public.job_applications", "source_columns": ["apply_candidate_id"], "target_table": "public.apply_candidates", "target_columns": ["id"]}
FK: {"name": "job_applications_job_posting_id_fkey", "source_table": "public.job_applications", "source_columns": ["job_posting_id"], "target_table": "public.job_postings", "target_columns": ["id"]}
FK: {"name": "job_applications_reviewed_by_fkey", "source_table": "public.job_applications", "source_columns": ["reviewed_by"], "target_table": "auth.users", "target_columns": ["id"]}

## public.job_postings  (rls=True, rows=1)
PK: id
- id uuid DEFAULT gen_random_uuid()
- title text
- department text DEFAULT 'hr'::text
- location text NULL
- employment_type text NULL
- description text
- ai_polished_description text NULL
- requirements text NULL
- status text DEFAULT 'pending_approval'::text
- rejection_reason text NULL
- created_by uuid NULL
- approved_by uuid NULL
- approved_at timestamptz NULL
- created_at timestamptz DEFAULT now()
- updated_at timestamptz DEFAULT now()
- org_id uuid NULL
- company text NULL
- company_url text NULL
- must_have_skills _text DEFAULT '{}'::text[]
- good_to_have_skills _text DEFAULT '{}'::text[]
- qualification text NULL
- min_years_experience int4 NULL
- industry text NULL
- ctc_budget text NULL
- raw_jd_text text NULL
- poster_email text NULL
- posted_ip text NULL
- terms_accepted_at timestamptz NULL
- email_verified bool DEFAULT false
- domain_match bool DEFAULT false
- expires_at timestamptz NULL
- source text DEFAULT 'internal'::text
FK: {"name": "job_applications_job_posting_id_fkey", "source_table": "public.job_applications", "source_columns": ["job_posting_id"], "target_table": "public.job_postings", "target_columns": ["id"]}
FK: {"name": "job_postings_approved_by_fkey", "source_table": "public.job_postings", "source_columns": ["approved_by"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "jdstudio_requests_job_posting_id_fkey", "source_table": "public.jdstudio_requests", "source_columns": ["job_posting_id"], "target_table": "public.job_postings", "target_columns": ["id"]}
FK: {"name": "job_postings_created_by_fkey", "source_table": "public.job_postings", "source_columns": ["created_by"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "job_postings_org_id_fkey", "source_table": "public.job_postings", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}

## public.notifications  (rls=True, rows=3)
PK: id
- id uuid DEFAULT gen_random_uuid()
- user_id uuid
- feature_key text NULL
- title text
- body text NULL
- link text NULL
- channel text DEFAULT 'in_app'::text
- read bool DEFAULT false
- created_at timestamptz DEFAULT now()
- org_id uuid NULL
FK: {"name": "notifications_org_id_fkey", "source_table": "public.notifications", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "notifications_user_id_fkey", "source_table": "public.notifications", "source_columns": ["user_id"], "target_table": "auth.users", "target_columns": ["id"]}

## public.offers  (rls=True, rows=1)
PK: id
- id uuid DEFAULT gen_random_uuid()
- created_by uuid
- candidate_name text
- candidate_email text
- role_title text
- proposed_ctc_annual numeric NULL
- currency text DEFAULT 'INR'::text
- components jsonb DEFAULT '[]'::jsonb
- notice_period text NULL
- joining_date date NULL
- draft_notes text NULL
- ai_polished_letter text NULL
- status text DEFAULT 'pending_approval'::text
- rejection_reason text NULL
- approved_by uuid NULL
- approved_at timestamptz NULL
- created_at timestamptz DEFAULT now()
- updated_at timestamptz DEFAULT now()
- org_id uuid NULL
- talent_candidate_id uuid NULL
FK: {"name": "offers_talent_candidate_id_fkey", "source_table": "public.offers", "source_columns": ["talent_candidate_id"], "target_table": "public.talent_candidates", "target_columns": ["id"]}
FK: {"name": "offers_created_by_fkey", "source_table": "public.offers", "source_columns": ["created_by"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "offers_org_id_fkey", "source_table": "public.offers", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "offers_approved_by_fkey", "source_table": "public.offers", "source_columns": ["approved_by"], "target_table": "auth.users", "target_columns": ["id"]}

## public.organizations  (rls=True, rows=4)
PK: id
- id uuid DEFAULT gen_random_uuid()
- name text
- status text DEFAULT 'pending'::text
- plan text DEFAULT 'individual'::text
- owner_user_id uuid NULL
- created_at timestamptz DEFAULT now()
- approved_at timestamptz NULL
- approved_by uuid NULL
- notes text NULL
FK: {"name": "talent_candidate_lists_org_id_fkey", "source_table": "public.talent_candidate_lists", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "talent_user_roles_org_id_fkey", "source_table": "public.talent_user_roles", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "talent_requisitions_org_id_fkey", "source_table": "public.talent_requisitions", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "talent_questionnaire_templates_org_id_fkey", "source_table": "public.talent_questionnaire_templates", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "talent_people_org_id_fkey", "source_table": "public.talent_people", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "talent_audit_log_org_id_fkey", "source_table": "public.talent_audit_log", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "talent_interview_round_templates_org_id_fkey", "source_table": "public.talent_interview_round_templates", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "assessment_assignments_org_id_fkey", "source_table": "public.assessment_assignments", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "chat_channels_org_id_fkey", "source_table": "public.chat_channels", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "chat_messages_org_id_fkey", "source_table": "public.chat_messages", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "feature_access_org_id_fkey", "source_table": "public.feature_access", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "job_postings_org_id_fkey", "source_table": "public.job_postings", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "notifications_org_id_fkey", "source_table": "public.notifications", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "offers_org_id_fkey", "source_table": "public.offers", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "organizations_owner_user_id_fkey", "source_table": "public.organizations", "source_columns": ["owner_user_id"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "organizations_approved_by_fkey", "source_table": "public.organizations", "source_columns": ["approved_by"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "profiles_org_id_fkey", "source_table": "public.profiles", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "smart_screen_batches_org_id_fkey", "source_table": "public.smart_screen_batches", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "smart_source_candidates_org_id_fkey", "source_table": "public.smart_source_candidates", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "smart_source_projects_org_id_fkey", "source_table": "public.smart_source_projects", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "smart_source_searches_org_id_fkey", "source_table": "public.smart_source_searches", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}

## public.profiles  (rls=True, rows=34)
PK: id
- id uuid
- email text NULL
- is_admin bool DEFAULT false
- created_at timestamptz DEFAULT now()
- manager_id uuid NULL
- full_name text NULL
- org_id uuid NULL
- org_role text NULL DEFAULT 'member'::text
- employee_id text NULL
- department text NULL
- designation text NULL
- location text NULL
- joining_date date NULL
- avatar_url text NULL
- is_anonymous bool DEFAULT false
- credits int4 DEFAULT 0
- guest_tool_usage jsonb DEFAULT '{}'::jsonb
- converted_at timestamptz NULL
- status text DEFAULT 'active'::text
- persona text DEFAULT 'candidate'::text
- signup_ip text NULL
- signup_location text NULL
- auth_provider text NULL DEFAULT 'email'::text
- company_name text NULL
FK: {"name": "user_feature_access_user_id_fkey", "source_table": "public.user_feature_access", "source_columns": ["user_id"], "target_table": "public.profiles", "target_columns": ["id"]}
FK: {"name": "smart_source_searches_created_by_fkey", "source_table": "public.smart_source_searches", "source_columns": ["created_by"], "target_table": "public.profiles", "target_columns": ["id"]}
FK: {"name": "smart_source_projects_created_by_fkey", "source_table": "public.smart_source_projects", "source_columns": ["created_by"], "target_table": "public.profiles", "target_columns": ["id"]}
FK: {"name": "smart_source_project_members_added_by_fkey", "source_table": "public.smart_source_project_members", "source_columns": ["added_by"], "target_table": "public.profiles", "target_columns": ["id"]}
FK: {"name": "profiles_id_fkey", "source_table": "public.profiles", "source_columns": ["id"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "profiles_org_id_fkey", "source_table": "public.profiles", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "profiles_manager_id_fkey", "source_table": "public.profiles", "source_columns": ["manager_id"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "feature_access_granted_by_fkey", "source_table": "public.feature_access", "source_columns": ["granted_by"], "target_table": "public.profiles", "target_columns": ["id"]}
FK: {"name": "feature_access_user_id_fkey", "source_table": "public.feature_access", "source_columns": ["user_id"], "target_table": "public.profiles", "target_columns": ["id"]}
FK: {"name": "user_feature_access_granted_by_fkey", "source_table": "public.user_feature_access", "source_columns": ["granted_by"], "target_table": "public.profiles", "target_columns": ["id"]}

## public.talent_approval_steps  (rls=True, rows=28)
PK: id
- id uuid DEFAULT gen_random_uuid()
- requisition_id uuid
- step_order int4
- approver_role text
- approver_user_id uuid NULL
- status text DEFAULT 'pending'::text
- comment text NULL
- decided_by uuid NULL
- decided_at timestamptz NULL
- created_at timestamptz DEFAULT now()
FK: {"name": "talent_approval_steps_decided_by_fkey", "source_table": "public.talent_approval_steps", "source_columns": ["decided_by"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "talent_approval_steps_requisition_id_fkey", "source_table": "public.talent_approval_steps", "source_columns": ["requisition_id"], "target_table": "public.talent_requisitions", "target_columns": ["id"]}
FK: {"name": "talent_approval_steps_approver_user_id_fkey", "source_table": "public.talent_approval_steps", "source_columns": ["approver_user_id"], "target_table": "auth.users", "target_columns": ["id"]}

## public.talent_audit_log  (rls=True, rows=23)
PK: id
- id uuid DEFAULT gen_random_uuid()
- entity_type text
- entity_id uuid
- actor_id uuid NULL
- action text
- detail jsonb NULL
- created_at timestamptz DEFAULT now()
- org_id uuid NULL
FK: {"name": "talent_audit_log_actor_id_fkey", "source_table": "public.talent_audit_log", "source_columns": ["actor_id"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "talent_audit_log_org_id_fkey", "source_table": "public.talent_audit_log", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}

## public.talent_candidate_list_members  (rls=True, rows=0)
PK: list_id, candidate_id
- list_id uuid
- candidate_id uuid
- added_by uuid NULL
- added_at timestamptz DEFAULT now()
FK: {"name": "talent_candidate_list_members_candidate_id_fkey", "source_table": "public.talent_candidate_list_members", "source_columns": ["candidate_id"], "target_table": "public.talent_candidates", "target_columns": ["id"]}
FK: {"name": "talent_candidate_list_members_added_by_fkey", "source_table": "public.talent_candidate_list_members", "source_columns": ["added_by"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "talent_candidate_list_members_list_id_fkey", "source_table": "public.talent_candidate_list_members", "source_columns": ["list_id"], "target_table": "public.talent_candidate_lists", "target_columns": ["id"]}

## public.talent_candidate_lists  (rls=True, rows=0)
PK: id
- id uuid DEFAULT gen_random_uuid()
- name text
- description text NULL
- created_by uuid NULL
- created_at timestamptz DEFAULT now()
- org_id uuid NULL
FK: {"name": "talent_candidate_list_members_list_id_fkey", "source_table": "public.talent_candidate_list_members", "source_columns": ["list_id"], "target_table": "public.talent_candidate_lists", "target_columns": ["id"]}
FK: {"name": "talent_email_log_list_id_fkey", "source_table": "public.talent_email_log", "source_columns": ["list_id"], "target_table": "public.talent_candidate_lists", "target_columns": ["id"]}
FK: {"name": "talent_candidate_lists_created_by_fkey", "source_table": "public.talent_candidate_lists", "source_columns": ["created_by"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "talent_candidate_lists_org_id_fkey", "source_table": "public.talent_candidate_lists", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}

## public.talent_candidate_questionnaire_responses  (rls=True, rows=0)
PK: id
- id uuid DEFAULT gen_random_uuid()
- candidate_id uuid NULL
- template_id uuid
- requisition_id uuid NULL
- answers jsonb DEFAULT '{}'::jsonb
- token text NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'::text)
- submitted_at timestamptz NULL
- created_by uuid NULL
- created_at timestamptz DEFAULT now()
FK: {"name": "talent_candidate_questionnaire_responses_created_by_fkey", "source_table": "public.talent_candidate_questionnaire_responses", "source_columns": ["created_by"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "talent_candidate_questionnaire_responses_requisition_id_fkey", "source_table": "public.talent_candidate_questionnaire_responses", "source_columns": ["requisition_id"], "target_table": "public.talent_requisitions", "target_columns": ["id"]}
FK: {"name": "talent_candidate_questionnaire_responses_template_id_fkey", "source_table": "public.talent_candidate_questionnaire_responses", "source_columns": ["template_id"], "target_table": "public.talent_questionnaire_templates", "target_columns": ["id"]}
FK: {"name": "talent_candidate_questionnaire_responses_candidate_id_fkey", "source_table": "public.talent_candidate_questionnaire_responses", "source_columns": ["candidate_id"], "target_table": "public.talent_candidates", "target_columns": ["id"]}

## public.talent_candidates  (rls=True, rows=3)
PK: id
- id uuid DEFAULT gen_random_uuid()
- requisition_id uuid
- name text
- email text NULL
- phone text NULL
- resume_text text NULL
- source text DEFAULT 'other'::text
- stage text DEFAULT 'applied'::text
- rating int4 NULL
- tags _text DEFAULT '{}'::text[]
- created_by uuid
- created_at timestamptz DEFAULT now()
- updated_at timestamptz DEFAULT now()
- duplicate_of uuid NULL
- referred_by uuid NULL
- current_ctc numeric NULL
- expected_ctc numeric NULL
- proposed_ctc numeric NULL
- comp_currency text DEFAULT 'INR'::text
- selected_hm_by uuid NULL
- selected_hm_at timestamptz NULL
- selected_ta_by uuid NULL
- selected_ta_at timestamptz NULL
- moved_to_offer_at timestamptz NULL
- current_company text NULL
- current_location text NULL
- qualification text NULL
- notice_period text NULL
- linkedin_url text NULL
- experience_years numeric NULL
- person_id uuid NULL
- rejection_reason text NULL
- rejected_at timestamptz NULL
- resume_file_path text NULL
- resume_file_name text NULL
- match_score int4 NULL
- match_score_note text NULL
- match_score_computed_at timestamptz NULL
- met_must_have_skills _text NULL
- missing_must_have_skills _text NULL
FK: {"name": "talent_scorecards_candidate_id_fkey", "source_table": "public.talent_scorecards", "source_columns": ["candidate_id"], "target_table": "public.talent_candidates", "target_columns": ["id"]}
FK: {"name": "offers_talent_candidate_id_fkey", "source_table": "public.offers", "source_columns": ["talent_candidate_id"], "target_table": "public.talent_candidates", "target_columns": ["id"]}
FK: {"name": "talent_candidate_list_members_candidate_id_fkey", "source_table": "public.talent_candidate_list_members", "source_columns": ["candidate_id"], "target_table": "public.talent_candidates", "target_columns": ["id"]}
FK: {"name": "talent_candidate_questionnaire_responses_candidate_id_fkey", "source_table": "public.talent_candidate_questionnaire_responses", "source_columns": ["candidate_id"], "target_table": "public.talent_candidates", "target_columns": ["id"]}
FK: {"name": "talent_candidates_created_by_fkey", "source_table": "public.talent_candidates", "source_columns": ["created_by"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "talent_candidates_requisition_id_fkey", "source_table": "public.talent_candidates", "source_columns": ["requisition_id"], "target_table": "public.talent_requisitions", "target_columns": ["id"]}
FK: {"name": "talent_candidates_person_id_fkey", "source_table": "public.talent_candidates", "source_columns": ["person_id"], "target_table": "public.talent_people", "target_columns": ["id"]}
FK: {"name": "talent_candidates_selected_ta_by_fkey", "source_table": "public.talent_candidates", "source_columns": ["selected_ta_by"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "talent_candidates_selected_hm_by_fkey", "source_table": "public.talent_candidates", "source_columns": ["selected_hm_by"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "talent_candidates_referred_by_fkey", "source_table": "public.talent_candidates", "source_columns": ["referred_by"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "talent_email_log_candidate_id_fkey", "source_table": "public.talent_email_log", "source_columns": ["candidate_id"], "target_table": "public.talent_candidates", "target_columns": ["id"]}
FK: {"name": "talent_candidates_duplicate_of_fkey", "source_table": "public.talent_candidates", "source_columns": ["duplicate_of"], "target_table": "public.talent_candidates", "target_columns": ["id"]}
FK: {"name": "talent_interviews_candidate_id_fkey", "source_table": "public.talent_interviews", "source_columns": ["candidate_id"], "target_table": "public.talent_candidates", "target_columns": ["id"]}
FK: {"name": "talent_notes_candidate_id_fkey", "source_table": "public.talent_notes", "source_columns": ["candidate_id"], "target_table": "public.talent_candidates", "target_columns": ["id"]}
FK: {"name": "talent_stage_history_candidate_id_fkey", "source_table": "public.talent_stage_history", "source_columns": ["candidate_id"], "target_table": "public.talent_candidates", "target_columns": ["id"]}

## public.talent_email_log  (rls=True, rows=0)
PK: id
- id uuid DEFAULT gen_random_uuid()
- list_id uuid NULL
- candidate_id uuid NULL
- subject text
- body text
- sent_by uuid NULL
- recipient_email text
- created_at timestamptz DEFAULT now()
FK: {"name": "talent_email_log_sent_by_fkey", "source_table": "public.talent_email_log", "source_columns": ["sent_by"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "talent_email_log_candidate_id_fkey", "source_table": "public.talent_email_log", "source_columns": ["candidate_id"], "target_table": "public.talent_candidates", "target_columns": ["id"]}
FK: {"name": "talent_email_log_list_id_fkey", "source_table": "public.talent_email_log", "source_columns": ["list_id"], "target_table": "public.talent_candidate_lists", "target_columns": ["id"]}

## public.talent_interview_round_templates  (rls=True, rows=0)
PK: id
- id uuid DEFAULT gen_random_uuid()
- name text
- sequence int4 DEFAULT 1
- created_by uuid NULL
- created_at timestamptz DEFAULT now()
- org_id uuid NULL
FK: {"name": "talent_interviews_round_template_id_fkey", "source_table": "public.talent_interviews", "source_columns": ["round_template_id"], "target_table": "public.talent_interview_round_templates", "target_columns": ["id"]}
FK: {"name": "talent_interview_round_templates_org_id_fkey", "source_table": "public.talent_interview_round_templates", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "talent_interview_round_templates_created_by_fkey", "source_table": "public.talent_interview_round_templates", "source_columns": ["created_by"], "target_table": "auth.users", "target_columns": ["id"]}

## public.talent_interviews  (rls=True, rows=2)
PK: id
- id uuid DEFAULT gen_random_uuid()
- candidate_id uuid
- requisition_id uuid
- round_template_id uuid NULL
- round_name text
- scheduled_at timestamptz NULL
- mode text DEFAULT 'manual'::text
- status text DEFAULT 'scheduled'::text
- panel _text DEFAULT '{}'::text[]
- created_by uuid NULL
- created_at timestamptz DEFAULT now()
FK: {"name": "talent_interviews_created_by_fkey", "source_table": "public.talent_interviews", "source_columns": ["created_by"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "talent_interviews_candidate_id_fkey", "source_table": "public.talent_interviews", "source_columns": ["candidate_id"], "target_table": "public.talent_candidates", "target_columns": ["id"]}
FK: {"name": "talent_interviews_round_template_id_fkey", "source_table": "public.talent_interviews", "source_columns": ["round_template_id"], "target_table": "public.talent_interview_round_templates", "target_columns": ["id"]}
FK: {"name": "talent_interviews_requisition_id_fkey", "source_table": "public.talent_interviews", "source_columns": ["requisition_id"], "target_table": "public.talent_requisitions", "target_columns": ["id"]}
FK: {"name": "talent_scorecards_interview_id_fkey", "source_table": "public.talent_scorecards", "source_columns": ["interview_id"], "target_table": "public.talent_interviews", "target_columns": ["id"]}

## public.talent_notes  (rls=True, rows=0)
PK: id
- id uuid DEFAULT gen_random_uuid()
- candidate_id uuid
- author_id uuid NULL
- body text
- created_at timestamptz DEFAULT now()
FK: {"name": "talent_notes_candidate_id_fkey", "source_table": "public.talent_notes", "source_columns": ["candidate_id"], "target_table": "public.talent_candidates", "target_columns": ["id"]}
FK: {"name": "talent_notes_author_id_fkey", "source_table": "public.talent_notes", "source_columns": ["author_id"], "target_table": "auth.users", "target_columns": ["id"]}

## public.talent_people  (rls=True, rows=99)
PK: id
- id uuid DEFAULT gen_random_uuid()
- org_id uuid NULL
- name text
- email text NULL
- phone text NULL
- resume_text text NULL
- source text NULL
- current_company text NULL
- current_location text NULL
- qualification text NULL
- notice_period text NULL
- linkedin_url text NULL
- experience_years numeric NULL
- tags _text NULL
- duplicate_of uuid NULL
- created_by uuid NULL
- created_at timestamptz DEFAULT now()
- updated_at timestamptz DEFAULT now()
FK: {"name": "talent_candidates_person_id_fkey", "source_table": "public.talent_candidates", "source_columns": ["person_id"], "target_table": "public.talent_people", "target_columns": ["id"]}
FK: {"name": "talent_people_duplicate_of_fkey", "source_table": "public.talent_people", "source_columns": ["duplicate_of"], "target_table": "public.talent_people", "target_columns": ["id"]}
FK: {"name": "smart_source_candidates_internal_person_id_fkey", "source_table": "public.smart_source_candidates", "source_columns": ["internal_person_id"], "target_table": "public.talent_people", "target_columns": ["id"]}
FK: {"name": "talent_people_org_id_fkey", "source_table": "public.talent_people", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}

## public.talent_questionnaire_templates  (rls=True, rows=0)
PK: id
- id uuid DEFAULT gen_random_uuid()
- title text
- questions jsonb DEFAULT '[]'::jsonb
- created_by uuid NULL
- created_at timestamptz DEFAULT now()
- org_id uuid NULL
FK: {"name": "talent_candidate_questionnaire_responses_template_id_fkey", "source_table": "public.talent_candidate_questionnaire_responses", "source_columns": ["template_id"], "target_table": "public.talent_questionnaire_templates", "target_columns": ["id"]}
FK: {"name": "talent_questionnaire_templates_org_id_fkey", "source_table": "public.talent_questionnaire_templates", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "talent_questionnaire_templates_created_by_fkey", "source_table": "public.talent_questionnaire_templates", "source_columns": ["created_by"], "target_table": "auth.users", "target_columns": ["id"]}

## public.talent_requisition_assignment  (rls=True, rows=10)
PK: id
- id uuid DEFAULT gen_random_uuid()
- requisition_id uuid UNIQUE
- recruiter_id uuid
- assigned_by uuid NULL
- assigned_at timestamptz DEFAULT now()
- notes text NULL
FK: {"name": "talent_requisition_assignment_requisition_id_fkey", "source_table": "public.talent_requisition_assignment", "source_columns": ["requisition_id"], "target_table": "public.talent_requisitions", "target_columns": ["id"]}
FK: {"name": "talent_requisition_assignment_recruiter_id_fkey", "source_table": "public.talent_requisition_assignment", "source_columns": ["recruiter_id"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "talent_requisition_assignment_assigned_by_fkey", "source_table": "public.talent_requisition_assignment", "source_columns": ["assigned_by"], "target_table": "auth.users", "target_columns": ["id"]}

## public.talent_requisition_status_history  (rls=True, rows=15)
PK: id
- id uuid DEFAULT gen_random_uuid()
- requisition_id uuid
- from_status text NULL
- to_status text
- changed_by uuid NULL
- note text NULL
- created_at timestamptz DEFAULT now()
FK: {"name": "talent_requisition_status_history_changed_by_fkey", "source_table": "public.talent_requisition_status_history", "source_columns": ["changed_by"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "talent_requisition_status_history_requisition_id_fkey", "source_table": "public.talent_requisition_status_history", "source_columns": ["requisition_id"], "target_table": "public.talent_requisitions", "target_columns": ["id"]}

## public.talent_requisitions  (rls=True, rows=14)
PK: id
- id uuid DEFAULT gen_random_uuid()
- title text
- department text NULL
- location text NULL
- employment_type text DEFAULT 'full-time'::text
- headcount int4 DEFAULT 1
- status text DEFAULT 'open'::text
- priority text DEFAULT 'medium'::text
- hiring_manager text NULL
- description text NULL
- created_by uuid
- created_at timestamptz DEFAULT now()
- updated_at timestamptz DEFAULT now()
- requisition_type text DEFAULT 'new'::text
- replacement_name text NULL
- replacement_employee_id text NULL
- is_confidential bool DEFAULT false
- is_internal_only bool DEFAULT false
- cost_center text NULL
- comments text NULL
- target_hire_date date NULL
- work_mode text NULL
- comp_min numeric NULL
- comp_max numeric NULL
- job_level text NULL
- jd_source_text text NULL
- jd_file_name text NULL
- is_published bool DEFAULT false
- published_at timestamptz NULL
- posting_channels jsonb DEFAULT '[]'::jsonb
- org_id uuid NULL
- req_no text
- eligibility_criteria jsonb NULL
- eligibility_criteria_updated_at timestamptz NULL
- eligibility_criteria_updated_by uuid NULL
FK: {"name": "talent_requisitions_created_by_fkey", "source_table": "public.talent_requisitions", "source_columns": ["created_by"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "talent_approval_steps_requisition_id_fkey", "source_table": "public.talent_approval_steps", "source_columns": ["requisition_id"], "target_table": "public.talent_requisitions", "target_columns": ["id"]}
FK: {"name": "talent_candidate_questionnaire_responses_requisition_id_fkey", "source_table": "public.talent_candidate_questionnaire_responses", "source_columns": ["requisition_id"], "target_table": "public.talent_requisitions", "target_columns": ["id"]}
FK: {"name": "talent_candidates_requisition_id_fkey", "source_table": "public.talent_candidates", "source_columns": ["requisition_id"], "target_table": "public.talent_requisitions", "target_columns": ["id"]}
FK: {"name": "talent_interviews_requisition_id_fkey", "source_table": "public.talent_interviews", "source_columns": ["requisition_id"], "target_table": "public.talent_requisitions", "target_columns": ["id"]}
FK: {"name": "talent_requisition_assignment_requisition_id_fkey", "source_table": "public.talent_requisition_assignment", "source_columns": ["requisition_id"], "target_table": "public.talent_requisitions", "target_columns": ["id"]}
FK: {"name": "talent_requisition_status_history_requisition_id_fkey", "source_table": "public.talent_requisition_status_history", "source_columns": ["requisition_id"], "target_table": "public.talent_requisitions", "target_columns": ["id"]}
FK: {"name": "talent_requisitions_org_id_fkey", "source_table": "public.talent_requisitions", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}

## public.talent_scorecards  (rls=True, rows=1)
PK: id
- id uuid DEFAULT gen_random_uuid()
- candidate_id uuid
- interviewer_id uuid NULL
- rating int4 NULL
- recommendation text NULL
- feedback text NULL
- created_at timestamptz DEFAULT now()
- interview_id uuid NULL
FK: {"name": "talent_scorecards_candidate_id_fkey", "source_table": "public.talent_scorecards", "source_columns": ["candidate_id"], "target_table": "public.talent_candidates", "target_columns": ["id"]}
FK: {"name": "talent_scorecards_interviewer_id_fkey", "source_table": "public.talent_scorecards", "source_columns": ["interviewer_id"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "talent_scorecards_interview_id_fkey", "source_table": "public.talent_scorecards", "source_columns": ["interview_id"], "target_table": "public.talent_interviews", "target_columns": ["id"]}

## public.talent_stage_history  (rls=True, rows=0)
PK: id
- id uuid DEFAULT gen_random_uuid()
- candidate_id uuid
- from_stage text NULL
- to_stage text
- changed_by uuid NULL
- note text NULL
- created_at timestamptz DEFAULT now()
FK: {"name": "talent_stage_history_candidate_id_fkey", "source_table": "public.talent_stage_history", "source_columns": ["candidate_id"], "target_table": "public.talent_candidates", "target_columns": ["id"]}
FK: {"name": "talent_stage_history_changed_by_fkey", "source_table": "public.talent_stage_history", "source_columns": ["changed_by"], "target_table": "auth.users", "target_columns": ["id"]}

## public.talent_user_roles  (rls=True, rows=23)
PK: id
- id uuid DEFAULT gen_random_uuid()
- user_id uuid
- role text
- created_by uuid NULL
- created_at timestamptz DEFAULT now()
- org_id uuid NULL
FK: {"name": "talent_user_roles_user_id_fkey", "source_table": "public.talent_user_roles", "source_columns": ["user_id"], "target_table": "auth.users", "target_columns": ["id"]}
FK: {"name": "talent_user_roles_org_id_fkey", "source_table": "public.talent_user_roles", "source_columns": ["org_id"], "target_table": "public.organizations", "target_columns": ["id"]}
FK: {"name": "talent_user_roles_created_by_fkey", "source_table": "public.talent_user_roles", "source_columns": ["created_by"], "target_table": "auth.users", "target_columns": ["id"]}

## public.user_feature_access  (rls=True, rows=0)
PK: id
- id uuid DEFAULT gen_random_uuid()
- user_id uuid
- feature_key text
- granted_by uuid NULL
- created_at timestamptz DEFAULT now()
FK: {"name": "user_feature_access_granted_by_fkey", "source_table": "public.user_feature_access", "source_columns": ["granted_by"], "target_table": "public.profiles", "target_columns": ["id"]}
FK: {"name": "user_feature_access_user_id_fkey", "source_table": "public.user_feature_access", "source_columns": ["user_id"], "target_table": "public.profiles", "target_columns": ["id"]}
