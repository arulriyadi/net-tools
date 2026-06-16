from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Server

SEED_SERVERS = [
    {
        "name": "smpb-nginx-prod",
        "hostname": "nginx-ui-spmb-prod",
        "ip": "10.205.35.5",
        "group": "Nginx PPDB (SPMB)",
        "ssh_key_path": "Pubkey/jabar/capzs.key",
    },
    {
        "name": "smpb-nginx-prod-2",
        "hostname": "nginx-ui-spmb-prod2",
        "ip": "10.205.35.22",
        "group": "Nginx PPDB (SPMB)",
        "ssh_key_path": "Pubkey/jabar/capzs.key",
    },
    {
        "name": "jabar-sekolahmaung-nginx-prod",
        "hostname": "nginx-ui-maung-prod",
        "ip": "10.118.208.151",
        "group": "Nginx SekolahMaung",
        "ssh_key_path": "Pubkey/jabar/capzs.key",
    },
    {
        "name": "jabar-sekolahmaung-nginx-prod-2",
        "hostname": "nginx-ui-maung-prod2",
        "ip": "10.118.208.150",
        "group": "Nginx SekolahMaung",
        "ssh_key_path": "Pubkey/jabar/capzs.key",
    },
]


async def seed_servers(db: AsyncSession) -> None:
    result = await db.execute(select(Server.id).limit(1))
    if result.scalar_one_or_none() is not None:
        return
    for item in SEED_SERVERS:
        db.add(Server(**item, nginx_monitored=True))
    await db.commit()
