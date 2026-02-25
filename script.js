const API_BASE = "http://127.0.0.1:8000";

let catalogData = [];
let isLive = true;
let activeItemName = null;
let currentStream = null;

const searchInput = document.getElementById('searchInput');
const dateFilter = document.getElementById('dateFilter');
const timeFilter = document.getElementById('timeFilter');
const catalogList = document.getElementById('catalogList');
const detectionCounter = document.getElementById('detectionCounter');

const resetBtn = document.getElementById('resetBtn');
const topRightLiveBtn = document.getElementById('topRightLiveBtn');
const liveFeedViewBtn = document.getElementById('liveFeedViewBtn');
const lastKnownViewBtn = document.getElementById('lastKnownViewBtn');

const naDisplay = document.getElementById('naDisplay');
const workspaceContainer = document.getElementById('workspaceContainer');
const workspaceImage = document.getElementById('workspaceImage');
const liveVideo = document.getElementById('liveVideo');
const boundingBox = document.getElementById('boundingBox');
const boxLabel = document.getElementById('boxLabel');
const actionButtons = document.getElementById('actionButtons');

const timelineContainer = document.getElementById('timelineContainer');
const timeScrubber = document.getElementById('timeScrubber');
const scrubberLabel = document.getElementById('scrubberLabel');

async function fetchCatalogData() {
    try {
        const res = await fetch(`${API_BASE}/api/data`);
        if (!res.ok) return;
        const rawData = await res.json();
        
        let totalDetections = 0;

       
        catalogData = rawData.map(group => {
            const sortedHistory = group.history.sort((a, b) => new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`));
            totalDetections += sortedHistory.length;
            
            return {
                name: group.name,
                history: sortedHistory,
                latest: sortedHistory[sortedHistory.length - 1] 
            };
        });

        
        catalogData.sort((a, b) => new Date(`${b.latest.date} ${b.latest.time}`) - new Date(`${a.latest.date} ${a.latest.time}`));

        detectionCounter.textContent = totalDetections;
        renderCatalog();

        if (activeItemName && !isLive) {
            const activeItem = catalogData.find(i => i.name === activeItemName);
            if (activeItem) {
                const wasAtLatest = parseInt(timeScrubber.value) === parseInt(timeScrubber.max);
                timeScrubber.max = activeItem.history.length - 1;
                
                if (wasAtLatest) {
                    timeScrubber.value = timeScrubber.max;
                    renderHistoryFrame(activeItem, timeScrubber.value);
                }
            }
        }

    } catch (error) {
        console.error("Backend connection failed. Is the Python server running?");
    }
}

function updateButtonStates(activeView) {
    liveFeedViewBtn.classList.remove('active');
    topRightLiveBtn.classList.remove('active');
    lastKnownViewBtn.classList.remove('active');

    if (activeView === 'live') {
        liveFeedViewBtn.classList.add('active');
        topRightLiveBtn.classList.add('active');
    } else if (activeView === 'last') {
        lastKnownViewBtn.classList.add('active');
    }
}

function renderCatalog() {
    const query = searchInput.value.toLowerCase().trim();
    const dateVal = dateFilter.value.trim();
    const timeVal = timeFilter.value.trim();

    const hasFilters = query !== "" || dateVal !== "" || timeVal !== "";

    const evaluatedData = catalogData.map(item => {
        const matchName = query === "" || item.name.toLowerCase().includes(query);
        const matchDate = dateVal === "" || item.latest.date.includes(dateVal);
        const matchTime = timeVal === "" || item.latest.time.includes(timeVal);
        
        const isMatch = matchName && matchDate && matchTime;
        const activeMatch = hasFilters ? isMatch : true;

        return { ...item, activeMatch };
    });

    catalogList.innerHTML = '';

    evaluatedData.forEach((item) => {
        const opacityClass = item.activeMatch ? 'opacity-100' : 'hidden'; // Hide non-matches entirely to clean up the grouped view
        const activeBg = (activeItemName === item.name && !isLive) ? 'bg-[#1a1a1a] border-l-2 border-blue-500' : 'bg-[#0a0a0a] border-l-2 border-transparent';
        
        const li = document.createElement('li');
        li.className = `border-b border-[#1a1a1a] hover:bg-[#111111] cursor-pointer transition-all duration-300 group flex items-center justify-between px-5 py-4 ${opacityClass} ${activeBg}`;
        li.onclick = () => showItemPreview(item);
        
        li.innerHTML = `
            <div class="flex flex-col">
                <span class="text-[11px] font-bold tracking-wider text-white group-hover:text-gray-300 transition-colors duration-300">${item.name} <span class="text-[9px] font-normal text-blue-500 ml-1">(${item.history.length})</span></span>
                <span class="text-[10px] text-[#555] mt-1">Last seen: ${item.latest.date} | ${item.latest.time}</span>
            </div>
            <svg class="w-3 h-3 text-[#333] group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        `;
        catalogList.appendChild(li);
    });
}

function stopWebcam() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    liveVideo.classList.add('hidden');
}

function renderHistoryFrame(item, index) {
    const frame = item.history[index];
    workspaceImage.src = frame.img;
    
    if(frame.w && frame.h) {
        boundingBox.style.display = 'block';
        boundingBox.style.left = frame.x + '%';
        boundingBox.style.top = frame.y + '%';
        boundingBox.style.width = frame.w + '%';
        boundingBox.style.height = frame.h + '%';
        boxLabel.textContent = item.name;
    } else {
        boundingBox.style.display = 'none';
    }

    const isLatest = parseInt(index) === item.history.length - 1;
    scrubberLabel.textContent = isLatest ? 'LATEST' : `${frame.date} | ${frame.time}`;
}

function showItemPreview(item) {
    isLive = false;
    activeItemName = item.name;
    stopWebcam();
    updateButtonStates('last');
    
    naDisplay.classList.add('hidden');
    liveVideo.classList.add('hidden');
    workspaceContainer.classList.remove('hidden');
    workspaceImage.classList.remove('hidden');
    actionButtons.classList.remove('hidden');
    timelineContainer.classList.remove('hidden');

    timeScrubber.max = item.history.length - 1;
    timeScrubber.value = item.history.length - 1;

    renderHistoryFrame(item, timeScrubber.value);
    renderCatalog();
}

timeScrubber.addEventListener('input', (e) => {
    const activeItem = catalogData.find(i => i.name === activeItemName);
    if (activeItem) {
        renderHistoryFrame(activeItem, e.target.value);
    }
});

async function resetSystem() {
    try {
        const res = await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
        if (res.ok) {
            catalogData = [];
            renderCatalog();
            detectionCounter.textContent = '0';
            workspaceContainer.classList.add('hidden');
            naDisplay.classList.remove('hidden');
            actionButtons.classList.add('hidden');
            timelineContainer.classList.add('hidden');
            searchInput.value = '';
            dateFilter.value = '';
            timeFilter.value = '';
            updateButtonStates('');
            toggleLiveFeed();
        }
    } catch (error) {
        console.error("Failed to reset");
    }
}

function toggleLiveFeed() {
    isLive = true;
    activeItemName = null;
    updateButtonStates('live');
    
    naDisplay.classList.add('hidden');
    workspaceContainer.classList.remove('hidden');
    workspaceImage.classList.remove('hidden');
    
    liveVideo.classList.add('hidden');
    actionButtons.classList.add('hidden');
    timelineContainer.classList.add('hidden');
    boundingBox.style.display = 'none';
    
    workspaceImage.src = `${API_BASE}/api/stream`;
    renderCatalog();
}

function toggleLastKnownLocation() {
    if (catalogData.length > 0) {
        const latestItem = catalogData[0];
        showItemPreview(latestItem);
    }
}

searchInput.addEventListener('input', renderCatalog);
dateFilter.addEventListener('input', renderCatalog);
timeFilter.addEventListener('input', renderCatalog);
resetBtn.addEventListener('click', resetSystem);

liveFeedViewBtn.addEventListener('click', toggleLiveFeed);
topRightLiveBtn.addEventListener('click', toggleLiveFeed);
lastKnownViewBtn.addEventListener('click', toggleLastKnownLocation);

fetchCatalogData();
toggleLiveFeed();

setInterval(fetchCatalogData, 5000);