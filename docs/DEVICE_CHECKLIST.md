# Real-device checklist

Automated tests run in desktop WebKit and Chromium. Before calling a build ready, check these on a real iPhone (Safari) and a real Android phone (Chrome). Use the GitHub Pages site: the app must be served over **HTTPS**, because installation and offline mode do not work over plain `http://` on a local network address.

## Install
- [ ] iPhone: Safari → Share → «На экран Домой». The icon and the name «Атлетика» look right.
- [ ] Android: Chrome offers to install the app, or ⋮ → «Установить приложение».
- [ ] The installed app opens full screen, without browser bars.
- [ ] The status bar area and the bottom home indicator do not cover content.

## Data
- [ ] Create a day and an exercise, close the app completely, reopen: the data is still there.
- [ ] iPhone: data entered in Safari is **not** visible in the installed app (separate storage on iOS). Use the installed app.

## Offline
- [ ] Turn on airplane mode and open the installed app: it starts and the data is there.

## Interaction
- [ ] Reordering exercises with the left handle works by touch and does not scroll the page.
- [ ] Typing in fields does not zoom the page.
- [ ] Russian text, including Ё/ё, renders in Oswald and Roboto Condensed (compare with the «Компоненты» page).
