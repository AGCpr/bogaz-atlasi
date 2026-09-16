# Boğaz Atlası (web)

Çanakkale Boğazı CBS pilotunun interaktif arayüzü. Statik site — derleme adımı yok.

## Yayın (Cloudflare Pages + GitHub)

- Root directory: `/` (bu klasör repo köküdür)
- Build command: (boş) · Output: `/`
- `_headers` önbellek kurallarını taşır.

## Yerel test

`python -m http.server 8765` → http://localhost:8765/index.html

Veri: `data/` (üretilen JSON), görseller: `img/`, indirilebilirler: `dosya/`.
Ana hat: `../scripts/25_web_veri.py` ile üretilir; içerik `../09_teslim/NIHAI_RAPOR.md` sınırlarına tabidir (pilot, kanıt değil).
