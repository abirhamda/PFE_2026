from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from model import MODEL_PATH, analyze_image


app = FastAPI(title="MediCare AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_PATH.name,
    }


@app.post("/analyse")
async def analyse(image: UploadFile = File(...)):
    if image.content_type not in {"image/jpeg", "image/jpg"}:
        raise HTTPException(status_code=400, detail="Veuillez envoyer une image JPG.")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Image vide.")

    try:
        return analyze_image(image_bytes)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Erreur analyse IA: {error}") from error
