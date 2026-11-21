-- Run as owner/authorized DBA AFTER migrations, if required.
-- DO NOT run automatically from a deploy pipeline.
GRANT USAGE ON SCHEMA public TO gaia_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gaia_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gaia_app;
ALTER DEFAULT PRIVILEGES FOR ROLE gaia_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gaia_app;
ALTER DEFAULT PRIVILEGES FOR ROLE gaia_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO gaia_app;
-- Application must NOT have CREATE on public schema.
