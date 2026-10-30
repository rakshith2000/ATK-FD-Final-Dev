# Authors - Viraj Purandare and Vishwas K S

# Default packages
import os
import sys
import logging

import datetime

# Third party package
import uvicorn
from fastapi import FastAPI, Request, Depends
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

# Custom packages
from modules.auth.utils.auth_handler import validate_user
from modules.mim_assist.routers.mim_assist_routers import router as mim_assist
from modules.train_assist.routers.train_assist_routers import router as train_assist
from modules.change_assist.routers.change_assist_routers import router as change_assist
from modules.incident_assist.routers.incident_assist_routers import router as tech_assist
from modules.administration.routers.administration_router import router as administration
from modules.problem_assist.routers.problem_assist_routers import router as problem_assist
from modules.meeting_assist.routers.meeting_assist_routers import router as meeting_assist
from modules.knowledge_assist.routers.knowledge_assist_routers import router as knowledge_assist

app = FastAPI(docs = "/documentation", root_path = "/api", redoc_url = None)
# FastAPIInstrumentor.instrument_app(app)

app.include_router(administration, prefix = "/admin", tags = ["Administration"], dependencies = [Depends(validate_user)])
app.include_router(mim_assist, prefix = "/mim_assist", tags = ["MIM Assist"], dependencies = [Depends(validate_user)])
app.include_router(train_assist, prefix = "/train_assist", tags = ["Train Assist"], dependencies = [Depends(validate_user)])
app.include_router(tech_assist, prefix = "/ticket_management", tags = ["Tech Assist"], dependencies = [Depends(validate_user)])
app.include_router(problem_assist, prefix = "/problem_assist", tags = ["Problem Assist"], dependencies = [Depends(validate_user)])
app.include_router(meeting_assist, prefix = "/meeting_assist", tags = ["Meeting Assist"], dependencies = [Depends(validate_user)])
app.include_router(change_assist, prefix = "/change_management", tags = ["Change Assist"], dependencies = [Depends(validate_user)])
app.include_router(knowledge_assist, prefix = "/knowledge_assist", tags = ["Knowledge Assist"], dependencies = [Depends(validate_user)])

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"], 
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)

@app.get("/health/live")
def health_live():
    return {"status": "ok"}
@app.get("/health/ready")
def health_ready():
    return {"status": "ready"}

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "code": 422,
            "error": {
                "messsage": "Payload validation failed",
                "details": [
                    {
                        "loc": err["loc"],
                        "msg": err["msg"],
                        "type": err["type"],
                        "ctx": {k: str(v) for k, v in err.get("ctx", {}).items()}
                    }
                    for err in exc.errors()
                ],
                "endpoint": request.url.path
            },
        },
    )
