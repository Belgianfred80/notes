/* ==========================================================================
   MODULE NOTES — affiche les notes partagées stockées sur GitHub
   --------------------------------------------------------------------------
   Intégration dans une page HTML (2 lignes) :

     <div data-notes-module data-editor="notes-editor.html"></div>
     <script src="https://VOTRE_UTILISATEUR.github.io/notes/notes-module.js"></script>

   Attributs possibles sur le bloc :
     data-editor  : lien de la page d'édition (si absent, pas de bouton "Édition")
     data-title   : titre du panneau (par défaut "Notes partagées")
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
    ".gn-panel{box-sizing:border-box;height:100%;display:flex;flex-direction:column;",
    "background:#e3e6ea;border:1px solid #c5cad0;border-radius:10px;padding:10px 12px;",
    "font-family:Arial,Helvetica,sans-serif;color:#222}",
    ".gn-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}",
    ".gn-title{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#555}",
    ".gn-btns{display:flex;gap:5px}",
    ".gn-btn{display:inline-block;font:700 10px/1 Arial,Helvetica,sans-serif;padding:5px 9px;",
    "border-radius:6px;color:#fff;text-decoration:none;text-transform:uppercase;cursor:pointer;",
    "border:1px solid rgba(0,0,0,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 1px 2px rgba(0,0,0,.25)}",
    ".gn-btn:hover{filter:brightness(1.12)}",
    ".gn-btn-github{background:#3a3f45}",
    ".gn-btn-edit{background:#2e8b1e}",
    ".gn-box{flex:1;min-height:40px;overflow:auto;background:#fff;border:1px solid #c5cad0;",
    "border-radius:8px;padding:8px 12px}",
    ".gn-list{list-style:none;margin:0;padding:0}",
    ".gn-list li{font-size:13px;line-height:1.45;margin:3px 0;padding-left:12px;position:relative;",
    "white-space:pre-wrap;word-wrap:break-word}",
    ".gn-list li::before{content:'-';position:absolute;left:0}",
    ".gn-list a{color:#1565c0}",
    ".gn-empty{font-size:12px;color:#888;font-style:italic}",
    ".gn-status{font-size:10px;color:#a33;margin-top:5px;min-height:0}",
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
    var title = el.getAttribute("data-title") || "Notes partagées";
    var editor = el.getAttribute("data-editor");
    var btns = '<a class="gn-btn gn-btn-github" href="' + REPO_URL + '" target="_blank" rel="noopener">GitHub</a>';
    if (editor) {
      btns += '<a class="gn-btn gn-btn-edit" href="' + escapeHtml(editor) + '" target="_blank" rel="noopener">Édition</a>';
    }
    el.innerHTML =
      '<div class="gn-panel">' +
        '<div class="gn-head"><span class="gn-title">' + escapeHtml(title) + '</span>' +
        '<span class="gn-btns">' + btns + '</span></div>' +
        '<div class="gn-box"><ul class="gn-list"><li class="gn-empty">Chargement…</li></ul></div>' +
        '<div class="gn-status"></div>' +
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
          el.querySelector(".gn-status").textContent = "Mise à jour des notes impossible pour le moment.";
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
