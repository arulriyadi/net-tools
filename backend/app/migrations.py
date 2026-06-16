from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection


async def run_migrations(conn: AsyncConnection) -> None:
    await conn.execute(
        text(
            "ALTER TABLE servers ADD COLUMN IF NOT EXISTS nginx_monitored BOOLEAN "
            "NOT NULL DEFAULT FALSE"
        )
    )
    await conn.execute(
        text(
            """
            UPDATE servers
            SET nginx_monitored = TRUE
            WHERE nginx_monitored = FALSE
              AND EXISTS (
                SELECT 1 FROM jobs
                WHERE jobs.server_id = servers.id
                  AND jobs.job_type::text = 'nginx_check'
              )
            """
        )
    )
    await conn.execute(
        text(
            "ALTER TABLE nginx_ui_connections "
            "ADD COLUMN IF NOT EXISTS metrics_poll_interval_seconds INTEGER NOT NULL DEFAULT 30"
        )
    )
    await conn.execute(
        text(
            "ALTER TABLE nginx_ui_connections "
            "ADD COLUMN IF NOT EXISTS metrics_retention_days INTEGER NOT NULL DEFAULT 7"
        )
    )
    await conn.execute(
        text(
            "ALTER TABLE servers ADD COLUMN IF NOT EXISTS nginx_fleet_label_mode VARCHAR(16)"
        )
    )
    await conn.execute(
        text(
            "ALTER TABLE servers ADD COLUMN IF NOT EXISTS nginx_fleet_label_custom VARCHAR(128)"
        )
    )
    await conn.execute(
        text(
            "ALTER TABLE network_devices ADD COLUMN IF NOT EXISTS dataset_data JSONB NOT NULL DEFAULT '{}'::jsonb"
        )
    )
    await conn.execute(
        text(
            """
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'jobtype') AND NOT EXISTS (
                SELECT 1 FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = 'jobtype' AND e.enumlabel = 'NGINX_FORENSIC'
              ) THEN
                ALTER TYPE jobtype ADD VALUE 'NGINX_FORENSIC';
              END IF;
              IF NOT EXISTS (
                SELECT 1 FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = 'jobtype' AND e.enumlabel = 'NGINX_UPGRADE'
              ) THEN
                ALTER TYPE jobtype ADD VALUE 'NGINX_UPGRADE';
              END IF;
            END $$;
            """
        )
    )
