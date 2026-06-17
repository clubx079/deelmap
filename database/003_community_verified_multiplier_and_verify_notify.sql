-- 003 — Community: verified-member 3× reply equity + verification-result notification
--
-- Implements two audit gaps:
--   #3  Verified members earn 3× Equity on their replies (advertised in the UI).
--       Applies to BOTH creating a reply (+1 → +3) and receiving upvotes on a
--       reply (×3). Posts are unchanged — the promise is "3× on replies".
--   #4  When a verification is approved (or rejected), insert an in-app
--       notification so the member finds out in the bell, not just on refresh.
--
-- All three are `create or replace function` — idempotent and safe to re-run.
-- The existing triggers already point at these functions; no trigger changes.

-- ── #3a — reply CREATION: +1 normally, +3 for verified authors ───────────────
create or replace function public.community_comments_after_insert()
returns trigger language plpgsql as $$
declare
  v_pts int := 1;
  v_verified boolean;
begin
  update public.community_posts set comment_count = comment_count + 1 where id = NEW.post_id;

  select role_badge is not null into v_verified
    from public.community_profiles where id = NEW.author_id;
  if v_verified then v_pts := 3; end if;

  perform public.community_award_equity(NEW.author_id, v_pts, 'comment_created', 'comment', NEW.id::text);
  return null;
end $$;

-- ── #3b — reply VOTES: ×3 equity when the reply's author is verified ──────────
create or replace function public.community_votes_after_change()
returns trigger language plpgsql as $$
declare
  v_author     uuid;
  v_created_at timestamptz;
  v_delta_score int;
  v_old_eq     int;
  v_new_eq     int;
  v_eq_delta   int;
begin
  if TG_OP = 'INSERT' then
    v_delta_score := NEW.value;
  elsif TG_OP = 'UPDATE' then
    v_delta_score := NEW.value - OLD.value;
  else  -- DELETE
    v_delta_score := -OLD.value;
  end if;

  if NEW.target_type is not null then
    if NEW.target_type = 'post' then
      update public.community_posts
        set score = score + v_delta_score,
            hot_score = public.community_hot_score(score + v_delta_score, created_at)
        where id = NEW.target_id
        returning author_id, created_at into v_author, v_created_at;
    else
      update public.community_comments
        set score = score + v_delta_score
        where id = NEW.target_id
        returning author_id into v_author;
    end if;
  else
    if OLD.target_type = 'post' then
      update public.community_posts
        set score = score + v_delta_score,
            hot_score = public.community_hot_score(score + v_delta_score, created_at)
        where id = OLD.target_id
        returning author_id into v_author;
    else
      update public.community_comments
        set score = score + v_delta_score
        where id = OLD.target_id
        returning author_id into v_author;
    end if;
  end if;

  -- Equity scoring (self-vote excluded)
  if v_author is not null then
    declare v_voter uuid := coalesce(NEW.profile_id, OLD.profile_id);
            v_ttype text := coalesce(NEW.target_type, OLD.target_type);
            v_old   smallint := coalesce(OLD.value, 0);
            v_new   smallint := coalesce(NEW.value, 0);
            v_old_pts int;
            v_new_pts int;
            v_verified boolean;
    begin
      if v_voter <> v_author then
        -- per-vote equity: post +5/-2, comment +2/-1
        v_old_pts := case v_old when 1 then case when v_ttype='post' then 5 else 2 end
                              when -1 then case when v_ttype='post' then -2 else -1 end
                              else 0 end;
        v_new_pts := case v_new when 1 then case when v_ttype='post' then 5 else 2 end
                              when -1 then case when v_ttype='post' then -2 else -1 end
                              else 0 end;
        v_eq_delta := v_new_pts - v_old_pts;
        -- Verified members earn 3× Equity on their replies (comments only)
        if v_eq_delta <> 0 and v_ttype = 'comment' then
          select role_badge is not null into v_verified
            from public.community_profiles where id = v_author;
          if v_verified then v_eq_delta := v_eq_delta * 3; end if;
        end if;
        if v_eq_delta <> 0 then
          perform public.community_award_equity(v_author, v_eq_delta,
            'vote_' || v_ttype, v_ttype, coalesce(NEW.target_id, OLD.target_id)::text);
        end if;
      end if;
    end;
  end if;

  return null;
end $$;

-- ── #4 — verification result → in-app notification (approved or rejected) ─────
create or replace function public.community_verifications_after_update()
returns trigger language plpgsql as $$
begin
  if NEW.status = 'approved' and OLD.status is distinct from 'approved' then
    update public.community_profiles
      set role_badge = NEW.role
      where id = NEW.profile_id;
    perform public.community_award_equity(NEW.profile_id, 50, 'verification_approved',
      'verification', NEW.id::text);
    insert into public.community_notifications (profile_id, type, title, body)
    values (NEW.profile_id, 'verification_status',
      'Your ' || NEW.role || ' verification was approved',
      'Your badge is live and you now earn 3× Equity on replies.');
  elsif NEW.status = 'rejected' and OLD.status is distinct from 'rejected' then
    insert into public.community_notifications (profile_id, type, title, body)
    values (NEW.profile_id, 'verification_status',
      'Your ' || NEW.role || ' verification was not approved',
      coalesce(nullif(NEW.admin_notes, ''), 'You can review the requirements and submit again.'));
  end if;
  return null;
end $$;
