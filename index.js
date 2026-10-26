const searchForm = document.querySelector("#search-form");

const wordInput = document.querySelector("#word-input");
const searchButton = document.querySelector("#search-button");
const results = document.querySelector("#results");
const statusMessage = document.querySelector("#status-message");
const favoritesList = document.querySelector("#favorites-list");
const themeToggle = document.querySelector("#theme-toggle");

//Your existing functions continue below

console.log("Wordly index.js is running");

const API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';



console.log("searchForm:", searchForm);


let currententry = null;
let favorites = loadfavorites();

function loadfavorites() {
    try {
        const saved = JSON.parse(localStorage.getItem('wwordly-favorites'));
        return Array.isArray(saved) ? saved.filter(
            word => typeof word === "string"
        ) : [];
        } catch {
            return [];
        }


        }

function saveFavorites() {
  try {
    localStorage.setItem("wordly-favorites", JSON.stringify(favorites));
    renderFavorites();
  } catch {
    statusMessage.textContent =
      "Unable to save favorites in this browser.";
  }
}

function createElement(tag, className, text = "") {
  const element = document.createElement(tag);

  if (className) element.className = className;
  element.textContent = text;

  return element;
}

function getPronunciation(entry) {
  const phonetic = entry.phonetics?.find(item => item.text)?.text;
  return phonetic || "Pronunciation unavailable";
}

function getAudio(entry) {
  const audio = entry.phonetics?.find(item => item.audio)?.audio;
  return audio || "";
}

console.log("Attaching submit handler now");

console.log("searchForm:", searchForm);

searchForm.addEventListener("submit", async (event) => {
    console.log("SUBMIT EVENT FIRED");
  event.preventDefault();
  console.log("Form submitted - default prevented");

  // keep the rest of your existing code here

  const word = wordInput.value.trim();

  if (!word) {
    statusMessage.textContent = "Please enter a word to search.";
    wordInput.focus();
    return;
  }

  if (!/^[a-zA-Z]+(?:[-'][a-zA-Z]+)*$/.test(word)) {
    statusMessage.textContent =
      "Please enter a valid English word.";
    return;
  }

  searchButton.disabled = true;
  searchButton.textContent = "Searching...";
  statusMessage.textContent = "Looking up your word...";
  results.replaceChildren();

  try {
    const response = await fetch(
      API_URL + encodeURIComponent(word.toLowerCase())
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Word not found. Try another word.");
      }

      throw new Error("Unable to contact the dictionary. Try again.");
    }

    const data = await response.json();

    if (!Array.isArray(data) || !data.length) {
      throw new Error("No dictionary results were found.");
    }

    currentEntry = data[0];
    renderWord(currentEntry);
    statusMessage.textContent = `Results for "${currentEntry.word}".`;
  } catch (error) {
    currentEntry = null;
    showError(error.message || "Something went wrong. Please try again.");
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = "Search";
  }
});

function showError(message) {
  const card = createElement("div", "word-card");
  const heading = createElement("h2", "", "Unable to find your word");
  const paragraph = createElement("p", "", message);

  card.append(heading, paragraph);
  results.replaceChildren(card);
  statusMessage.textContent = message;
}

function renderWord(entry) {
  const card = createElement("article", "word-card");
  const heading = createElement("div", "word-heading");
  const wordInfo = createElement("div");
  const title = createElement("h2", "", entry.word);
  const phonetic = createElement("p", "phonetic", getPronunciation(entry));
  const actions = createElement("div", "word-actions");

  const audioUrl = getAudio(entry);

  if (audioUrl) {
    const audioButton = createElement("button", "action-button", "▶ Play audio");
    audioButton.type = "button";
    audioButton.setAttribute("aria-label", `Play pronunciation of ${entry.word}`);

    audioButton.addEventListener("click", async () => {
      try {
        const audio = new Audio(audioUrl);
        await audio.play();
      } catch {
        statusMessage.textContent = "Audio playback is unavailable.";
      }
    });

    actions.append(audioButton);
  }

  const isSaved = favorites.some(
    word => word.toLowerCase() === entry.word.toLowerCase()
  );

  const saveButton = createElement(
    "button",
    `save-button${isSaved ? " saved" : ""}`,
    isSaved ? "♥ Saved" : "♡ Save word"
  );

  saveButton.type = "button";
  saveButton.setAttribute(
    "aria-pressed",
    String(isSaved)
  );

  saveButton.addEventListener("click", () => {
    const index = favorites.findIndex(
      word => word.toLowerCase() === entry.word.toLowerCase()
    );

    if (index >= 0) {
      favorites.splice(index, 1);
    } else {
      favorites.push(entry.word);
    }

    saveFavorites();
    renderWord(entry);
  });

  actions.append(saveButton);
  wordInfo.append(title, phonetic);
  heading.append(wordInfo, actions);
  card.append(heading);

  const meanings = entry.meanings || [];

  meanings.forEach(meaning => {
    card.append(
      createElement("p", "part-of-speech", meaning.partOfSpeech || "Meaning")
    );

    const definitionList = createElement("ol", "definition");

    (meaning.definitions || []).forEach(item => {
      const listItem = createElement("li");
      listItem.append(
        createElement("p", "", item.definition || "Definition unavailable.")
      );

      if (item.example) {
        listItem.append(
          createElement("p", "example", `Example: "${item.example}"`)
        );
      }

      definitionList.append(listItem);
    });

    card.append(definitionList);

    const synonyms = [
      ...(meaning.synonyms || []),
      ...(meaning.definitions || []).flatMap(
        item => item.synonyms || []
      )
    ];

    const uniqueSynonyms = [...new Set(synonyms)];

    const synonymSection = createElement("div");
    synonymSection.append(
      createElement("h4", "", "Synonyms")
    );

    if (uniqueSynonyms.length) {
      const synonymList = createElement("div", "synonyms");

      uniqueSynonyms.forEach(synonym => {
        const button = createElement("button", "synonym", synonym);
        button.type = "button";
        button.setAttribute("aria-label", `Search for ${synonym}`);

        button.addEventListener("click", () => {
          wordInput.value = synonym;
          searchForm.requestSubmit();
        });

        synonymList.append(button);
      });

      synonymSection.append(synonymList);
    } else {
      synonymSection.append(
        createElement("p", "source", "No synonyms available.")
      );
    }

    card.append(synonymSection);
  });

  const sourceSection = createElement("p", "source");
  const sourceUrl = entry.sourceUrls?.[0];

  sourceSection.append(
    createElement("strong", "", "Source: ")
  );

  if (sourceUrl) {
    const link = createElement("a", "", sourceUrl);
    link.href = sourceUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    sourceSection.append(link);
  } else {
    sourceSection.append(
      document.createTextNode("Source URL unavailable.")
    );
  }

  card.append(sourceSection);
  results.replaceChildren(card);
}

function renderFavorites() {
  favoritesList.replaceChildren();

  if (favorites.length === 0) {
    favoritesList.append(
      createElement("li", "source", "No saved words yet.")
    );
    return;
  }


  favorites.forEach(word => {
    const item = createElement("li", "favorite-item");
    const searchlink = createElement("button", "favorite-link", word);
    const removebutton = createElement("button", "remove-favorite", "Remove");


    searchlink.type = "button";
    removebutton.type = "button";
    removebutton.setAttribute("aria-label", `Remove ${word} from favorites`);

    searchlink.addEventListener("click", () => {
        wordInput.value = word;
        searchForm.requestSubmit();
        wordInput.focus();
    });


    removebutton.addEventListener("click", () => {
        favorites = favorites.filter(
            saved => saved.toLowerCase() !== word.toLowerCase()
        );
        saveFavorites();


        if (currentEntry?.word.toLowerCase() === word.toLowerCase()) {
            renderWord(currentEntry);
        }
    });

    item.append(searchlink, removebutton);
    favoritesList.append(item);
  });
}


themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    themeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
    themeToggle.setAttribute("aria-pressed", String(isDark));
});


renderFavorites();