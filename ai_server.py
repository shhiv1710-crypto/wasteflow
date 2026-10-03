from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import requests
import os
import io

app = Flask(__name__)
CORS(app)

HF_TOKEN = os.environ.get("HF_TOKEN")
MODEL_URL = "https://router.huggingface.co/hf-inference/models/openai/clip-vit-base-patch32"

print("WasteFlow AI server starting...")


LABELS = [
    "shoes",
    "clothes",
    "paper",
    "cardboard",
    "plastic bottle",
    "plastic waste",
    "glass bottle",
    "metal",
    "food waste",
    "electronic waste",
    "wood",
    "food waste",
    "organic waste",
    "other waste"
]


def get_waste_details(detected_type):

    recovery = "Dispose according to local waste-management guidelines"
    action = "Dispose according to local waste-management guidelines"
    recyclable = "No"
    severity = "Low"

    if detected_type == "shoes":
        recovery = "Reuse / Donate"
        action = "Donate, reuse or send to a textile and footwear recycling facility"
        recyclable = "Specialized"
        severity = "Medium"

    elif detected_type == "clothes":
        recovery = "Reuse / Donate"
        action = "Donate, reuse or send to a textile recycling facility"
        recyclable = "Specialized"
        severity = "Medium"

    elif detected_type == "paper":
        recovery = "Recycle"
        action = "Keep dry and place in the paper recycling stream"
        recyclable = "Yes"
        severity = "Low"

    elif detected_type == "cardboard":
        recovery = "Recycle"
        action = "Flatten and send to a cardboard recycling facility"
        recyclable = "Yes"
        severity = "Low"

    elif detected_type == "plastic bottle":
        recovery = "Recycle"
        action = "Empty, rinse and send to plastic recycling"
        recyclable = "Yes"
        severity = "Medium"

    elif detected_type == "plastic waste":
        recovery = "Recycle"
        action = "Separate and send to a plastic recycling facility"
        recyclable = "Yes"
        severity = "Medium"

    elif detected_type == "glass bottle":
        recovery = "Recycle"
        action = "Handle carefully and send to glass recycling"
        recyclable = "Yes"
        severity = "High"

    elif detected_type == "metal":
        recovery = "Recycle"
        action = "Separate and send to metal recycling"
        recyclable = "Yes"
        severity = "Medium"

    elif detected_type == "electronic waste":
        recovery = "Specialized Recycling"
        action = "Send to an authorized e-waste collection facility"
        recyclable = "Specialized"
        severity = "High"

    elif detected_type == "food waste":
        recovery = "Compost"
        action = "Place in the organic waste or composting stream"
        recyclable = "No"
        severity = "Low"

    elif detected_type == "organic waste":
        recovery = "Compost"
        action = "Send to composting or organic waste processing"
        recyclable = "No"
        severity = "Low"

    elif detected_type == "wood":
        recovery = "Reuse / Recover"
        action = "Reuse where possible or send to a wood recovery facility"
        recyclable = "Specialized"
        severity = "Medium"

    return recovery, action, recyclable, severity


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "online",
        "service": "WasteFlow AI"
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "hf_token_configured": bool(HF_TOKEN)
    })


@app.route("/classify", methods=["POST"])
def classify():

    if "image" not in request.files:
        return jsonify({
            "error": "No image uploaded"
        }), 400

    if not HF_TOKEN:
        return jsonify({
            "error": "HF_TOKEN is not configured on the server"
        }), 500

    file = request.files["image"]

    try:

        image = Image.open(file).convert("RGB")

        image_buffer = io.BytesIO()
        image.save(image_buffer, format="JPEG")
        image_bytes = image_buffer.getvalue()

        headers = {
            "Authorization": f"Bearer {HF_TOKEN}",
            "Content-Type": "application/octet-stream"
        }

        response = requests.post(
            MODEL_URL,
            headers=headers,
            data=image_bytes,
            timeout=120
        )

        if response.status_code != 200:
            print("Hugging Face response:", response.status_code)
            print(response.text)

            return jsonify({
                "error": "AI model service unavailable",
                "details": response.text[:300]
            }), 502

        results = response.json()

        if not isinstance(results, list) or len(results) == 0:
            return jsonify({
                "error": "No AI predictions returned"
            }), 500

        # Sort by confidence
        results = sorted(
            results,
            key=lambda x: x.get("score", 0),
            reverse=True
        )

        top_predictions = []

        for result in results[:3]:

            top_predictions.append({
                "type": result["label"],
                "confidence": f"{round(result['score'] * 100)}%"
            })

        best = results[0]

        detected_type = best["label"]
        confidence = round(best["score"] * 100)

        recovery, action, recyclable, severity = get_waste_details(
            detected_type
        )

        return jsonify({

            "type": detected_type,

            "confidence": f"{confidence}%",

            "severity": severity,

            "recyclable": recyclable,

            "recovery": recovery,

            "action": action,

            "predictions": top_predictions

        })

    except Exception as error:

        print("AI error:", error)

        return jsonify({
            "error": "Could not analyze image",
            "details": str(error)
        }), 500


if __name__ == "__main__":

    port = int(os.environ.get("PORT", 8000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )