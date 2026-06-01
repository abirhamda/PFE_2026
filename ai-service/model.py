import base64
from io import BytesIO
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms


PATHOLOGIES = [
    "Atelectasis",
    "Cardiomegaly",
    "Consolidation",
    "Edema",
    "Enlarged Cardiomediastinum",
    "Fracture",
    "Lung Lesion",
    "Lung Opacity",
    "No Finding",
    "Pleural Effusion",
    "Pleural Other",
    "Pneumonia",
    "Pneumothorax",
    "Support Devices",
]


MODEL_PATH = Path(__file__).resolve().parent / "models" / "model_epoch_4.pth"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


preprocess = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)


class ChestXRayClassifier(nn.Module):
    def __init__(self, num_classes=14):
        super().__init__()
        self.densenet = models.densenet121(weights=None)
        num_features = self.densenet.classifier.in_features
        self.densenet.classifier = nn.Sequential(
            nn.Linear(num_features, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes),
        )

    def forward(self, x):
        return self.densenet(x)


class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        self.forward_handle = target_layer.register_forward_hook(self._save_activations)
        self.backward_handle = target_layer.register_full_backward_hook(self._save_gradients)

    def _save_activations(self, _module, _input, output):
        self.activations = output.detach()

    def _save_gradients(self, _module, _grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate(self, image_tensor, class_idx):
        self.model.eval()
        self.model.zero_grad(set_to_none=True)

        output = self.model(image_tensor)
        score = output[0, class_idx]
        score.backward()

        gradients = self.gradients[0]
        activations = self.activations[0]
        weights = gradients.mean(dim=(1, 2))
        cam = torch.sum(weights[:, None, None] * activations, dim=0)
        cam = torch.relu(cam)

        cam_min = cam.min()
        cam_max = cam.max()
        if torch.isclose(cam_max, cam_min):
            cam = torch.zeros_like(cam)
        else:
            cam = (cam - cam_min) / (cam_max - cam_min)

        cam = cam.detach().cpu().numpy()
        return np.array(Image.fromarray((cam * 255).astype(np.uint8)).resize((224, 224))) / 255.0

    def close(self):
        self.forward_handle.remove()
        self.backward_handle.remove()


def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

    model = ChestXRayClassifier(num_classes=len(PATHOLOGIES))
    state_dict = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=True)
    model.load_state_dict(state_dict)
    model.to(DEVICE)
    model.eval()
    return model


MODEL = load_model()


def image_from_bytes(image_bytes):
    return Image.open(BytesIO(image_bytes)).convert("RGB")


def predict_probabilities(image):
    image_tensor = preprocess(image).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        logits = MODEL(image_tensor)
        probs = torch.sigmoid(logits).squeeze(0).detach().cpu().numpy()
    return probs


def select_gradcam_class(probs):
    abnormal_indices = [idx for idx, name in enumerate(PATHOLOGIES) if name != "No Finding"]
    return max(abnormal_indices, key=lambda idx: probs[idx])


def colorize_heatmap(heatmap):
    heatmap = np.clip(heatmap, 0.0, 1.0)
    blue = np.array([0, 40, 190], dtype=np.float32)
    yellow = np.array([255, 220, 0], dtype=np.float32)
    red = np.array([220, 0, 0], dtype=np.float32)

    color = np.zeros((heatmap.shape[0], heatmap.shape[1], 3), dtype=np.float32)
    low_mask = heatmap <= 0.5
    high_mask = ~low_mask

    low_t = (heatmap[low_mask] / 0.5)[:, None]
    high_t = ((heatmap[high_mask] - 0.5) / 0.5)[:, None]

    color[low_mask] = blue * (1 - low_t) + yellow * low_t
    color[high_mask] = yellow * (1 - high_t) + red * high_t
    return color.astype(np.uint8)


def generate_gradcam_overlay(image, class_idx):
    image_tensor = preprocess(image).unsqueeze(0).to(DEVICE).requires_grad_(True)
    gradcam = GradCAM(MODEL, MODEL.densenet.features.denseblock4)
    try:
        heatmap = gradcam.generate(image_tensor, class_idx)
    finally:
        gradcam.close()

    original = image.resize((224, 224)).convert("RGB")
    original_np = np.array(original).astype(np.float32)
    heatmap_rgb = colorize_heatmap(heatmap).astype(np.float32)
    overlay = np.clip(original_np * 0.55 + heatmap_rgb * 0.45, 0, 255).astype(np.uint8)

    output = BytesIO()
    Image.fromarray(overlay).save(output, format="JPEG", quality=92)
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def build_french_report(probs):
    detections = [
        (name, float(prob))
        for name, prob in zip(PATHOLOGIES, probs)
        if name != "No Finding" and float(prob) >= 0.50
    ]
    suspicious = [
        (name, float(prob))
        for name, prob in zip(PATHOLOGIES, probs)
        if name != "No Finding" and 0.30 <= float(prob) < 0.50
    ]

    detections.sort(key=lambda item: item[1], reverse=True)
    suspicious.sort(key=lambda item: item[1], reverse=True)
    no_finding_prob = float(probs[PATHOLOGIES.index("No Finding")])

    lines = [
        "Rapport medical genere automatiquement par le module IA.",
        "",
        "Examen analyse : radiographie thoracique de face.",
    ]

    if detections:
        lines.append("")
        lines.append("Anomalies principales detectees :")
        for name, prob in detections:
            lines.append(f"- {name} : probabilite estimee a {prob * 100:.1f}%.")
    else:
        lines.append("")
        lines.append("Aucune pathologie n'a depasse le seuil principal de detection de 50%.")

    if suspicious:
        lines.append("")
        lines.append("Elements a surveiller :")
        for name, prob in suspicious[:5]:
            lines.append(f"- {name} : signal intermediaire a {prob * 100:.1f}%.")

    lines.extend(
        [
            "",
            f"Probabilite 'No Finding' : {no_finding_prob * 100:.1f}%.",
            "",
            "Conclusion : ces resultats doivent etre interpretes par un medecin et compares au contexte clinique du patient. L'IA ne remplace pas un avis radiologique specialise.",
        ]
    )
    return "\n".join(lines)


def analyze_image(image_bytes):
    image = image_from_bytes(image_bytes)
    probs = predict_probabilities(image)
    gradcam_class_idx = select_gradcam_class(probs)
    gradcam_image = generate_gradcam_overlay(image, gradcam_class_idx)
    report = build_french_report(probs)

    predictions = {name: float(prob) for name, prob in zip(PATHOLOGIES, probs)}
    detections = [
        {"name": name, "probability": float(prob)}
        for name, prob in zip(PATHOLOGIES, probs)
    ]

    return {
        "predictions": predictions,
        "pathologies": detections,
        "gradcam_image": gradcam_image,
        "gradcam_target": PATHOLOGIES[gradcam_class_idx],
        "rapport": report,
        "report": report,
        "device": str(DEVICE),
    }
