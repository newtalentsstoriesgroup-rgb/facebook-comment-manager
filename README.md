# Facebook Comment Manager (FCM)

Porogaramu yo gucunga ibitekerezo bya Facebook: **Next.js (Pages Router)** + **React** + **Firebase Auth** + **Cloud Firestore** + **Tailwind CSS**, yateguwe kuri **Vercel**. Imikoreshereze yose ni mu Kinyarwanda.

> Nta "admin system" irimo. Buri mukoresha acunga amakuru ye bwite gusa.

## 1. Ibikubiyemo

```
components/   Layout, Sidebar, Header, StatCard, CommentCard, PostCard, CommentEditor, ConfirmDialog, Loading, ui...
context/      AuthContext.js, ThemeContext.js
hooks/        useAuth, useComments, usePosts, useFacebookAccount
lib/          firestore, comments, posts, activity, validation, utils, api, firebaseClient
lib/server/   (seriveri gusa) admin, auth, crypto, facebook
pages/        index, login, register, dashboard, posts, comments, approvals, history, settings, profile
pages/api/facebook/   connect, callback, pages, publish, disconnect
firestore.rules, firestore.indexes.json
```

**`components/firebase.js` ntiri muri iyi zip** — ni iyawe usanzwe ufite. Ntabwo yahinduwe. Shyira iyi mishinga mu mushinga wawe, cyangwa wongere iyo file muri `components/` niba utangira bushya.

`lib/firebaseClient.js` ni yo yonyine itumiza muri `@/components/firebase`:

```js
import { auth, db } from '@/components/firebase';
```

Niba exports zawe zitwa ukundi, hindura uyu murongo umwe gusa.

## 2. Gutangira (local)

```bash
npm install
npm run dev
```

Ibidukikije bya seriveri (reba igice cya 5) bikenerwa **gusa** ku guhuza Facebook no gutangaza. Kwinjira, gukora inyandiko n'ibitekerezo bikora hatabayeho.

Niba usanzwe ufite `package.json`, uyihuze: dependencies zikenewe ni `next`, `react`, `react-dom`, `firebase`, `firebase-admin`, `lucide-react`, `react-hot-toast`, na `tailwindcss`, `postcss`, `autoprefixer` (dev). `jsconfig.json` ni yo ituma `@/` ikora.

## 3. Firebase

1. Muri [Firebase Console](https://console.firebase.google.com) fungura **Authentication → Sign-in method** ushyireho **Email/Password**.
2. **Authentication → Settings → Authorized domains**: ongeraho domain yawe ya Vercel (urugero `fcm.vercel.app`).
3. **Firestore Database → Create database** (production mode).
4. **Firestore → Rules**: koporora ibiri muri `firestore.rules` ubishyiremo ukande **Publish**.
5. **Firestore → Indexes → Composite → Add index**:
   - Collection: `activityLogs`
   - Fields: `userId` (Ascending), `createdAt` (Descending)
   - Query scope: Collection

   (Cyangwa ukoresha Firebase CLI: `firestore.indexes.json` irimo iyi index.) Ni yo ikoreshwa n'urupapuro **Amateka** n'ikibaho.

### Ibyo rules zikora
- Buri mukoresha asoma/andika/ahindura/asiba amakuru ye gusa (`request.auth.uid == resource.data.userId`; kurema: `request.auth.uid == request.resource.data.userId`).
- Ntushobora guhindura `userId` ngo ushyire undi.
- Amazina y'imirima n'ubwoko bw'amakuru birasuzumwa.
- `comments`: client ntishobora gushyiraho status `published`/`failed`, `facebookCommentId` cyangwa `publishedAt` — ibyo bishyirwa na seriveri gusa.
- `activityLogs`: asomwa kandi yongerwaho gusa (ntahindurwa).
- `facebookAccounts`: gusoma gusa. `facebookTokens` na `rateLimits`: client ntiyemerewe na gato.

## 4. Meta (Facebook) Developer App

1. Jya kuri [developers.facebook.com](https://developers.facebook.com) → **Create App** (Type: **Business**).
2. Ongeraho product **Facebook Login** (cyangwa "Facebook Login for Business").
3. **Facebook Login → Settings → Valid OAuth Redirect URIs**, ongeraho:
   - `https://DOMAIN-YAWE.vercel.app/api/facebook/callback`
   - (local) `http://localhost:3000/api/facebook/callback`
4. **Settings → Basic**: fata **App ID** na **App Secret**.
5. Uburenganzira (permissions) bukoreshwa:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_engagement`.
   - Mu **Development mode**, bikora ku bafite uruhare muri app (Admins/Developers/Testers) gusa.
   - Ku bandi bose ukeneye **App Review** na **Advanced Access** kuri ubwo burenganzira, hamwe na **Business Verification** nk'uko Meta ibisaba.
6. Umukoresha agomba kuba afite uruhare kuri paji ashaka guhuza.

> Ibitekerezo bitangazwa **nka Paji**, ku nyandiko z'iyo paji gusa. Gutangaza ku nyandiko za paji zindi cyangwa z'abantu ntibishoboka (kandi ni byo bigamije).

### ID y'inyandiko
Graph API ikeneye ID y'imibare. Porogaramu ikuramo ID mu mahuza amwe (`/posts/ID`, `permalink.php?story_fbid=…&id=…`, `/videos/ID`…). Amahuza yitwa `pfbid…` cyangwa `/share/…` ntabwo akurwamo ID: shyiramo ID y'imibare (`PAGEID_POSTID`) mu murima wa "ID y'inyandiko" mu ifishi. Gutangaza bizanga niba ID itari imibare cyangwa itari iya paji wahujwe.

## 5. Ibidukikije bya seriveri (Vercel → Settings → Environment Variables)

Ibi **ntibifitanye isano** na Firebase client config (iguma muri `components/firebase.js`). Nta `.env` file ikenewe muri repo.

| Izina | Ibisobanuro |
|---|---|
| `FACEBOOK_APP_ID` | App ID ya Meta |
| `FACEBOOK_APP_SECRET` | App Secret ya Meta |
| `TOKEN_ENCRYPTION_KEY` | Ijambo ry'ibanga rirerire ryo gufunga tokens. Rikore: `openssl rand -hex 32` |
| `FIREBASE_SERVICE_ACCOUNT` | JSON yose ya Service Account (cyangwa base64 yayo) — reba hasi |
| `FACEBOOK_REDIRECT_URI` | (bitegetswe) urugero `https://DOMAIN.vercel.app/api/facebook/callback`. Iyo itashyizweho ikoreshwa host y'ubusabe |
| `FACEBOOK_GRAPH_VERSION` | (bitegetswe) isanzwe `v23.0`. Shyiramo version ya Graph API ikiriho kuri Meta |

**Service Account**: Firebase Console → Project settings → **Service accounts** → **Generate new private key**. Shyira ibiri muri iyo file yose nk'agaciro ka `FIREBASE_SERVICE_ACCOUNT`. Ikoreshwa **ku seriveri gusa** (`pages/api/*`) kugira ngo tokens za Facebook zibikwe muri `facebookTokens` — collection client itagera na gato. Si "admin" y'abakoresha: nta ruhare (role) ruriho.

## 6. Vercel

1. Shyira umushinga kuri GitHub.
2. Vercel → **Add New Project** → hitamo repo. Framework: **Next.js** (byamenyekana ubwabyo).
3. Ongeraho ibidukikije byo mu gice cya 5.
4. **Deploy**.
5. Subira kuri Meta Developer ushyireho redirect URI nyayo ya Vercel, no kuri Firebase Authorized domains.

## 7. Uko Facebook ikora (n'ibyo itakora)

1. **Igenamiterere → Huza Facebook** → OAuth ya Meta → uhitamo paji.
2. Seriveri ihana code na token ndende, ikabika **gusa** Page token, **yafunzwe (AES-256-GCM)**, muri `facebookTokens/{uid}`. Ntiyigera ijya muri mushakisha.
3. Ibitekerezo: *Inyandikorugero → Itegereje → Cyemejwe → Cyatangajwe*. Nta gitekerezo gitangazwa ubwacyo.
4. **Kwemeza** → tab "Byemejwe" → **Tangaza** → ifishi yo kwemeza → seriveri ihamagara `POST /{PAGEID_POSTID}/comments`.
5. Hakozwe: kubika `facebookCommentId`; ikosa ritumvikana rikabikwa muri `errorMessage` (status `failed`, ushobora kongera kugerageza); token yarangiye (code 190) → ihuza rirasobanurwa nk'iryarangiye; rate limit ya Facebook ntiyangiza igitekerezo.
6. Kwirinda spam: igitekerezo **kimwe** gitangazwa icyarimwe, umupaka w'ibitekerezo **5 ku munota** ku mukoresha, kandi umwandiko umwe ntutangazwa kabiri ku nyandiko imwe.
7. Nta browser automation, cookies cyangwa scraping.

## 8. Imiterere y'amakuru (Firestore)

- `users/{uid}`: uid, email, displayName, photoURL, createdAt, updatedAt
- `posts`: userId, postId (ID ya Facebook), postUrl, title, description, createdAt, updatedAt
- `comments`: userId, **postId (ID ya document ya `posts`)**, text, status, createdAt, updatedAt, approvedAt, publishedAt, facebookCommentId, errorMessage
- `activityLogs`: userId, action, description, createdAt
- `facebookAccounts/{uid}`: userId, pageId, pageName, connectionStatus, connectedAt
- (seriveri gusa) `facebookTokens/{uid}`, `rateLimits/{uid}`

## 9. Icyitonderwa

- Gushakisha (search) bikorwa muri mushakisha ku makuru yamaze gukurwa, kuko Firestore nta full-text search ifite.
- Urutonde rw'inyandiko n'ibitekerezo rwakirwa live (real-time) rugakatwa mu mapaji (client-side); **Amateka** akoresha pagination ya Firestore (cursor, "Ongera ugaragaze").
- Gusiba inyandiko bisiba n'ibitekerezo byayo.
