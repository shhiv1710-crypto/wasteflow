from transformers import pipeline

print("Loading WasteFlow AI model...")

classifier = pipeline(
    "image-classification",
    model="watersplash/waste-classification"
)

print("WasteFlow AI model loaded successfully!")