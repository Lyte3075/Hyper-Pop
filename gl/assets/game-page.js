
(function(){
  "use strict";

  const qs = (s, root=document) => root.querySelector(s);
  const playButton = qs("#playButton");
  const gameFrame = qs("#gameFrame");
  const startScreen = qs("#startScreen");
  const favoriteButton = qs("#favoriteButton");
  const newTabButton = qs("#newTabButton");
  const fullscreenButton = qs("#fullscreenButton");
  const relatedGrid = qs("#relatedGrid");
  const player = qs("#player") || qs(".player-card") || gameFrame;
  const currentSlug = decodeURIComponent(location.pathname.split("/").pop() || "").replace(/\.html$/i,"");

  const escapeHTML = (value="") => String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));

  const categoryName = c => ({
    action:"Action & Adventure",
    strategy:"Strategy & Puzzle",
    casual:"Casual & Arcade",
    driving:"Driving & Sports"
  }[c] || c || "Browser Game");

  const popularity = v => {
    const text = String(v || "0");
    const n = Number(text.replace(/[^0-9.]/g,"")) || 0;
    return n * (text.includes("B") ? 1e9 : text.includes("M") ? 1e6 : text.includes("K") ? 1e3 : 1);
  };

  const imageURL = g => g.localThumb || String(g.link || "") + String(g.thumb || "");

  function loadGame(){
    if(!gameFrame) return;
    const url = gameFrame.dataset.src;
    if(url && (!gameFrame.getAttribute("src") || gameFrame.getAttribute("src")==="about:blank")){
      gameFrame.setAttribute("src", url);
    }
    gameFrame.style.display = "block";
    gameFrame.removeAttribute("hidden");
    if(startScreen){
      startScreen.style.display = "none";
      startScreen.setAttribute("aria-hidden","true");
    }
  }

  if(playButton){
    playButton.removeAttribute("onclick");
    playButton.addEventListener("click", function(e){
      e.preventDefault();
      loadGame();
    });
  }

  function readFavorites(){
    try{
      const x = JSON.parse(localStorage.getItem("nova-favorites") || "[]");
      return Array.isArray(x) ? x.map(String) : [];
    }catch(e){ return []; }
  }

  function updateFavorite(id){
    if(!favoriteButton || id == null) return;
    const sid = String(id);
    const list = readFavorites();
    const active = list.includes(sid);
    favoriteButton.textContent = (active ? "★ " : "☆ ") + "Favorite";
    favoriteButton.setAttribute("aria-pressed", active ? "true" : "false");
  }

  function toggleFavorite(id){
    if(id == null) return;
    const sid = String(id);
    let list = readFavorites();
    list = list.includes(sid) ? list.filter(x => x !== sid) : [sid, ...list];
    localStorage.setItem("nova-favorites", JSON.stringify(list));
    updateFavorite(id);
  }

  function rememberRecent(id){
    if(id == null) return;
    let list = [];
    try{
      const x = JSON.parse(localStorage.getItem("nova-recents") || "[]");
      list = Array.isArray(x) ? x.map(String) : [];
    }catch(e){}
    const sid = String(id);
    list = [sid, ...list.filter(x => x !== sid)].slice(0,24);
    localStorage.setItem("nova-recents", JSON.stringify(list));
  }

  if(newTabButton){
    newTabButton.removeAttribute("onclick");
    newTabButton.addEventListener("click", function(e){
      e.preventDefault();
      const url = gameFrame && gameFrame.dataset.src;
      if(!url) return;
      const w = window.open("about:blank","_blank");
      if(!w) return;
      w.document.open();
      w.document.write(
        '<!doctype html><html><head><meta charset="utf-8">'+
        '<meta name="viewport" content="width=device-width,initial-scale=1">'+
        '<title>Game</title><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;background:#000;overflow:hidden}iframe{display:block}</style>'+
        '</head><body><iframe allow="autoplay; fullscreen; gamepad; clipboard-read; clipboard-write" allowfullscreen src="'+escapeHTML(url)+'"></iframe></body></html>'
      );
      w.document.close();
    });
  }

  if(fullscreenButton){
    fullscreenButton.removeAttribute("onclick");
    fullscreenButton.addEventListener("click", function(e){
      e.preventDefault();
      const target = qs("#player") || qs(".player-card") || gameFrame;
      if(document.fullscreenElement){
        document.exitFullscreen().catch(()=>{});
      }else if(target && target.requestFullscreen){
        target.requestFullscreen().catch(()=>{});
      }
    });
  }

  fetch("../data/games.json", {cache:"no-store"})
    .then(r => {
      if(!r.ok) throw new Error("games.json could not be loaded");
      return r.json();
    })
    .then(data => {
      const games = Array.isArray(data.games) ? data.games : [];
      const current = games.find(g => g.slug === currentSlug);

      if(current){
        rememberRecent(current.id);
        updateFavorite(current.id);
        if(favoriteButton){
          favoriteButton.removeAttribute("onclick");
          favoriteButton.addEventListener("click", e => {
            e.preventDefault();
            toggleFavorite(current.id);
          });
        }
      }

      if(relatedGrid){
        const items = [...games]
          .filter(g => g.slug !== currentSlug)
          .sort((a,b) => popularity(b.popularity) - popularity(a.popularity))
          .slice(0,24);

        relatedGrid.innerHTML = items.map(g => `
          <article class="game-card">
            <a href="${encodeURIComponent(g.slug)}.html">
              <div class="cover-wrap">
                <img class="cover"
                     src="${escapeHTML(imageURL(g))}"
                     alt="${escapeHTML(g.name)}"
                     width="320" height="320"
                     loading="lazy" decoding="async"
                     onerror="this.src='../assets/logo.svg'">
              </div>
              <div class="card-text">
                <strong>${escapeHTML(g.name)}</strong>
                <span>${escapeHTML(categoryName(g.category))}</span>
              </div>
            </a>
          </article>
        `).join("");
      }
    })
    .catch(err => {
      console.error(err);
      if(relatedGrid){
        relatedGrid.innerHTML = '<p class="related-error">Popular games could not be loaded.</p>';
      }
    });
})();
