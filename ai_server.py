from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import os
import statistics

app = Flask(__name__)
CORS(app)

print("Starting lightweight WasteFlow AI...")

# --------------------------------------------------
# Waste classification
# --------------------------------------------------

def classify_waste(image):
    """
    Lightweight demo classifier.
    Uses image properties instead of a large ML model.
    """

    image = image.convert("RGB")
    image.thumbnail((300, 300))

    pixels = list(image.getdata())

    if not pixels:
        return "Unknown", 50.0

    # Average RGB
    avg_r = statistics.mean(p[0] for p in pixels)
    avg_g = statistics.mean(p[1] for p in pixels)
    avg_b = statistics.mean(p[2] for p in pixels)

    # Brightness
    brightness = (avg_r + avg_g + avg_b) / 3

    # Color variation
    color_variation = (
        statistics.pstdev([p[0] for p in pixels]) +
        statistics.pstdev([p[1] for p in pixels]) +
        statistics.pstdev([p[2] for p in pixels])
    ) / 3

    # --------------------------------------------------
    # Basic visual heuristics
    # --------------------------------------------------

    # Very dark / dense-looking object
    if brightness < 65:
        return "Electronic Waste", 62.0

    # Brown / cardboard / paper-like appearance
    if (
        avg_r > avg_b * 1.25
        and avg_g > avg_b * 1.15
        and brightness > 80
    ):
        return "Paper / Cardboard", 74.0

    # Strong green appearance
    if avg_g > avg_r * 1.20 and avg_g > avg_b * 1.20:
        return "Organic Waste", 68.0

    # High color variation often seen in clothing/plastic objects
    if color_variation > 55:
        return "Plastic", 61.0

    # Bright/neutral object
    if brightness > 175:
        return "Paper / Cardboard", 65.0

    # Default
    return "General Waste", 58.0


# --------------------------------------------------
# Waste information
# --------------------------------------------------

def get_waste_details(waste_type):

    details = {

        "Paper / Cardboard": {
            "severity": "Low",
            "recyclable": "Yes",
            "recovery": "Paper recycling",
            "action": "Keep dry and place in the paper recycling stream."
        },

        "Plastic": {
            "severity": "Medium",
            "recyclable": "Limited",
            "recovery": "Plastic recycling",
            "action": "Clean the plastic item and send it to a plastic recycling facility."
        },

        "Organic Waste": {
            "severity": "Medium",
            "recyclable": "No",
            "recovery": "Composting",
            "action": "Separate organic waste and send it for composting."
        },

        "Electronic Waste": {
            "severity": "High",
            "recyclable": "Yes",
            "recovery": "E-waste recovery",
            "action": "Do not mix with regular waste. Send it to an authorized e-waste collection facility."
        },

        "General Waste": {
            "severity": "Medium",
            "recyclable": "Limited",
            "recovery": "Municipal waste processing",
            "action": "Separate recyclable material before sending the remaining waste for municipal processing."
        }
    }

    return details.get(
        waste_type,
        details["General Waste"]
    )


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "status": "WasteFlow AI is running",
        "mode": "lightweight",
        "model": "WasteFlow Lightweight Classifier"
    })


# --------------------------------------------------
# AI classification
# --------------------------------------------------

@app.route("/classify", methods=["POST"])
def classify():

    try:

        # Check image
        if "image" not in request.files:

            return jsonify({
                "success": False,
                "error": "No image received"
            }), 400

        file = request.files["image"]

        # Read image
        image_bytes = file.read()

        if not image_bytes:

            return jsonify({
                "success": False,
                "error": "Uploaded image is empty"
            }), 400

        # Open image
        image = Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGB")

        print(
            "Received image:",
            file.filename
        )

        print(
            "Image size:",
            image.size
        )

        # Classify
        waste_type, confidence = classify_waste(image)

        # Get waste information
        details = get_waste_details(waste_type)

        response = {

            "success": True,

            "prediction": waste_type,

            "confidence": confidence,

            "type": waste_type,

            "severity": details["severity"],

            "recyclable": details["recyclable"],

            "recovery": details["recovery"],

            "action": details["action"],

            "recommended_action": details["action"],

            "raw_results": [
                {
                    "label": waste_type,
                    "confidence": confidence
                }
            ]
        }

        print(
            "WasteFlow result:",
            response
        )

        return jsonify(response), 200

    except Exception as e:

        print(
            "AI ERROR:",
            repr(e)
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# --------------------------------------------------
# Server
# --------------------------------------------------

if __name__ == "__main__":

    port = int(
        os.environ.get(
            "PORT",
            8000
        )
    )

    print(
        f"WasteFlow AI running on port {port}"
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )