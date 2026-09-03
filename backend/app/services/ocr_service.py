"""
Report files (PDF or image) need to become plain text before Claude can
read the lab values out of them. PDFs with a text layer are parsed directly;
scanned PDFs/images fall back to OCR (pytesseract).
"""
import io

from pypdf import PdfReader
from PIL import Image
import pytesseract


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    text = "\n".join((page.extract_text() or "") for page in reader.pages)

    if text.strip():
        return text

    # No embedded text layer (a scanned/photographed PDF) -> OCR each page.
    from pdf2image import convert_from_bytes
    pages = convert_from_bytes(file_bytes)
    return "\n".join(pytesseract.image_to_string(page) for page in pages)


def extract_text_from_image(file_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(file_bytes))
    return pytesseract.image_to_string(image)


def extract_text(file_bytes: bytes, content_type: str) -> str:
    if content_type == "application/pdf":
        return extract_text_from_pdf(file_bytes)
    return extract_text_from_image(file_bytes)
