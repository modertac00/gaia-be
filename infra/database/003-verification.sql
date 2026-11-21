SELECT current_user,current_database(),
 has_database_privilege(current_user,current_database(),'CONNECT') AS can_connect,
 has_schema_privilege(current_user,'public','USAGE') AS can_use,
 has_schema_privilege(current_user,'public','CREATE') AS can_create;
SELECT extname FROM pg_extension WHERE extname='pgcrypto';
SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
