#!/bin/bash
# NIKA — Patch images corrigées (vraies URLs /pictures/UUID.jpg)
# anthenea: 5 imgs | tiny-silo: 10 imgs | domeland: 5 imgs
OUTDIR="public/images/wow"

# anthenea-suite-flottante-perros-guirec (5)
rm -f "$OUTDIR/anthenea-suite-flottante-perros-guirec/"*.jpg "$OUTDIR/anthenea-suite-flottante-perros-guirec/"*.jpeg "$OUTDIR/anthenea-suite-flottante-perros-guirec/"*.png
mkdir -p "$OUTDIR/anthenea-suite-flottante-perros-guirec"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/anthenea-suite-flottante-perros-guirec/cover.jpeg" "https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MTE1MjE0NTM5MjgzNDU2NzA5MQ%3D%3D/original/04072977-51a0-4aa1-834f-0108185fec25.jpeg"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/anthenea-suite-flottante-perros-guirec/gallery-01.jpeg" "https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MTE1MjE0NTM5MjgzNDU2NzA5MQ%3D%3D/original/1e040fbc-9eee-41dc-b738-306c4d0b7aa8.jpeg"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/anthenea-suite-flottante-perros-guirec/gallery-02.jpeg" "https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MTE1MjE0NTM5MjgzNDU2NzA5MQ%3D%3D/original/b5c16fda-77f6-4d51-8d41-32c6710cd32a.jpeg"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/anthenea-suite-flottante-perros-guirec/gallery-03.jpeg" "https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MTE1MjE0NTM5MjgzNDU2NzA5MQ%3D%3D/original/891d9aa0-c581-4c6c-b3ef-b01ae1e0cdfb.jpeg"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/anthenea-suite-flottante-perros-guirec/gallery-04.jpeg" "https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MTE1MjE0NTM5MjgzNDU2NzA5MQ%3D%3D/original/f3702259-db55-4e10-9b7f-9fe5414e1ffa.jpeg"
echo "✅ anthenea-suite-flottante-perros-guirec (5 imgs)"

# tiny-house-silo-grain-ellensburg-washington (10)
rm -f "$OUTDIR/tiny-house-silo-grain-ellensburg-washington/"*.jpg "$OUTDIR/tiny-house-silo-grain-ellensburg-washington/"*.jpeg "$OUTDIR/tiny-house-silo-grain-ellensburg-washington/"*.png
mkdir -p "$OUTDIR/tiny-house-silo-grain-ellensburg-washington"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/tiny-house-silo-grain-ellensburg-washington/cover.png" "https://a0.muscache.com/im/pictures/miso/Hosting-645104367296318967/original/6bd8c5c2-b4ab-423f-a926-7c4153c2dd01.png"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/tiny-house-silo-grain-ellensburg-washington/gallery-01.jpg" "https://a0.muscache.com/im/pictures/18ab5975-e2f3-4328-a1e8-7490b2af16bc.jpg"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/tiny-house-silo-grain-ellensburg-washington/gallery-02.jpg" "https://a0.muscache.com/im/pictures/53cc53c8-072f-4e0c-8041-44f75f2bedaa.jpg"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/tiny-house-silo-grain-ellensburg-washington/gallery-03.jpg" "https://a0.muscache.com/im/pictures/aee60a1a-e70f-414f-88cc-adbaec0047e2.jpg"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/tiny-house-silo-grain-ellensburg-washington/gallery-04.jpg" "https://a0.muscache.com/im/pictures/8e4ee686-2b51-4db7-a449-7ccadd7cb64a.jpg"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/tiny-house-silo-grain-ellensburg-washington/gallery-05.jpg" "https://a0.muscache.com/im/pictures/dc3a4b65-7909-4239-98ba-6cf810efad55.jpg"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/tiny-house-silo-grain-ellensburg-washington/gallery-06.jpg" "https://a0.muscache.com/im/pictures/8966c209-0256-43b0-990d-b99d832cbdf8.jpg"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/tiny-house-silo-grain-ellensburg-washington/gallery-07.png" "https://a0.muscache.com/im/pictures/miso/Hosting-645104367296318967/original/8d886a18-0c3a-4d02-9038-63165e5c2538.png"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/tiny-house-silo-grain-ellensburg-washington/gallery-08.jpg" "https://a0.muscache.com/im/pictures/eb1a6b74-016d-4c3e-aa9d-f50e008027dc.jpg"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/tiny-house-silo-grain-ellensburg-washington/gallery-09.jpg" "https://a0.muscache.com/im/pictures/a13c3037-178b-45ca-8737-8df81d9373cc.jpg"
echo "✅ tiny-house-silo-grain-ellensburg-washington (10 imgs)"

# domeland-adobe-hors-reseau-big-bend-texas (5)
rm -f "$OUTDIR/domeland-adobe-hors-reseau-big-bend-texas/"*.jpg "$OUTDIR/domeland-adobe-hors-reseau-big-bend-texas/"*.jpeg "$OUTDIR/domeland-adobe-hors-reseau-big-bend-texas/"*.png
mkdir -p "$OUTDIR/domeland-adobe-hors-reseau-big-bend-texas"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/domeland-adobe-hors-reseau-big-bend-texas/cover.jpg" "https://a0.muscache.com/im/pictures/9932c273-2abd-44d3-8c82-ae7e6fc96c75.jpg"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/domeland-adobe-hors-reseau-big-bend-texas/gallery-01.jpg" "https://a0.muscache.com/im/pictures/dab1d9c7-ad34-42fe-a267-0a32a73a27d0.jpg"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/domeland-adobe-hors-reseau-big-bend-texas/gallery-02.jpg" "https://a0.muscache.com/im/pictures/d962a1d8-3d5f-4a91-969f-9b0609d15b26.jpg"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/domeland-adobe-hors-reseau-big-bend-texas/gallery-03.jpg" "https://a0.muscache.com/im/pictures/5b81480f-26bb-47a6-bd32-cd0e48c58d92.jpg"
curl -sL --retry 3 --max-time 30 -H "Referer: https://www.airbnb.fr/" -o "$OUTDIR/domeland-adobe-hors-reseau-big-bend-texas/gallery-04.jpg" "https://a0.muscache.com/im/pictures/14c8751f-7f87-4ee4-ba4e-dcdd6cf98262.jpg"
echo "✅ domeland-adobe-hors-reseau-big-bend-texas (5 imgs)"

echo ""
echo "✅ Patch terminé — 3 listings corrigés"
