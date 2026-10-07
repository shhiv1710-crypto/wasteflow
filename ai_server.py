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


@app.route("/classify", methods=["POST"])
def classify():

    try:
        # Check model
        if classifier is None:
            return jsonify({
                "success": False,
                "error": "AI model failed to load"
            }), 500

        # Check image
        if "image" not in request.files:
            return jsonify({
                "success": False,
                "error": "No image received"
            }), 400

        file = request.files["image"]

        print(
            f"Received image: {file.filename} "
            f"({file.content_length if file.content_length else 'unknown'} bytes)"
        )

        # Read image
        image_bytes = file.read()

        if not image_bytes:
            return jsonify({
                "success": False,
                "error": "Uploaded image is empty"
            }), 400

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        print("Image opened successfully")
        print("Image size:", image.size)

        # Run AI
        results = classifier(image)

        print("Raw AI results:")
        print(results)

        # Best prediction
        best = results[0]

        label = best["label"]
        confidence = float(best["score"])

        response = {
            "success": True,
            "prediction": label,
            "confidence": round(confidence * 100, 2),
            "raw_results": [
                {
                    "label": r["label"],
                    "confidence": round(float(r["score"]) * 100, 2)
                }
                for r in results[:5]
            ]
        }

        print("Sending response:")
        print(response)

        return jsonify(response), 200

    except Exception as e:

        print("AI ERROR:", repr(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "WasteFlow AI is running",
        "model": MODEL_NAME
    })


if __name__ == "__main__":

    print("Server running on port 8000")

    app.run(
        host="0.0.0.0",
        port=8000,
        debug=False
    )