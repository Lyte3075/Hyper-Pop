const titles = [
  {
    id: "the-pot",
    title: "The Pot",
    japanese: "線畫 つぼ · Senga Tsubo",
    year: "1925",
    creator: "Sanae Yamamoto",
    duration: "17 MIN",
    description: "A young fisherman outwits a demon trapped inside a mysterious pot. A landmark early Japanese animated film, presented by the National Film Archive of Japan.",
    embed: "https://h10.cs.nii.ac.jp/view/video_view.php?fileName=5231_jp",
    official: "https://animation.filmarchives.jp/en/works/view/5231",
    note: "Official stream from the National Film Archive of Japan. Silent film with English-subtitled archive presentation."
  },
  {
    id: "arichan-the-ant",
    title: "Arichan the Ant",
    japanese: "アリチャン · Arichan",
    year: "1941",
    creator: "Mitsuyo Seo",
    duration: "11 MIN",
    description: "A little ant finds a violin in a sandbox and discovers how much it means to its owner. A preserved short from Japan's National Film Archive.",
    embed: "https://h10.cs.nii.ac.jp/view/video_view.php?fileName=5148_jp",
    official: "https://animation.filmarchives.jp/en/works/view/5148",
    note: "Official stream from the National Film Archive of Japan. The film is also identified as public domain on Wikimedia Commons."
  }
];

const catalog = document.getElementById("catalog");
const search = document.getElementById("search");
const count = document.getElementById("count");
const watch = document.getElementById("watch");
const stream = document.getElementById("stream");
const watchTitle = document.getElementById("watch-title");
const watchMeta = document.getElementById("watch-meta");
const watchNote = document.getElementById("watch-note");
const sourceLink = document.getElementById("source-link");

function render(list) {
  count.textContent = `${list.length} TITLE${list.length === 1 ? "" : "S"}`;
  catalog.replaceChildren();
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No titles match that search yet.";
    catalog.append(empty);
    return;
  }
  list.forEach(item => {
    const card = document.createElement("article");
    card.className = "anime-card";
    const poster = document.createElement("div");
    poster.className = "poster";
    const year = document.createElement("span");
    year.className = "year";
    year.textContent = `ARCHIVE ANIMATION · ${item.year}`;
    poster.append(year);
    const body = document.createElement("div");
    body.className = "card-body";
    const title = document.createElement("h3");
    title.textContent = item.title;
    const creator = document.createElement("p");
    creator.className = "creator";
    creator.textContent = item.creator;
    const desc = document.createElement("p");
    desc.className = "desc";
    desc.textContent = item.description;
    const bottom = document.createElement("div");
    bottom.className = "card-bottom";
    const duration = document.createElement("span");
    duration.className = "duration";
    duration.textContent = item.duration;
    const button = document.createElement("button");
    button.className = "play-button";
    button.type = "button";
    button.textContent = "▶ Watch";
    button.addEventListener("click", () => play(item));
    bottom.append(duration, button);
    body.append(title, creator, desc, bottom);
    card.append(poster, body);
    catalog.append(card);
  });
}

function play(item) {
  watchTitle.textContent = item.title;
  watchMeta.textContent = `${item.japanese} · ${item.year} · ${item.creator} · ${item.duration}`;
  watchNote.textContent = item.note;
  sourceLink.href = item.official;
  stream.src = item.embed;
  watch.hidden = false;
  catalog.hidden = true;
  document.querySelector(".section-head").hidden = true;
  watch.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState({}, "", `#watch-${item.id}`);
}

function backToCatalog() {
  stream.src = "";
  watch.hidden = true;
  catalog.hidden = false;
  document.querySelector(".section-head").hidden = false;
  history.replaceState({}, "", location.pathname);
}

document.getElementById("back").addEventListener("click", backToCatalog);
search.addEventListener("input", () => {
  const q = search.value.trim().toLocaleLowerCase();
  render(titles.filter(item => [item.title, item.japanese, item.creator, item.year].some(value => value.toLocaleLowerCase().includes(q))));
});

render(titles);
