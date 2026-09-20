# Activități interactive

Platformă pentru profesori cu lucru local și integrare Supabase pentru conturi Google și salvare privată.

Site public: https://atelier-profesori.vercel.app/

Repository activ: https://github.com/raulveres-creator/activitati-interactive-design-lab

Vercel publică automat ramura `main` în proiectul `atelier-profesori`. Pentru schimbări de design, folosește o ramură separată și previzualizarea Vercel; integrarea în `main` actualizează site-ul public. Proiectul este static, cu presetul Other, directorul rădăcină `./` și fără comandă de build. Include întotdeauna folderele `assets` și `vendor`.

Include:

- zece formate: Quiz, Potrivire, Sortare, Ordonare, Memory, Calcule, Adevărat/Fals, Completează, Litere amestecate și Caută cuvinte;
- exemple în română și flux de creare/editare;
- salvare în browser fără cont și salvare privată în Supabase când profesorul este autentificat;
- bibliotecă locală cu editare, redare, duplicare pregătită pentru următoarea etapă și ștergere;
- linkuri de partajare care includ conținutul complet în fragmentul URL, fără backend;
- validare pentru conținut incomplet și mesaj pentru linkuri invalide;
- aspect responsive pentru desktop și mobil.

Pagina principală include un meniu de navigare, căutare și filtre pentru modele, ilustrații proprii, acces rapid la prezență și un simbol de carte deschisă. Calendarul, organigramele și șabloanele de lecții sunt prezentate ca funcții în pregătire.

Modulul `prezenta.html` permite gestionarea grupelor și bifarea prezenței. Simbolul ales pentru grupă este comun tuturor copiilor. Datele se păstrează în browser sau în contul profesorului, conform stării afișate.

Designul paginii principale este definit în `atelier.css`, ilustrațiile în `atelier-art.js`, iar comportamentul paginii în `atelier.js` și `app.js`. Previzualizarea unei activități păstrează modificările nesalvate când revii la editor.

Stratul vizual interactiv este în `experience.css`. Mini-atelierul (`mini-workshop.js`) oferă calcule generate, Memory vizual și ordonare de numere. Pentru un profesor autentificat cu activități salvate, afișează accesul la ultima activitate actualizată. Jocurile demonstrative nu scriu rezultate în datele profesorului. Modelele, biblioteca, editorul și prezența folosesc același sistem vizual; toate cele opt palete controlează inclusiv fundalul animat, degradeurile și butoanele. Cardurile de modele prezintă conținut din jocuri, nu coperti decorative. Ilustrațiile originale rămân în `assets/learning-worlds.webp` și `assets/wildlife-atlas.webp`. Cardul de acces la prezență nu mai conține soarele rotativ. Textele interfeței sunt gestionate în `i18n.js` și `experience-copy.js`; exemplele educaționale și noile instrucțiuni de editare sunt în română.

`scene-controls.js` oferă schimbarea modului luminos/întunecat și activarea sunetelor pe pagina principală și la prezență. Sunetele sunt oprite la fiecare vizită până la activarea explicită. Mișcarea se oprește automat când sistemul solicită animații reduse; cursorul nativ personalizat și efectul de click sunt definite în `cursor.js` și `cursor.css`.

## Pornire

Servește acest director printr-un server static HTTP, într-un browser modern. Modulul de prezență folosește module JavaScript și necesită servire HTTP. Previzualizarea de lucru este disponibilă la `http://127.0.0.1:4173/` cât timp serverul local rulează.

În workspace-ul Codex, checkout-ul activ este `work/atelier-production`. Pornire din rădăcina workspace-ului: `node work/serve-preview.cjs`.

Datele locale pot fi copiate în cont prin „Adu în cont datele din acest browser”. Un link partajat conține doar activitatea aleasă și poate fi deschis fără cont; grupele și prezențele nu sunt incluse în link.

Google este activ în Supabase. Site URL este `https://atelier-profesori.vercel.app/`; adresele de redirect permise includ această adresă și `http://127.0.0.1:4173/`. Domeniile de preview nu sunt autorizate automat pentru login. Callback-ul Google rămâne `https://jqscykptevmhkqtuffqo.supabase.co/auth/v1/callback`.

`backend-config.js` conține numai cheia publică publishable. Nu adăuga parole, chei secrete sau secretul Google în repository. Documentația și migrarea bazei de date se află în directorul `supabase` al workspace-ului Codex, separat de fișierele publicate.

## Activități și imagini

`activity-rules.js` conține generarea calculelor, amestecarea și construirea grilelor de cuvinte, plus validarea comună cu stocarea. `activity-extensions.js` conectează cele cinci formate noi la editor și joc. Nu necesită migrarea datelor Supabase.

Memory păstrează asocierile text existente și adaugă modurile imagini identice și imagine–cuvânt. Profesorul alege o imagine din catalogul local sau introduce un link direct HTTPS în `activity-media.js`. O singură referință este salvată per pereche, apoi reutilizată la afișarea celor două cartonașe. Linkurile externe trebuie să rămână accesibile public; nu există căutare automată după cuvânt și nici API extern de imagini. Cererile imaginilor nu trimit adresa paginii ca referer. Un link indisponibil păstrează eticheta text ca alternativă.

Conectarea și personalizarea sunt ferestre separate. Butonul de ajustări din bara de sus deschide temele și limbile, inclusiv fără cont.

La cererea utilizatorului, pentru această extindere nu s-au rulat teste automate sau sesiuni de testare în browser. Testarea funcțională completă este amânată pentru final.
