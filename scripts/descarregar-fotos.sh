#!/usr/bin/env bash
# Descarrega as fotografias das obras a partir do site antigo (marsolve.net)
# para assets/obras/<obra>/.
#
# Correr no Terminal normal do Mac, a partir da raiz do projeto:
#   bash scripts/descarregar-fotos.sh
#
# E seguro repetir: ficheiros ja descarregados sao saltados.

set -u
cd "$(dirname "$0")/.." || exit 1

total=0; novos=0; falhas=0

# O servidor limita o ritmo: a primeira tentativa passou ~22 ficheiros e
# depois comecou a recusar. Por isso ha pausa entre pedidos, identificacao
# de browser e tentativas repetidas. O codigo HTTP e registado por ficheiro,
# para distinguir bloqueio (403/429) de endereco errado (404).
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
PAUSA="${PAUSA:-1.5}"

descarregar() {
  obra="$1"; shift
  mkdir -p "assets/obras/$obra"
  i=0
  for url in "$@"; do
    i=$((i+1))
    ext="${url##*.}"
    destino=$(printf "assets/obras/%s/%02d.%s" "$obra" "$i" "$ext")
    total=$((total+1))
    if [ -s "$destino" ]; then
      continue
    fi

    codigo=$(curl -sSL --max-time 90 \
      --retry 4 --retry-delay 3 --retry-all-errors \
      -A "$UA" -e "https://marsolve.net/" \
      -w "%{http_code}" -o "$destino" "$url" 2>/dev/null)

    if [ "$codigo" = "200" ] && [ -s "$destino" ]; then
      novos=$((novos+1))
      printf "  ok    %s\n" "$destino"
    else
      falhas=$((falhas+1))
      rm -f "$destino"
      printf "  FALHA %s  (HTTP %s)\n" "$url" "${codigo:-sem resposta}"
    fi
    sleep "$PAUSA"
  done
  printf "%-26s %d imagens\n" "$obra" "$i"
}

B="https://marsolve.net/wp-content/uploads"

descarregar vilamoura \
  "$B/2026/02/3D.jpg"

descarregar albufeira-4-moradias \
  "$B/2025/08/01-3.jpg" "$B/2025/08/02-2.jpg" "$B/2025/08/03-1.jpg" \
  "$B/2025/08/04-1.jpg" "$B/2025/08/05-1.jpg" "$B/2025/08/07.jpg"

descarregar pera-7-moradias \
  "$B/2025/08/01-1.jpg" "$B/2025/08/02-1.jpg" "$B/2025/08/03.jpg" \
  "$B/2025/08/05.jpg" "$B/2025/08/06.jpg"

descarregar casino-armacao-de-pera \
  "$B/2024/12/cap_v36_7-Photo.jpg" "$B/2024/12/cap_v36_22-Photo-2.jpg" \
  "$B/2024/12/v32B_5-Photo.jpg"

descarregar marina-de-albufeira \
  "$B/2021/11/1-1.jpeg" "$B/2021/11/3-1.jpeg" "$B/2021/11/5-2.jpeg" \
  "$B/2021/11/7-1.jpeg" "$B/2021/11/8.jpeg" "$B/2021/11/13-1.jpeg" \
  "$B/2021/11/15-1.jpeg" "$B/2021/11/21-1.jpeg" "$B/2021/11/25-1.jpeg" \
  "$B/2021/11/30-2.jpeg" "$B/2021/11/41-1.jpeg" "$B/2021/11/43-1.jpeg" \
  "$B/2021/11/45.jpeg" "$B/2021/11/48.jpeg" "$B/2021/11/58-1.jpeg" \
  "$B/2021/11/75-1.jpeg" "$B/2021/11/78-1.jpeg"

descarregar turismo-rural-albufeira \
  "$B/2021/11/WhatsApp-Image-2023-04-20-at-12.36.06-1-1.jpeg" \
  "$B/2021/11/WhatsApp-Image-2023-04-20-at-12.36.50-1.jpeg" \
  "$B/2021/11/WhatsApp-Image-2023-04-20-at-12.36.50-1-1.jpeg" \
  "$B/2021/11/WhatsApp-Image-2023-04-20-at-12.36.50-2.jpeg" \
  "$B/2021/11/WhatsApp-Image-2023-04-20-at-12.36.50-2-1.jpeg" \
  "$B/2021/11/WhatsApp-Image-2023-04-20-at-12.36.51-1.jpeg" \
  "$B/2021/11/WhatsApp-Image-2023-04-20-at-12.36.54-1.jpeg" \
  "$B/2021/11/WhatsApp-Image-2023-05-16-at-12.52.33.jpeg" \
  "$B/2021/11/WhatsApp-Image-2023-05-16-at-12.52.36.jpeg" \
  "$B/2021/11/WhatsApp-Image-2023-05-16-at-12.52.41.jpeg" \
  "$B/2021/11/WhatsApp-Image-2023-05-16-at-12.52.57-3.jpeg"

descarregar maria-nova-lounge-hotel \
  "$B/2021/11/23022017-_MG_9873.jpg" "$B/2021/11/23022017-_MG_9875.jpg" \
  "$B/2021/11/23022017-_MG_9876.jpg" "$B/2021/11/23022017-_MG_9880.jpg" \
  "$B/2021/11/23022017-_MG_9886.jpg" "$B/2021/11/23022017-_MG_9893.jpg" \
  "$B/2021/11/09032017-09032017-_MG_0068.jpg" \
  "$B/2021/11/09032017-09032017-_MG_0090.jpg" \
  "$B/2021/11/09032017-09032017-_MG_0127.jpg" \
  "$B/2021/11/09032017-09032017-_MG_0132.jpg" \
  "$B/2021/11/09032017-09032017-_MG_0134.jpg"

descarregar unik-fitness-club \
  "$B/2021/11/RECEPCAO.jpg" "$B/2021/11/BAR.jpg" "$B/2021/11/BICICLETAS.jpg" \
  "$B/2021/11/PASSADEIRAS.jpg" \
  "$B/2021/11/IMG_1735-scaled.jpg" "$B/2021/11/IMG_1736-scaled.jpg" \
  "$B/2021/11/IMG_1738-scaled.jpg" "$B/2021/11/IMG_1739-scaled.jpg" \
  "$B/2021/11/IMG_1740-scaled.jpg" "$B/2021/11/IMG_1741-scaled.jpg" \
  "$B/2021/11/IMG_1742-scaled.jpg" "$B/2021/11/IMG_1743-scaled.jpg" \
  "$B/2021/11/IMG_1744-scaled.jpg" "$B/2021/11/IMG_1745-scaled.jpg" \
  "$B/2021/11/IMG_1746-scaled.jpg" "$B/2021/11/IMG_1747-scaled.jpg" \
  "$B/2021/11/IMG_1748-scaled.jpg" "$B/2021/11/IMG_1750-scaled.jpg" \
  "$B/2021/11/IMG_1751-scaled.jpg" "$B/2021/11/IMG_1752-scaled.jpg"

echo
echo "-----------------------------------------"
echo "esperadas: $total   novas: $novos   falhas: $falhas"
echo "(ficheiros ja existentes foram saltados)"
if [ "$falhas" -gt 0 ]; then
  echo "Algumas falharam. Volta a correr para tentar so essas."
fi
