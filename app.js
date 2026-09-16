/* BOĞAZ ATLASI v3 — kâğıt atlas etkileşimi */
(function () {
  "use strict";
  var $ = function (s, k) { return (k || document).querySelector(s); };
  var $$ = function (s, k) { return Array.prototype.slice.call((k || document).querySelectorAll(s)); };
  var sakince = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* İmza: canlı X/Y */
  var xy = $("#xy");

  /* Reveal */
  var goz = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("gorunur"); goz.unobserve(e.target); } });
  }, { threshold: 0.12 });
  $$(".reveal, .cerceve").forEach(function (el) { el.classList.add("reveal"); goz.observe(el); });

  function yukle(yol) {
    return fetch(yol).then(function (r) { if (!r.ok) throw new Error(yol); return r.json(); });
  }

  var HARITA, katmanlar = {}, isaretler = [], VERI = { noktalar: [], hat: null };
  var filtre = { aday: true, kontrol: true };
  var tur = { aktif: false, sira: [], idx: 0, zaman: null };

  function ikon(p) {
    var yuksek = p.tur === "aday" && p.sinif === "yuksek/kararli";
    var renk = p.tur === "aday" ? "#141821" : "#5b8fd0";
    var html = yuksek
      ? '<button class="nabiz" aria-label="' + p.ad + '"><svg width="34" height="34" viewBox="0 0 34 34">' +
        '<circle class="halka" cx="17" cy="17" r="8" fill="none" stroke="#e4572e" stroke-width="2"/>' +
        '<circle cx="17" cy="17" r="6" fill="#141821"/></svg></button>'
      : '<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="' +
        renk + '" stroke="#fff" stroke-width="1.5"/></svg>';
    return L.divIcon({ html: html, className: "", iconSize: yuksek ? [34, 34] : [14, 14],
      iconAnchor: yuksek ? [17, 17] : [7, 7] });
  }

  function sayfaAc(p) {
    $("#sayfa-tur").textContent = p.tur === "aday" ? "Tabya adayı · taslak" : "Karşılaştırma alanı";
    $("#sayfa-ad").textContent = p.ad;
    $("#sayfa-koor").textContent = p.lat.toFixed(4) + "° K · " + p.lon.toFixed(4) + "° D";
    var sat = [["fV", p.fV], ["fR", p.fR], ["fS", p.fS], ["U", p.U], ["M2", p.M2]];
    $("#sayfa-olcut").innerHTML = sat.map(function (s) {
      return "<div><dt>" + s[0] + "</dt><dd class=\"" + (s[0] === "U" ? "altin" : "") + "\">" + s[1] + "</dd></div>";
    }).join("");
    $("#sayfa").hidden = false;
  }

  function isaretle() {
    isaretler.forEach(function (m) { HARITA.removeLayer(m); });
    isaretler = [];
    VERI.noktalar.forEach(function (p) {
      if (!filtre[p.tur]) return;
      var m = L.marker([p.lat, p.lon], { icon: ikon(p), keyboard: true, title: p.ad })
        .on("click", function () { turDur(); sayfaAc(p); });
      m._nokta = p;
      m.addTo(HARITA); isaretler.push(m);
    });
  }
  function vurgula(aktif) {
    isaretler.forEach(function (m) {
      var a = aktif && m._nokta === aktif;
      if (m.setOpacity) m.setOpacity(aktif ? (a ? 1 : 0.22) : 1);
    });
  }

  /* Sinematik tur: genel plan → dalışlar, spot halkası, ilerleme şeridi */
  var spot = null, turJeton = 0;
  function turDur() {
    tur.aktif = false;
    turJeton++;
    if (tur.zaman) { clearTimeout(tur.zaman); tur.zaman = null; }
    if (spot) { HARITA.removeLayer(spot); spot = null; }
    vurgula(null);
    $("#tur-bar").hidden = true;
    $("#tur").innerHTML = '<span aria-hidden="true">◉</span> Turu başlat';
  }
  function turBaslat() {
    tur.sira = VERI.noktalar.filter(function (p) { return p.tur === "aday"; });
    if (!tur.sira.length || !HARITA) return;
    tur.aktif = true; tur.idx = 0;
    var jeton = ++turJeton;
    $("#tur").textContent = "Durdur ■";
    $("#tur-bar").hidden = false;
    document.getElementById("harita").scrollIntoView({ behavior: sakince ? "auto" : "smooth" });
    $("#sayfa").hidden = true;
    /* Açılış: genel plan (tam koridor), sonra dalışlar */
    if (VERI.bounds) HARITA.flyToBounds(VERI.bounds, { duration: sakince ? 0 : 1.6 });
    function durak() {
      if (!tur.aktif || jeton !== turJeton) return;
      if (tur.idx >= tur.sira.length) { turDur(); return; }
      var p = tur.sira[tur.idx];
      var zoom = 13;
      $("#tur-etiket").textContent =
        String(tur.idx + 1).padStart(2, "0") + " / " + String(tur.sira.length).padStart(2, "0") + " · " + p.ad;
      if (spot) HARITA.removeLayer(spot);
      spot = L.circle([p.lat, p.lon], { radius: 180, color: "#e4572e", weight: 2,
        fill: false, className: "tur-halka", interactive: false }).addTo(HARITA);
      vurgula(p);
      /* Tam odak: noktaya uç, panel payı kadar piksel kaydır */
      HARITA.flyTo([p.lat, p.lon], zoom, { duration: sakince ? 0 : 2.4 });
      HARITA.once("moveend", function () {
        if (tur.aktif && jeton === turJeton) HARITA.panBy([0, -95], { animate: !sakince });
      });
      sayfaAc(p);
      tur.idx++;
      $("#tur-dolgu").style.width = Math.round(tur.idx / tur.sira.length * 100) + "%";
      tur.zaman = setTimeout(durak, sakince ? 1200 : 4800);
    }
    tur.zaman = setTimeout(durak, sakince ? 400 : 1900);
  }

  function haritaKur(noktalar, koridor, hat, meta) {
    VERI.bounds = L.latLngBounds(meta.bounds);
    HARITA = L.map("map", { zoomControl: false, scrollWheelZoom: true }).setView([40.25, 26.4], 10);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      { attribution: "© OpenStreetMap · © CARTO", subdomains: "abcd", maxZoom: 17 }).addTo(HARITA);
    Object.keys(meta.overlays).forEach(function (k) {
      katmanlar[k] = L.imageOverlay(meta.overlays[k], meta.bounds, { opacity: 0.75 });
    });
    katmanlar.esit.addTo(HARITA);
    /* Işık hattı: boğaz orta çizgisi (white-desert uçuş çizgisi dili) */
    if (hat && hat.features && hat.features.length) {
      var cizgi = L.geoJSON(hat, { style: { color: "#1e48d6", weight: 2.5, opacity: 0.85 },
        onEachFeature: function (_, kat) {
          var el = kat.getElement && kat.getElement();
          if (el) el.style.filter = "drop-shadow(0 0 6px rgba(30,72,214,.8))";
        } }).addTo(HARITA);
    }
    isaretle();
    HARITA.fitBounds(L.latLngBounds(meta.bounds));
    HARITA.on("dragstart", function () { if (tur.aktif) turDur(); });
    HARITA.on("mousemove", function (e) {
      var x = Math.round(e.latlng.lng * 100), y = Math.round(e.latlng.lat * 100);
      xy.innerHTML = "X " + x + ".00<br>Y " + y + ".00";
      $("#koordinat").textContent = e.latlng.lat.toFixed(4) + "° K · " + e.latlng.lng.toFixed(4) + "° D";
    });
    $$("[data-katman]").forEach(function (b) {
      b.addEventListener("click", function () {
        $$("[data-katman]").forEach(function (x) { x.classList.remove("secili"); });
        b.classList.add("secili");
        Object.keys(katmanlar).forEach(function (k) { HARITA.removeLayer(katmanlar[k]); });
        var sec = katmanlar[b.getAttribute("data-katman")];
        sec.setOpacity(0); sec.addTo(HARITA);
        if (sakince) { sec.setOpacity(0.75); return; }
        var t0 = null;
        (function gecis(t) {
          if (!t0) t0 = t;
          var o = Math.min((t - t0) / 450, 1) * 0.75; sec.setOpacity(o);
          if (o < 0.75) requestAnimationFrame(gecis);
        })(performance.now());
      });
    });
    $$("[data-filtre]").forEach(function (b) {
      b.addEventListener("click", function () {
        var f = b.getAttribute("data-filtre");
        filtre[f] = !filtre[f];
        b.classList.toggle("secili", filtre[f]);
        b.setAttribute("aria-pressed", String(filtre[f]));
        isaretle();
      });
    });
    $("#tur").addEventListener("click", function () { tur.aktif ? turDur() : turBaslat(); });
    $("#sayfa-kapat").addEventListener("click", function () { $("#sayfa").hidden = true; turDur(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { $("#sayfa").hidden = true; turDur(); } });
  }

  function oneCikan(noktalar) {
    var s = noktalar.filter(function (n) { return n.tur === "aday"; })
      .sort(function (a, b) { return b.U - a.U; }).slice(0, 5);
    var maks = s.length ? s[0].U : 1;
    $("#one-cikan").innerHTML = s.map(function (n) {
      return '<div class="one-satir"><b>' + n.id + '</b><span class="bar" style="width:' +
        Math.round(n.U / maks * 100) + '%"></span><span>' + n.U.toFixed(3) + "</span></div>";
    }).join("");
  }

  function cubuklar(meta) {
    var veri = [["Yalnız-görüş", meta.h1v.fark], ["M1 · üç ölçüt", meta.h1.fark]];
    var maks = Math.max.apply(null, veri.map(function (v) { return Math.abs(v[1]); }).concat([0.001]));
    $("#cubuk-h1").innerHTML = veri.map(function (v) {
      return '<div class="cubuk"><span>' + v[0] + '</span><span class="bar" style="width:' +
        Math.round(Math.abs(v[1]) / maks * 100) + '%"></span><span class="deg">' +
        (v[1] >= 0 ? "+" : "") + v[1].toFixed(4) + "</span></div>";
    }).join("") + '<p class="mono" style="font-size:.74rem;color:var(--soluk)">n=' + meta.h1.nt +
      " vs " + meta.h1.nk + " · p=" + meta.h1.p + "</p>";
  }

  function sacilim(noktalar) {
    var W = 560, H = 340, p = 42;
    function x(v) { return p + Math.min(v / 0.5, 1) * (W - 2 * p); }
    function y(v) { return H - p - v * (H - 2 * p); }
    var el = noktalar.map(function (n) {
      return '<circle cx="' + x(n.fV).toFixed(1) + '" cy="' + y(n.U).toFixed(1) + '" r="' +
        (n.tur === "aday" ? 7 : 4) + '" fill="' + (n.tur === "aday" ? "#141821" : "#5b8fd0") +
        '" opacity="0.9"><title>' + n.ad + " U=" + n.U + "</title></circle>";
    }).join("");
    $("#sacilim").innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="presentation">' +
      '<line x1="' + p + '" y1="' + (H - p) + '" x2="' + (W - 14) + '" y2="' + (H - p) + '" stroke="#141821"/>' +
      '<line x1="' + p + '" y1="' + (H - p) + '" x2="' + p + '" y2="12" stroke="#141821"/>' + el + "</svg>";
  }

  function matris(noktalar) {
    var s = { "yuksek/kararli": [], "yuksek/degisken": [], "dusuk/kararli": [], "dusuk/degisken": [] };
    noktalar.forEach(function (n) { if (n.tur === "aday" && n.sinif && s[n.sinif]) s[n.sinif].push(n.id); });
    $("#m-yk").textContent = s["yuksek/kararli"].join(" · ") || "—";
    $("#m-yd").textContent = s["yuksek/degisken"].join(" · ") || "—";
    $("#m-dk").textContent = s["dusuk/kararli"].join(" · ") || "—";
    $("#m-dd").textContent = s["dusuk/degisken"].join(" · ") || "—";
  }

  function ayrismaKur(veri) {
    var maks = Math.max.apply(null, veri.map(function (v) { return Math.abs(v.delta); }).concat([0.05]));
    $("#cubuk-ayrisma").innerHTML = veri.map(function (v) {
      return '<div class="cubuk"><span>' + v.ad + '</span><span class="bar" style="width:' +
        Math.round(Math.abs(v.delta) / maks * 100) + '%"></span><span class="deg">' +
        (v.delta >= 0 ? "+" : "") + v.delta.toFixed(2) + "</span></div>";
    }).join("");
    $("#cumleler").innerHTML = veri.map(function (v) {
      return "<li><b>" + v.ad + ":</b> " + v.yorum + "</li>";
    }).join("");
  }

  function tabloKur(noktalar) {
    var s = noktalar.slice().sort(function (a, b) { return b.U - a.U; });
    $("#tablo-govde").innerHTML = s.map(function (n) {
      return "<tr data-id=\"" + n.id + "\"><td class=\"mono\">" + n.id + "</td><td class=\"" +
        (n.tur === "aday" ? "aday" : "") + "\">" + n.ad + "</td><td>" + n.fV + "</td><td>" +
        n.fR + "</td><td>" + n.fS + "</td><td><b>" + n.U + "</b></td></tr>";
    }).join("");
    $$("#tablo-govde tr").forEach(function (tr) {
      tr.addEventListener("click", function () {
        var p = noktalar.filter(function (n) { return n.id === tr.getAttribute("data-id"); })[0];
        if (p) {
          document.getElementById("harita").scrollIntoView({ behavior: sakince ? "auto" : "smooth" });
          HARITA.flyTo([p.lat, p.lon], 12, { duration: sakince ? 0 : 1.2 });
          sayfaAc(p);
        }
      });
    });
    $("#csv-indir").addEventListener("click", function () {
      var csv = "id,ad,tur,lon,lat,fV,fR,fS,U,M2\n" + s.map(function (n) {
        return [n.id, '"' + n.ad + '"', n.tur, n.lon, n.lat, n.fV, n.fR, n.fS, n.U, n.M2].join(",");
      }).join("\n");
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = "bogaz_atlasi_noktalar.csv"; a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });
  }

  Promise.all([yukle("data/noktalar.json"), yukle("data/koridor.json"),
               yukle("data/hat.json"), yukle("data/meta.json"), yukle("data/ayrisma.json")])
    .then(function (v) {
      VERI.noktalar = v[0];
      haritaKur(v[0], v[1], v[2], v[3]);
      oneCikan(v[0]); cubuklar(v[3]); sacilim(v[0]); matris(v[0]); ayrismaKur(v[4]); tabloKur(v[0]);
    })
    .catch(function () {
      $("#map").innerHTML = '<p style="padding:100px 6vw">Veri yüklenemedi. Sunucuyla açın: ' +
        '<span class="mono">python -m http.server</span></p>';
    });
})();
