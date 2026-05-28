const map = L.map("map");

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap"
}).addTo(map);

const markerCluster = L.markerClusterGroup();
map.addLayer(markerCluster);

const kategoriefarben = {
  "Gemeindepsychiatrie": "violet",
  "Gesundheitshilfen/ambulante Pflege": "blue",
  "Kinder- und Jugendhilfe": "green",
  "Migration und Flucht": "orange",
  "Sozialräumliche Angebote": "yellow",
  "Hilfen für Menschen mit Behinderung": "grey",
  "Integration in Arbeit und Ausbildung": "black",
  "Beratungsdienste/Armutsprävention": "red",
  "Wohnungslosenhilfe": "green",
  "Frühförderung": "violet"
};

let alleEinrichtungen = [];
let markerListe = [];
let aktiveKategorie = "Alle";

const searchInput = document.getElementById("searchInput");
const categoryButtons = document.getElementById("categoryButtons");
const einrichtungenListe = document.getElementById("einrichtungenListe");

Papa.parse("einrichtungen_karte_basis.csv", {
  download: true,
  header: true,
  delimiter: ";",
  encoding: "UTF-8",
  skipEmptyLines: true,

  complete: function (results) {
    alleEinrichtungen = results.data
      .filter(e => e.Name && e.Lat && e.Long)
      .map(e => ({
        name: e.Name.trim(),
        kategorie: e.Kategorie ? e.Kategorie.trim() : "Sonstige",
        lat: parseFloat(String(e.Lat).replace(",", ".")),
        lng: parseFloat(String(e.Long).replace(",", ".")),
        adresse: e.Adresse || "",
        telefon: e.Telefon || "",
        webseite: e.Webseite || "",
        beschreibung: e.Kurzbeschreibung || ""
      }));

    erstelleKategorieButtons();
    zeigeEinrichtungen(alleEinrichtungen);
    erstelleLegende();
  }
});

function erstelleKategorieButtons() {
  categoryButtons.innerHTML = "";

  const kategorien = [
    "Alle",
    ...new Set(alleEinrichtungen.map(e => e.kategorie))
  ];

  kategorien.forEach(kategorie => {
    const button = document.createElement("button");
    button.textContent = kategorie;

    if (kategorie === "Alle") {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      aktiveKategorie = kategorie;

      document
        .querySelectorAll("#categoryButtons button")
        .forEach(btn => btn.classList.remove("active"));

      button.classList.add("active");
      filterUndSuche();
    });

    categoryButtons.appendChild(button);
  });
}

function zeigeEinrichtungen(einrichtungen) {
  markerCluster.clearLayers();
  markerListe = [];

  const bounds = [];

  einrichtungen.forEach(e => {
    const farbe = kategoriefarben[e.kategorie] || "blue";

    const icon = L.icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${farbe}.png`,
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    });

    const marker = L.marker([e.lat, e.lng], { icon: icon })
      .bindPopup(`
        <div class="popup-content">
          <h3>${e.name}</h3>

          <p class="popup-category">${e.kategorie}</p>

          <p>${e.adresse}</p>

          ${e.telefon ? `<p>☎ ${e.telefon}</p>` : ""}

          ${e.beschreibung ? `<p>${e.beschreibung}</p>` : ""}

          ${e.webseite ? `
            <a href="${e.webseite}" target="_blank" rel="noopener">
              Zur Webseite
            </a>
          ` : ""}

          <br><br>

          <a href="https://www.openstreetmap.org/directions?to=${e.lat},${e.lng}"
             target="_blank"
             rel="noopener">
             Route planen
          </a>
        </div>
      `);

    markerCluster.addLayer(marker);
    markerListe.push({ marker, daten: e });
    bounds.push([e.lat, e.lng]);
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, {
      padding: [30, 30]
    });
  } else {
    map.setView([49.756, 6.641], 11);
  }

  zeigeListe(einrichtungen);
}

function zeigeListe(einrichtungen) {
  einrichtungenListe.innerHTML = "";

  if (einrichtungen.length === 0) {
    einrichtungenListe.innerHTML = `
      <div class="listeneintrag">
        Keine Einrichtungen gefunden.
      </div>
    `;
    return;
  }

  einrichtungen.forEach(e => {
    const farbe = kategoriefarben[e.kategorie] || "blue";

    const div = document.createElement("div");
    div.className = "listeneintrag";

    div.innerHTML = `
      <h3>${e.name}</h3>

      <span class="listen-kategorie" style="background:${farbe}">
        ${e.kategorie}
      </span>

      <div class="listen-adresse">
        ${e.adresse}
      </div>

      ${e.telefon ? `<div>☎ ${e.telefon}</div>` : ""}

      ${e.beschreibung ? `<p>${e.beschreibung}</p>` : ""}

      ${e.webseite ? `
        <a class="listen-link"
           href="${e.webseite}"
           target="_blank"
           rel="noopener">
           Zur Webseite
        </a>
      ` : ""}
    `;

    div.addEventListener("click", () => {
      map.setView([e.lat, e.lng], 16);

      const passenderMarker = markerListe.find(item =>
        item.daten.name === e.name &&
        item.daten.lat === e.lat &&
        item.daten.lng === e.lng
      );

      if (passenderMarker) {
        markerCluster.zoomToShowLayer(passenderMarker.marker, () => {
          passenderMarker.marker.openPopup();
        });
      }

      document.getElementById("map").scrollIntoView({
        behavior: "smooth"
      });
    });

    einrichtungenListe.appendChild(div);
  });
}

function filterUndSuche() {
  const suchbegriff = searchInput.value.toLowerCase();

  const gefiltert = alleEinrichtungen.filter(e => {
    const passtZurKategorie =
      aktiveKategorie === "Alle" || e.kategorie === aktiveKategorie;

    const suchText = `
      ${e.name}
      ${e.kategorie}
      ${e.adresse}
      ${e.telefon}
      ${e.beschreibung}
    `.toLowerCase();

    return passtZurKategorie && suchText.includes(suchbegriff);
  });

  zeigeEinrichtungen(gefiltert);
}

searchInput.addEventListener("input", filterUndSuche);

function erstelleLegende() {
  const legend = L.control({
    position: "bottomright"
  });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "info legend");

    div.innerHTML = "<h4>Kategorien</h4>";

    for (const kategorie in kategoriefarben) {
      div.innerHTML += `
        <div class="legend-row">
          <span class="legend-color" style="background:${kategoriefarben[kategorie]};"></span>
          <span>${kategorie}</span>
        </div>
      `;
    }

    return div;
  };

  legend.addTo(map);
}