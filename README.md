# ClickERP: Frontend site prototype

A static HTML/CSS/JS prototype of the public marketing website for **نظام كليك (ClickERP)**, the system for Saudi recruitment offices and companies, by Click & More.

The site is Arabic-first (`dir="rtl"`) and uses the **"Real Moments" (لحظات حقيقية)** direction: storytelling with real-style photography, plus a green line drawn by the ClickERP cursor that connects every section and ends on the demo call to action.

## Pages

| File | Page | Replaces on the live site |
|---|---|---|
| `index.html` | الرئيسية (cinematic hero + homepage) | الرئيسية |
| `system.html` | النظام | خدماتنا |
| `about.html` | من نحن | من نحن |
| `packages.html` | الباقات (no prices) | الباقات |
| `digital-channels.html` | الموقع والتطبيقات + أعمالنا | أعمالنا |

## Run locally

No build step is needed. Serve the folder with any static server, for example:

```bash
python -m http.server 5173
# open http://127.0.0.1:5173/
```

An internet connection is needed for Google Fonts (Readex Pro, IBM Plex Sans Arabic), Phosphor icons and GSAP 3.15.1 (ScrollTrigger), all loaded from CDNs at exact versions.

## Behaviour

- **Desktop (≥ 1024 × 640) with motion allowed:** a pinned, scroll-scrubbed hero; the works reel, where the section takes each client's brand colour; and the green line down each page.
- **Smaller screens, `prefers-reduced-motion`, or no JavaScript:** simple stacked sections with all content visible.
- **Forms:** UI only, so nothing is sent.

## Notes

- **This is a prototype,** and every page is marked `noindex`.
- **Photos** in `assets/photos/` are **AI-generated placeholders**, to be replaced with a real photo shoot or licensed images before launch.
- **Dashboard numbers** marked «بيانات تجريبية» are sample data.
- **Client logos and project images** are the ones published on clickerp.sa and are used with the owner's approval.
- **Content marked «بانتظار التأكيد»** is pending confirmation.
