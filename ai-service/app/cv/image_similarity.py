import numpy as np
from PIL import Image


def perceptual_hash(image: Image.Image) -> str:
    values = np.asarray(image.convert("L").resize((9, 8)), dtype=np.int16)
    return "".join("1" if value > neighbor else "0" for row in values for value, neighbor in zip(row[:-1], row[1:]))


def hamming_similarity(left: str, right: str) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    return round(1 - sum(a != b for a, b in zip(left, right)) / len(left), 4)
