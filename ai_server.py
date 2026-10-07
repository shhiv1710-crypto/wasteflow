from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from transformers import pipeline
import io
import os

app = Flask(__name__)
CORS(app)

print("Starting WasteFlow AI...")

MODEL_NAME = "google/vit-base-patch16-224"

print(f"Loading model: {MODEL_NAME}")

try:
    classifier = pipeline(
        "image-classification",
        model=MODEL_NAME
    )

    print("WasteFlow AI model loaded successfully!")

except Exception as e:
    print("MODEL LOAD ERROR:", repr(e))
    classifier = None


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "WasteFlow AI is running",
        "model": MODEL_NAME
    })


@app.route("/classify", methods=["POST"])
def classify():

    try:

        if classifier is None:
            return jsonify({
                "success": False,
                "error": "AI model failed to load"
            }), 500

        if "image" not in request.files:
            return jsonify({
                "success": False,
                "error": "No image received"
            }), 400

        file = request.files["image"]

        image_bytes = file.read()

        if not image_bytes:
            return jsonify({
                "success": False,
                "error": "Uploaded image is empty"
            }), 400

        image = Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGB")

        print("Image opened:", image.size)

        results = classifier(image)

        print("AI results:", results[:5])

        best = results[0]

        response = {
            "success": True,
            "prediction": best["label"],
            "confidence": round(
                float(best["score"]) * 100,
                2
            ),
            "raw_results": [
                {
                    "label": r["label"],
                    "confidence": round(
                        float(r["score"]) * 100,
                        2
                    )
                }
                for r in results[:5]
            ]
        }

        return jsonify(response), 200

    except Exception as e:

        print("AI ERROR:", repr(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":

    port = int(
        os.environ.get("PORT", 8000)
    )

    print(
        f"WasteFlow AI running on port {port}"
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )