const JIKAN_BASE = 'https://api.jikan.moe/v4';
let currentPage = 1;
let currentMode = 'top/anime';
let searchTimeout;
let isLoading = false;

window.onload = () => loadData();

// INFINITE SCROLL
window.onscroll = function() {
    if (currentMode === 'mylist') return;
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
        if (!isLoading) loadData();
    }
};

function getMyList() {
    return JSON.parse(localStorage.getItem('animeHubList')) || [];
}

function setMode(mode, btnId) {
    currentMode = mode;
    currentPage = 1;
    isLoading = false;
    document.getElementById('resultsGrid').innerHTML = '';
    document.getElementById('searchInput').value = ''; 
    
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');

    const clearBtn = document.getElementById('clearAllBtn');
    if (mode === 'mylist') {
        document.getElementById('sectionTitle').innerText = "My Saved List";
        clearBtn.style.display = 'block';
        displayCards(getMyList());
    } else {
        clearBtn.style.display = 'none';
        const titles = {'top/anime': 'Highest Rated Anime', 'top/manga': 'Highest Rated Manga', 'seasons/now': 'Trending'};
        document.getElementById('sectionTitle').innerText = titles[mode];
        loadData();
    }
}

async function loadData() {
    if (isLoading) return;
    isLoading = true;
    try {
        const res = await fetch(`${JIKAN_BASE}/${currentMode}?page=${currentPage}`);
        const data = await res.json();
        if (data.data && data.data.length > 0) {
            displayCards(data.data);
            currentPage++;
        }
    } catch (err) { console.error(err); }
    finally { setTimeout(() => { isLoading = false; }, 500); }
}

function displayCards(list) {
    const grid = document.getElementById('resultsGrid');
    const isMyListPage = (currentMode === 'mylist');

    list.forEach((item, index) => {
        const title = item.title_english || item.title;
        const img = item.images?.jpg?.large_image_url || item.img;
        const id = item.mal_id || item.id;
        
        let subDetail = item.subDetail || "";
        if (!subDetail) {
            subDetail = currentMode.includes('manga') 
                ? `<span class="detail-tag">${item.chapters || "?"} CHs</span>` 
                : `<span class="detail-tag">${item.episodes || "?"} EPs</span>`;
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${(index % 20) * 0.04}s`;

        const buttonIcon = isMyListPage ? '✕' : '+';
        const buttonClass = isMyListPage ? 'action-btn remove-mode' : 'action-btn';

        card.innerHTML = `
            <button class="${buttonClass}" onclick="handleAction(event, this, ${JSON.stringify({id, title, img, subDetail}).replace(/"/g, '&quot;')})">
                ${buttonIcon}
            </button>
            <img src="${img}">
            <div class="card-info">
                <h4>${title}</h4>
                <div class="card-details">${subDetail}</div>
            </div>
        `;

        card.onclick = (e) => {
            if(e.target.closest('.action-btn')) return;
            const homeUrl = currentMode.includes('manga') ? 'https://mangafire.to/home' : 'https://anikai.to/home';
            window.open(homeUrl, '_blank');
        };
        grid.appendChild(card);
    });
}

function handleAction(event, button, item) {
    event.stopPropagation();
    let list = getMyList();
    if (currentMode === 'mylist') {
        list = list.filter(s => s.id !== item.id);
        localStorage.setItem('animeHubList', JSON.stringify(list));
        const card = button.closest('.card');
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => card.remove(), 300);
    } else {
        if (!list.some(s => s.id === item.id)) {
            list.push(item);
            localStorage.setItem('animeHubList', JSON.stringify(list));
            button.innerText = '✓';
            button.classList.add('added');
            setTimeout(() => { button.innerText = '+'; button.classList.remove('added'); }, 1000);
        }
    }
}

function clearFullList() {
    localStorage.setItem('animeHubList', JSON.stringify([]));
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, i) => {
        setTimeout(() => { card.style.opacity = '0'; card.style.transform = 'translateY(20px)'; }, i * 20);
    });
    setTimeout(() => { document.getElementById('resultsGrid').innerHTML = ''; }, 500);
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    if (query.length === 0) {
        setMode(currentMode, document.querySelector('.nav-item.active').id);
        return;
    }
    searchTimeout = setTimeout(async () => {
        const type = currentMode.includes('manga') ? 'manga' : 'anime';
        const res = await fetch(`${JIKAN_BASE}/${type}?q=${query}&limit=20`);
        const data = await res.json();
        const filtered = data.data.filter(item => {
            const name = (item.title_english || item.title).toLowerCase();
            return name.startsWith(query.toLowerCase());
        });
        document.getElementById('resultsGrid').innerHTML = '';
        displayCards(filtered.length > 0 ? filtered : data.data);
    }, 500);
});