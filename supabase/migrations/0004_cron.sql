-- Scheduled jobs (pg_cron + pg_net), the standard Supabase pattern for invoking Edge
-- Functions on a schedule. Times are UTC. Replace <PROJECT_REF> and store the service
-- role key in Vault as `service_role_key`.
--
-- These are wrapped in a DO block that is a no-op if the extensions aren't present, so the
-- migration applies cleanly in local/dev where cron may be unavailable.

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then

    create extension if not exists pg_cron;
    create extension if not exists pg_net;

    -- Helper to call an edge function with the service role bearer.
    -- (Defined inline per-job below via net.http_post.)

    -- 1) Pre-generate + publish the daily puzzle, just before the morning window (06:00 UTC).
    perform cron.schedule('bout-publish-daily', '0 6 * * *', $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.functions.supabase.co/publish-daily-puzzle',
        headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'), 'Content-Type', 'application/json'),
        body := '{}'::jsonb
      );
    $cron$);

    -- 2) The windowed daily drop push — runs HOURLY; the function itself only notifies users
    --    whose local time is in the morning window and who haven't had today's drop yet.
    perform cron.schedule('bout-daily-push', '0 * * * *', $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.functions.supabase.co/send-daily-push',
        headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'), 'Content-Type', 'application/json'),
        body := '{"kind":"daily"}'::jsonb
      );
    $cron$);

    -- 3) Resolve yesterday's pick'em shortly after midnight UTC.
    perform cron.schedule('bout-resolve-pickem', '30 0 * * *', $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.functions.supabase.co/resolve-pickem',
        headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'), 'Content-Type', 'application/json'),
        body := '{}'::jsonb
      );
    $cron$);

    -- 4) Advance season lifecycle daily (finals open/close, promo/relegation, new season).
    perform cron.schedule('bout-season-rollover', '45 0 * * *', $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.functions.supabase.co/season-rollover',
        headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'), 'Content-Type', 'application/json'),
        body := '{}'::jsonb
      );
    $cron$);

  end if;
end $$;
