from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import CveAssessment, CveAssessmentStatus, Job, Server
from app.schemas.cve import CveAssessmentRead
from app.services.pdf_cve_report import generate_cve_assessment_pdf

router = APIRouter(prefix="/api/cve", tags=["cve"])


def _to_read(row: CveAssessment) -> CveAssessmentRead:
    return CveAssessmentRead(
        id=row.id,
        server_id=row.server_id,
        server_name=row.server.name if row.server else None,
        source_job_id=row.source_job_id,
        status=row.status,
        current_version=row.current_version,
        current_package=row.current_package,
        target_stable=row.target_stable,
        target_mainline=row.target_mainline,
        overall_risk=row.overall_risk,
        cve_findings=row.cve_findings,
        recommendation=row.recommendation,
        report_path=row.report_path,
        created_at=row.created_at,
        finished_at=row.finished_at,
    )


@router.get("/assessments", response_model=list[CveAssessmentRead])
async def list_cve_assessments(
    limit: int = Query(default=20, ge=1, le=100),
    server_id: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[CveAssessmentRead]:
    stmt = (
        select(CveAssessment)
        .options(selectinload(CveAssessment.server))
        .order_by(CveAssessment.created_at.desc())
        .limit(limit)
    )
    if server_id is not None:
        stmt = stmt.where(CveAssessment.server_id == server_id)
    result = await db.execute(stmt)
    return [_to_read(row) for row in result.scalars().all()]


@router.get("/assessments/{assessment_id}", response_model=CveAssessmentRead)
async def get_cve_assessment(assessment_id: int, db: AsyncSession = Depends(get_db)) -> CveAssessmentRead:
    result = await db.execute(
        select(CveAssessment)
        .where(CveAssessment.id == assessment_id)
        .options(selectinload(CveAssessment.server))
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="CVE assessment not found")
    return _to_read(row)


@router.get("/assessments/{assessment_id}/report")
async def download_cve_assessment_report(
    assessment_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CveAssessment)
        .where(CveAssessment.id == assessment_id)
        .options(selectinload(CveAssessment.server))
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="CVE assessment not found")
    if assessment.status != CveAssessmentStatus.SUCCESS:
        raise HTTPException(status_code=400, detail="PDF only available for successful assessments")
    if not assessment.server:
        raise HTTPException(status_code=404, detail="Server not found for assessment")

    source_job = None
    if assessment.source_job_id:
        source_job = await db.get(Job, assessment.source_job_id)

    pdf_path = generate_cve_assessment_pdf(assessment, assessment.server, source_job)
    assessment.report_path = str(pdf_path)
    await db.commit()

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=pdf_path.name,
    )
