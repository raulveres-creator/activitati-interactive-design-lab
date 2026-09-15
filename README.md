# Activități interactive

Platformă pentru profesori cu lucru local și integrare Supabase pentru conturi Google și salvare privată. Acest director este sursa paginii de previzualizare; proiectul React extras în `work` este o versiune separată, mai veche.

Include:

- cinci formate jucabile: Quiz, Potrivire, Sortare, Ordonare și Memory;
- exemple în română și flux de creare/editare;
- salvare în browser fără cont și salvare privată în Supabase când profesorul este autentificat;
- bibliotecă locală cu editare, redare, duplicare pregătită pentru următoarea etapă și ștergere;
- linkuri de partajare care includ conținutul complet în fragmentul URL, fără backend;
- validare pentru conținut incomplet și mesaj pentru linkuri invalide;
- aspect responsive pentru desktop și mobil.

Pagina principală include un meniu de navigare, căutare și filtre pentru modele, ilustrații proprii, acces rapid la prezență și un simbol de carte deschisă. Calendarul, organigramele și șabloanele de lecții sunt prezentate ca funcții în pregătire.

Modulul `prezenta.html` permite gestionarea grupelor și bifarea prezenței. Simbolul ales pentru grupă este comun tuturor copiilor. Datele se păstrează în browser sau în contul profesorului, conform stării afișate.

Designul paginii principale este definit în `atelier.css`, ilustrațiile în `atelier-art.js`, iar comportamentul paginii în `atelier.js` și `app.js`. Previzualizarea unei activități păstrează modificările nesalvate când revii la editor.

## Pornire

Servește acest director printr-un server static HTTP, într-un browser modern. Modulul de prezență folosește module JavaScript și necesită servire HTTP. Previzualizarea de lucru este disponibilă la `http://127.0.0.1:4173/` cât timp serverul local rulează.

Pornire din rădăcina workspace-ului: `node work/serve-preview.cjs`.

Datele locale pot fi copiate în cont prin „Adu în cont datele din acest browser”. Un link partajat conține doar activitatea aleasă și poate fi deschis fără cont; grupele și prezențele nu sunt incluse în link.

Configurare și stare backend: `../../supabase/README.md`. Loginul Google devine disponibil după activarea furnizorului în Supabase; interfața verifică această stare la încărcare.
