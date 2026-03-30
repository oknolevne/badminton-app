# PRD – Slash Smash Badminton

## 1. Přehled projektu

**Název:** Slash Smash Badminton
**Typ:** Webová aplikace (mobile-first, responzivní)
**Jazyk:** Čeština
**URL:** badminton-gamma-one.vercel.app
**Repozitář:** github.com/oknolevne/badminton-app

**Cíl:** Správa badmintonových středečních večerů pro skupinu ~16 hráčů. Aplikace generuje páry na základě ELO ratingu, umožňuje zápis výsledků z mobilu, automaticky počítá ELO a uchovává historii.

---

## 2. Kontext

Každou středu se schází skupina ~16 hráčů na badminton. Skupina hraje od roku 2024, má historii **445 odehraných zápasů** uloženou v Excelu. Aplikace tuto historii importuje a navazuje na ni.

---

## 3. Uživatelé a role

| Role | Popis |
|------|-------|
| **Hráč** | Zapisuje výsledky, vidí svůj profil, statistiky, ELO historii |
| **Admin** | Navíc: správa hráčů, zpětná editace výsledků s přepočtem ELO, audit log |

Přihlašování: uživatelské jméno + heslo (`{username}@slashsmash.app`).

---

## 4. Hráči (21 registrovaných)

| Jméno | ID | ELO | Role |
|-------|----|-----|------|
| Kony | 24 | 1845 | player |
| Klara | 17 | 1796 | player |
| Martin | 61 | 1708 | **admin** |
| Jindra | 11 | 1674 | player |
| Honza | 88 | 1624 | player |
| Aik | 10 | 1590 | player |
| Adam | 70 | 1567 | player |
| Bart | 13 | 1538 | player |
| Terka | 22 | 1533 | player |
| Novo | 77 | 1502 | player |
| Tyna | 63 | 1497 | player |
| Fanda | 19 | 1476 | player |
| Doki | 99 | 1460 | player |
| Anicka | 15 | 1449 | player |
| Rutak | 78 | 1434 | player |
| Dan | 16 | 1432 | player |
| Jindrad | 69 | 1398 | player |
| Andrej | 12 | 1392 | player |
| Stroblik | 42 | 1388 | player |
| Heňa | 35 | 1265 | player |
| Majda | 26 | 1193 | player |

Heslo pro všechny: `slashsmash2026`
Email formát: `{username}@slashsmash.app`

---

## 5. Funkcionality (MVP)

### F01 – Autentizace ✅
- Přihlášení username + heslo
- Session persistence (cookie)
- Middleware chrání app routes

### F02 – Dashboard
- ELO hero karta s poslední změnou
- Statistiky: zápasy, win rate, pořadí
- Aktivní večer (pokud existuje) s odkazem
- Tlačítko "Nový večer"
- Poslední 3 zápasy

### F03 – Vytvoření večera
- Výběr přítomných hráčů ze seznamu 21
- Validace: min 4 hráči, počet musí být dělitelný 4 nebo mít zbytek 2
- Zbytek 2 → 2 hráči hrají tréninkový zápas (bez ELO)
- Generování rozvrhu: 3 bloky × 3 zápasy

### F04 – Rozvrh večera
- Zobrazení všech bloků a zápasů najednou
- Každý zápas: Tým A vs Tým B + tlačítko "Zadat skóre"
- Countdown timer (24h do automatického uzavření)
- Možnost smazat večer

### F05 – Zápis výsledků
- Bottom sheet s jmény obou týmů
- 2 sety do 11 bodů (dynamicky přidatelné)
- Live součet při zadávání
- Zvýraznění vítěze v reálném čase
- Uložení → ELO se přepočítá automaticky
- Kdokoliv může výsledek upravit

### F06 – ELO systém
- Výpočet po každém uloženém výsledku (DB funkce `calculate_elo_for_match`)
- K=100, DIVISOR=1400, proporcionální skóre
- Tréninkové zápasy se do ELO nepočítají
- Zpětná editace (admin) → přepočet od daného zápasu

### F07 – Žebříček
- Všichni hráči seřazení podle ELO
- Pořadí, avatar, jméno, ELO, změna za poslední zápas

### F08 – Profil hráče
- Avatar (iniciály), jméno, ELO
- Statistiky: zápasy, výhry, prohry, win rate
- ELO graf (liniový, celá historie)
- Nejčastější partner, nejlepší partner, nejhorší soupeř

### F09 – Realtime sync
- Více hráčů zapisuje najednou bez konfliktů
- Live update výsledků na session stránce

### F10 – Admin panel (Fáze 2)
- Správa hráčů (CRUD)
- Zpětná editace výsledků
- Audit log

---

## 6. Nefunkcionální požadavky

| Požadavek | Detail |
|-----------|--------|
| **Mobile-first** | Primární použití na mobilu při zápasech |
| **Responzivita** | Funguje na mobilu i desktopu |
| **Souběžnost** | Více hráčů zapisuje zároveň |
| **Jazyk** | Čeština |
| **Hosting** | Vercel (free) + Supabase (free) |
| **Auth** | Supabase Auth, email/password |

---

## 7. Historická data

**445 zápasů** z Excel souboru `Bedas_Hry.xlsx`.

Formát:
- `Teamy`: 8místné číslo `61881711` = tým1(61+88) vs tým2(17+11)
- `Skore`: 4místné číslo `2118` = 21:18

Import: skript `scripts/import-history.ts` — sekvenční ELO přepočet, výsledné ELO odpovídá hodnotám v tabulce výše.

---

## 8. Co je mimo scope (MVP)

- Push notifikace
- Mobilní app (native)
- Platby
- Vícejazyčnost
- Turnajový systém
