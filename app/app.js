const scheduleForm = document.getElementById('schedule-form');
const eventTitle = document.getElementById('event-title');
const eventTime = document.getElementById('event-time');
const scheduleList = document.getElementById('schedule-list');

const tickerInput = document.getElementById('ticker-input');
const newsButton = document.getElementById('news-button');
const newsList = document.getElementById('news-list');

const listenButton = document.getElementById('listen-button');
const stopButton = document.getElementById('stop-button');
const heardText = document.getElementById('heard-text');
const aiText = document.getElementById('ai-text');

let events = JSON.parse(localStorage.getItem('pulsepilot-events') || '[]');
let latestHeadlines = [];

function renderEvents() {
  scheduleList.innerHTML = '';
  events
    .sort((a, b) => new Date(a.time) - new Date(b.time))
    .forEach((event, index) => {
      const li = document.createElement('li');
      li.innerHTML = `${new Date(event.time).toLocaleString()} - ${event.title} <button data-index="${index}">Delete</button>`;
      scheduleList.appendChild(li);
    });
}

scheduleList.addEventListener('click', (e) => {
  if (e.target.dataset.index !== undefined) {
    events.splice(Number(e.target.dataset.index), 1);
    localStorage.setItem('pulsepilot-events', JSON.stringify(events));
    renderEvents();
  }
});

scheduleForm.addEventListener('submit', (e) => {
  e.preventDefault();
  events.push({ title: eventTitle.value.trim(), time: eventTime.value });
  localStorage.setItem('pulsepilot-events', JSON.stringify(events));
  eventTitle.value = '';
  eventTime.value = '';
  renderEvents();
});

async function loadNews() {
  const ticker = tickerInput.value.trim().toUpperCase() || 'AAPL';
  newsList.innerHTML = '<li>Loading headlines...</li>';

  const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`;
  const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;

  try {
    const response = await fetch(proxy);
    const data = await response.json();
    const xml = new DOMParser().parseFromString(data.contents, 'text/xml');
    const items = [...xml.querySelectorAll('item')].slice(0, 5);

    latestHeadlines = items.map((item) => ({
      title: item.querySelector('title')?.textContent || 'Untitled',
      link: item.querySelector('link')?.textContent || '#',
    }));

    newsList.innerHTML = '';
    if (!latestHeadlines.length) {
      newsList.innerHTML = '<li>No headlines found.</li>';
      return;
    }

    latestHeadlines.forEach((news) => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="${news.link}" target="_blank" rel="noreferrer">${news.title}</a>`;
      newsList.appendChild(li);
    });
  } catch (err) {
    newsList.innerHTML = '<li>Unable to load news right now.</li>';
  }
}

newsButton.addEventListener('click', loadNews);

function aiReply(query) {
  const text = query.toLowerCase();

  if (text.includes('schedule') || text.includes('event')) {
    if (!events.length) return 'Your schedule is empty. Add an event and I can summarize it.';
    const next = events.slice().sort((a, b) => new Date(a.time) - new Date(b.time))[0];
    return `You have ${events.length} events. Next up: ${next.title} at ${new Date(next.time).toLocaleString()}.`;
  }

  if (text.includes('market') || text.includes('news') || text.includes('stock')) {
    if (!latestHeadlines.length) return 'I do not have fresh headlines yet. Press Load News first.';
    return `Top headline: ${latestHeadlines[0].title}`;
  }

  return 'I can help with your schedule and market headlines. Ask me: what is next on my schedule? or summarize market news.';
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.addEventListener('result', (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    heardText.textContent = transcript;
    const response = aiReply(transcript);
    aiText.textContent = response;

    const utter = new SpeechSynthesisUtterance(response);
    speechSynthesis.speak(utter);
  });

  listenButton.addEventListener('click', () => recognition.start());
  stopButton.addEventListener('click', () => recognition.stop());
} else {
  aiText.textContent = 'Speech recognition is not available in this browser.';
  listenButton.disabled = true;
  stopButton.disabled = true;
}

renderEvents();
loadNews();
