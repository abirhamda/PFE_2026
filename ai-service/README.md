# Service IA Radio Thoracique

Ce dossier contient le serveur Python qui charge `models/model_epoch_4.pth` et expose l'endpoint utilise par le frontend.

## Lancer le service

```powershell
cd ai-service
.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Endpoint:

```txt
POST http://127.0.0.1:8000/analyse
```

Le frontend doit pointer vers:

```env
VITE_AI_ANALYSIS_ENDPOINT=http://127.0.0.1:8000/analyse
```
