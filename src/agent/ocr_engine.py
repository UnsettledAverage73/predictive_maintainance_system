import pytesseract
from PIL import Image
import io

def extract_text(image_bytes: bytes) -> str:
    """
    Extracts text from machine serial plates or logs using Tesseract OCR.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(image)
        return text.strip()
    except Exception as e:
        return f"OCR Error: {str(e)}"
