from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline
from PIL import Image

app = Flask(__name__)
CORS(app)

print("Loading WasteFlow AI...")

classifier = pipeline(
    "zero-shot-image-classification",
    model="openai/clip-vit-base-patch32"
)

print("WasteFlow AI loaded!")


@app.route("/classify", methods=["POST"])
def classify():

    if "image" not in request.files:
        return jsonify({
            "error": "No image uploaded"
        }), 400

    file = request.files["image"]

    try:

        image = Image.open(file).convert("RGB")

        labels = [
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
            "organic waste",
            "other waste"
        ]

        results = classifier(
            image,
            candidate_labels=labels
        )

        # Top 3 predictions
        top_predictions = []

        for result in results[:3]:

            top_predictions.append({
                "type": result["label"],
                "confidence": f"{round(result['score'] * 100)}%"
            })

        best = results[0]

        detected_type = best["label"]
        confidence = round(best["score"] * 100)

        # Default values
        recovery = "Dispose according to local waste-management guidelines"
        action = "Dispose according to local waste-management guidelines"
        recyclable = "No"
        severity = "Low"

        # -----------------------------
        # SHOES
        # -----------------------------

        if detected_type == "shoes":

            recovery = "Reuse / Donate"

            action = (
                "Donate, reuse or send to a "
                "textile and footwear recycling facility"
            )

            recyclable = "Specialized"

            severity = "Medium"

        # -----------------------------
        # CLOTHES
        # -----------------------------

        elif detected_type == "clothes":

            recovery = "Reuse / Donate"

            action = (
                "Donate, reuse or send to a "
                "textile recycling facility"
            )

            recyclable = "Specialized"

            severity = "Medium"

        # -----------------------------
        # PAPER
        # -----------------------------

        elif detected_type == "paper":

            recovery = "Recycle"

            action = (
                "Keep dry and place in the "
                "paper recycling stream"
            )

            recyclable = "Yes"

            severity = "Low"

        # -----------------------------
        # CARDBOARD
        # -----------------------------

        elif detected_type == "cardboard":

            recovery = "Recycle"

            action = (
                "Flatten and send to a "
                "cardboard recycling facility"
            )

            recyclable = "Yes"

            severity = "Low"

        # -----------------------------
        # PLASTIC BOTTLE
        # -----------------------------

        elif detected_type == "plastic bottle":

            recovery = "Recycle"

            action = (
                "Empty, rinse and send to "
                "plastic recycling"
            )

            recyclable = "Yes"

            severity = "Medium"

        # -----------------------------
        # PLASTIC WASTE
        # -----------------------------

        elif detected_type == "plastic waste":

            recovery = "Recycle"

            action = (
                "Separate and send to a "
                "plastic recycling facility"
            )

            recyclable = "Yes"

            severity = "Medium"

        # -----------------------------
        # GLASS
        # -----------------------------

        elif detected_type == "glass bottle":

            recovery = "Recycle"

            action = (
                "Handle carefully and send "
                "to glass recycling"
            )

            recyclable = "Yes"

            severity = "High"

        # -----------------------------
        # METAL
        # -----------------------------

        elif detected_type == "metal":

            recovery = "Recycle"

            action = (
                "Separate and send to "
                "metal recycling"
            )

            recyclable = "Yes"

            severity = "Medium"

        # -----------------------------
        # E-WASTE
        # -----------------------------

        elif detected_type == "electronic waste":

            recovery = "Specialized Recycling"

            action = (
                "Send to an authorized "
                "e-waste collection facility"
            )

            recyclable = "Specialized"

            severity = "High"

        # -----------------------------
        # FOOD WASTE
        # -----------------------------

        elif detected_type == "food waste":

            recovery = "Compost"

            action = (
                "Place in the organic waste "
                "or composting stream"
            )

            recyclable = "No"

            severity = "Low"

        # -----------------------------
        # ORGANIC WASTE
        # -----------------------------

        elif detected_type == "organic waste":

            recovery = "Compost"

            action = (
                "Send to composting or "
                "organic waste processing"
            )

            recyclable = "No"

            severity = "Low"

        # -----------------------------
        # WOOD
        # -----------------------------

        elif detected_type == "wood":

            recovery = "Reuse / Recover"

            action = (
                "Reuse where possible or send "
                "to a wood recovery facility"
            )

            recyclable = "Specialized"

            severity = "Medium"

        # -----------------------------
        # RETURN RESULT
        # -----------------------------

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
            "error": "Could not analyze image"
        }), 500


app.run(
    host="0.0.0.0",
    port=8000,
    debug=False
)