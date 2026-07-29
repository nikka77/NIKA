# Tour 2× RTX 3090 — liste de courses exacte (29/07/2026)

Ferme d'agents 24/7 : 2 modèles 32B indépendants (~40-60 requêtes en vol) OU un 70B réparti.
Philosophie : les 3 pièces structurantes (carte mère, alim, boîtier) sont choisies pour les
DEUX cartes dès le départ — on peut n'acheter qu'une 3090 au début, la 2e se glisse sans rien changer.

## La liste

| # | Pièce | Modèle exact | Prix ~ | Pourquoi CELUI-LÀ |
|---|---|---|---|---|
| 1 | Carte mère | **ASUS ProArt X670E-Creator WiFi** | 420-460 € | LA carte AM5 bi-GPU : 2× PCIe x16 qui passent en **x8/x8** avec le bon espacement (3 slots) — les B650 ordinaires n'offrent que x16/x4 étranglé |
| 2 | Processeur | **AMD Ryzen 7 7700** (8 cœurs, 65 W) | 230-260 € | large pour vLLM + démons + orchestration ; sobre et froid. (Budget serré : 7600 à ~180 € fait l'affaire) |
| 3 | Ventirad | **Thermalright Peerless Assassin 120 SE** | 40-50 € | refroidit un 65-105 W en silence, imbattable au prix |
| 4 | RAM | **64 Go DDR5-5600 (2× 32 Go)** Kingston Fury / Corsair | 220-300 € ⚠ | 2 barrettes seulement → 2 slots libres pour doubler. ⚠ pénurie DRAM 2026 : prix volatils, achète-la tôt |
| 5 | SSD | **2 To NVMe Gen4** (WD Black SN850X ou Samsung 990 Pro) | 120-150 € | les modèles pèsent (un 32B Q4 ≈ 18-20 Go, tu en stockeras des dizaines) ; 2 M.2 restent libres |
| 6 | Alimentation | **1200 W 80+ Platinum ATX 3.1** (Corsair HX1200i / be quiet! Dark Power 13) | 230-280 € | 2× 3090 = 700 W + pics transitoires ~450 W chacune : le 1200 W encaisse sans broncher. Vérifier ≥ 6 connecteurs PCIe 8 broches |
| 7 | Boîtier | **Fractal Design Torrent** | 170-200 € | le meilleur flux d'air du marché — 2 cartes de 3 slots à 350 W ont besoin de respirer ; dégagement 46 cm |
| 8 | GPU n°1 | **RTX 3090 24 Go d'occasion** (EVGA/ASUS/MSI, 2-3 ventilateurs) | 650-800 € | le roi qualité/prix VRAM 2026 |
| 9 | GPU n°2 | idem, plus tard ou tout de suite | 650-800 € | 48 Go au total → 2× 32B ou 1× 70B |
| 10 | Onduleur (conseillé pour du 24/7) | APC Back-UPS Pro 1500 VA | 180-220 € | une coupure secteur ne corrompt ni la base locale ni un modèle en écriture |

**Total : ~2 900-3 300 €** les deux cartes incluses · **~2 200-2 500 €** en démarrant avec une seule 3090 (rien à racheter ensuite, on ajoute juste la carte).

## Les pièges de l'occasion 3090 (à faire À l'achat)

1. Exiger un test en visio ou sur place : `nvidia-smi` + 10 min de charge (gpu-burn) — **températures VRAM < 95 °C** (les pads thermiques fatigués sont LA panne classique des ex-mineuses)
2. Préférer les modèles 2,7-3 slots à 2-3 ventilateurs (EVGA FTW3, ASUS TUF, MSI Gaming X) ; éviter les blowers bruyants
3. Facture d'origine = bonus (garantie résiduelle éventuelle)

## Réglages d'exploitation (je m'en charge par SSH)

- Ubuntu 24.04 LTS + pilotes NVIDIA + **vLLM** (batch continu) — 1 h d'installation
- **Power limit 280 W par carte** (`nvidia-smi -pl 280`) : −3 % de vitesse, −20 % de chaleur
  et d'électricité — le bon réglage pour du 24/7 (~15-20 €/mois d'électricité en charge réelle)
- La tour rejoint le tailnet comme nœud : démons systemd (elle remplace le VPS), heartbeat
  ops_workers, budget global — tout est déjà construit pour l'accueillir

## Ce qu'on n'achète PAS (et pourquoi)

- RTX 5090 : 3 700-4 800 $ en pénurie DRAM — 2 à 3× le prix pour moins de VRAM totale que 2× 3090
- Tour de marque d'occasion (Dell/HP) : alim et carte mère propriétaires, aucune évolutivité
- Threadripper/serveur : nécessaire seulement à partir de 3-4 GPU — pas ton stade
- Watercooling : complexité et risque de fuite pour un gain nul en inférence 24/7
