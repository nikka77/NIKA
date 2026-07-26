#!/usr/bin/env python
"""scripts/hhem/score.py — vérificateur d'ancrage factuel (HHEM-2.1-Open, Vectara, Apache-2.0).

Modèle spécialisé de 0,1 Md de paramètres : il répond à UNE question — « cette affirmation
est-elle étayée par cette source ? » — mieux qu'un LLM généraliste de 8 à 12 Md, sur CPU,
donc SANS concurrence avec le GPU qui fait tourner les agents.

Entrée  (argv[1] = fichier JSON) : [{"id": …, "source": "…", "claim": "…"}, …]
Sortie  (stdout, JSON): [{"id": …, "score": 0.0-1.0}, …]   1 = étayé, 0 = non étayé

Mesuré le 25/07 : discrimine parfaitement les faits littéraux (Robin/Chapeau de Paille 0,83
vs Barbe Blanche 0,02) ; note bas les INFÉRENCES légitimes (« détective » → « camp Cellule
d'enquête » 0,01) — c'est un test d'ancrage strict, pas un juge de sens. À utiliser en TRI :
score haut = confiance ; score bas = à faire trancher par le juge LLM.
"""
import json
import sys
import warnings

warnings.filterwarnings("ignore")

from transformers import AutoModelForSequenceClassification  # noqa: E402

MODEL = "vectara/hallucination_evaluation_model"


def main() -> None:
    with open(sys.argv[1], encoding='utf-8') as fh:
        items = json.load(fh)
    if not items:
        print("[]")
        return
    model = AutoModelForSequenceClassification.from_pretrained(MODEL, trust_remote_code=True)
    pairs = [(it["source"], it["claim"]) for it in items]
    scores = model.predict(pairs)
    print(json.dumps([{"id": it["id"], "score": round(float(s), 4)} for it, s in zip(items, scores)]))


if __name__ == "__main__":
    main()
