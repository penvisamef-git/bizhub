# BizHub Web

React 19 + Vite + React Router 7. English / ខ្មែរ, light / dark mode, responsive (sidebar on desktop, bottom bar on phone).

## Run

```bash
npm install
cp .env.example .env      # set VITE_API_HOST and VITE_API_AUTH_KEY
npm run dev               # http://localhost:3000
npm run build             # → build/ (Firebase Hosting serves this folder)
```

## Routes

| URL | What |
|---|---|
| `/` | Public homepage (content comes from the API, with built-in defaults) |
| `/login`, `/sign-up` | Auth |
| `/app/dashboard`, `/app/name-card`, `/app/wallet`, `/app/settings`, `/app/account` | Client dashboard |
| `/app/admin/homepage` | Website settings (super admin) |
| `/app/admin/users`, `/app/admin/activity-log` | BizHub admin |
| `/public/card/:username` | Public digital name card (coming) |

## Folder structure

```
src/
  homepage/              public website: HomePage, banners, service sheet, app showcase
    content.js           all homepage text (EN + KM) and service details = defaults
    defaults.js          default contact / coins / payment methods (used if the API is offline)
    useHomepageData.js   loads GET /api/public/homepage and merges it with the defaults
    auth/                login + sign-up
  dashboard/
    layout/              AppLayout (sidebar / bottom bar), nav.js (menus + who can see them)
    admin/               BizHub team: homepage settings, users, activity log, data table
    client/              business owners: dashboard, name card, wallet, settings, account
                         (each business service gets its own folder here later)
  api/                   client.js (fetch + token), services.js (endpoints)
  lib/                   auth (login storage), roles, permission
  i18n/                  messages.js (app text EN/KM), I18nProvider
  theme/                 light / dark
  styles/                tokens.css (colors for both themes), global.css
  components/            Logo, LangSwitch, ThemeToggle, RequireAuth…
  public/                public pages (digital name card)
```

## Editing website text

The super admin can change contact info, coin price, free coins, payment methods, app links,
which services show (and their order) and any homepage text in **Website settings**.
Text placeholders filled automatically: `{pack}` `{price}` `{bonus}` `{payments}`.
