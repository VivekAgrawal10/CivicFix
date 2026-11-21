from app.cv.image_similarity import hamming_similarity


def find_duplicates(image_hash: str, candidate_hashes: list[str], threshold: float = 0.9) -> dict:
    candidates = [{"hash": candidate, "similarity": hamming_similarity(image_hash, candidate)} for candidate in candidate_hashes]
    matches = [candidate for candidate in candidates if candidate["similarity"] >= threshold]
    return {"method": "dhash", "threshold": threshold, "duplicate_candidate": bool(matches), "matches": matches, "limitations": "Visual similarity is evidence, not proof of the same incident."}
