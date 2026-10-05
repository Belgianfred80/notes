/* ==========================================================================
   MODULE NOTES \u2014 affiche les notes partag\u00e9es stock\u00e9es sur GitHub
   --------------------------------------------------------------------------
   Int\u00e9gration dans une page HTML (2 lignes) :

     <div data-notes-module data-editor="notes-editor.html"></div>
     <script src="https://Belgianfred80.github.io/notes/notes-module.js"></script>

   Attributs possibles sur le bloc :
     data-editor  : lien de la page d'\u00e9dition (si absent, pas de bouton "\u00c9dition")
   ========================================================================== */
(function () {
  "use strict";

  // ===== CONFIGURATION ======================================================
  var CONFIG = {
    owner: "Belgianfred80",   // nom d'utilisateur GitHub
    repo: "notes",                // nom du dépôt
    branch: "main",               // branche
    path: "notes.json",           // fichier des notes
    refreshMinutes: 3             // relecture automatique (en minutes)
  };
  // ==========================================================================

  var API_URL = "https://api.github.com/repos/" + CONFIG.owner + "/" + CONFIG.repo +
                "/contents/" + CONFIG.path + "?ref=" + CONFIG.branch;
  var RAW_URL = "https://raw.githubusercontent.com/" + CONFIG.owner + "/" + CONFIG.repo +
                "/" + CONFIG.branch + "/" + CONFIG.path;
  var REPO_URL = "https://github.com/" + CONFIG.owner + "/" + CONFIG.repo;

  var CSS = [
    ".gn-panel{box-sizing:border-box;height:100%;font-family:Arial,Helvetica,sans-serif;color:#222}",
    ".gn-box{box-sizing:border-box;height:100%;overflow:auto;background:#fff;border:1px solid #c5cad0;",
    "border-radius:8px;padding:8px 12px}",
    ".gn-btns{float:right;display:flex;gap:5px;margin:0 0 6px 10px}",
    ".gn-panel a.gn-btn,.gn-panel a.gn-btn:link,.gn-panel a.gn-btn:visited,.gn-panel a.gn-btn:hover{",
    "display:inline-block;font:700 10px/1 Arial,Helvetica,sans-serif;padding:5px 9px;",
    "border-radius:6px;color:#fff !important;text-decoration:none !important;text-transform:uppercase;cursor:pointer;",
    "border:1px solid rgba(0,0,0,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 1px 2px rgba(0,0,0,.25)}",
    ".gn-panel a.gn-btn:hover{filter:brightness(1.12)}",
    ".gn-panel a.gn-btn-github{background:#3a3f45 !important}",
    ".gn-panel a.gn-btn-edit{background:#2e8b1e !important}",
    ".gn-list{list-style:none;margin:0;padding:0}",
    ".gn-list li{font-size:13px;line-height:1.4;margin:3px 0;padding-left:12px;position:relative;",
    "white-space:pre-wrap;word-wrap:break-word}",
    ".gn-list li::before{content:'-';position:absolute;left:0}",
    ".gn-list a{color:#1565c0}",
    ".gn-empty{font-size:12px;color:#888;font-style:italic}",
    ".gn-status{font-size:11px;color:#a33;margin-top:5px}",
    ".gn-status:empty{display:none}"
  ].join("");

  function injectCss() {
    if (document.getElementById("gn-style")) return;
    var s = document.createElement("style");
    s.id = "gn-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function escapeHtml(t) {
    return String(t)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function linkify(html) {
    return html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  // Lecture via l'API GitHub (immédiat) ; si la limite de l'API est atteinte,
  // lecture via le lien direct du fichier (quelques minutes de retard).
  function loadNotes() {
    return fetch(API_URL, {
      headers: { "Accept": "application/vnd.github.raw+json" },
      cache: "no-store"
    })
      .then(function (r) {
        if (!r.ok) throw new Error("API " + r.status);
        return r.json();
      })
      .catch(function () {
        return fetch(RAW_URL + "?t=" + Date.now(), { cache: "no-store" })
          .then(function (r) {
            if (!r.ok) throw new Error("RAW " + r.status);
            return r.json();
          });
      })
      .then(function (data) {
        return (data && Array.isArray(data.notes)) ? data.notes : [];
      });
  }

  function buildPanel(el) {
    var editor = el.getAttribute("data-editor");
    var btns = '<a class="gn-btn gn-btn-github" href="' + REPO_URL + '" target="_blank" rel="noopener">GitHub</a>';
    if (editor) {
      btns += '<a class="gn-btn gn-btn-edit" href="' + escapeHtml(editor) + '" target="_blank" rel="noopener">\u00c9dition</a>';
    }
    el.innerHTML =
      '<div class="gn-panel">' +
        '<div class="gn-box">' +
          '<span class="gn-btns">' + btns + '</span>' +
          '<ul class="gn-list"><li class="gn-empty">Chargement\u2026</li></ul>' +
          '<div class="gn-status"></div>' +
        '</div>' +
      '</div>';
  }

  function render(el, notes) {
    var list = el.querySelector(".gn-list");
    if (!notes.length) {
      list.innerHTML = '<li class="gn-empty">Aucune note pour le moment.</li>';
      return;
    }
    list.innerHTML = notes.map(function (n) {
      return "<li>" + linkify(escapeHtml(n.text || "")) + "</li>";
    }).join("");
  }

  function refresh(els) {
    loadNotes()
      .then(function (notes) {
        els.forEach(function (el) {
          render(el, notes);
          el.querySelector(".gn-status").textContent = "";
        });
      })
      .catch(function () {
        els.forEach(function (el) {
          el.querySelector(".gn-status").textContent = "Mise \u00e0 jour des notes impossible pour le moment.";
        });
      });
  }

  function init() {
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-notes-module]"));
    if (!els.length) return;
    injectCss();
    els.forEach(buildPanel);
    refresh(els);
    setInterval(function () { refresh(els); }, CONFIG.refreshMinutes * 60 * 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
