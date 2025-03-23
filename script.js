const videoGrid = document.getElementById('video-grid');
const input = document.getElementById('input');
const submitButton = document.getElementById('submit-button');
const clearAllButton = document.getElementById('clear-all-button');
const errorMessage = document.createElement('div');
errorMessage.classList.add('error-message');
document.body.insertBefore(errorMessage, videoGrid);

let videos = JSON.parse(localStorage.getItem('videos')) || [];

// Load saved videos
function loadVideos() {
  videos.forEach((video) => addVideoToGrid(video.url, video.type));
}

// Save videos to localStorage
function saveVideos() {
  localStorage.setItem('videos', JSON.stringify(videos));
}

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  setTimeout(() => errorMessage.style.display = 'none', 3000);
}

// Extract YouTube video ID
function extractYouTubeID(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Extract Twitch channel name
function extractTwitchChannel(url) {
  const match = url.match(/(?:www\.|go\.)?twitch\.tv\/([^\/\s?]+)/);
  return match ? match[1] : null;
}

// Add video to grid
function addVideoToGrid(url, type) {
  const videoContainer = document.createElement('div');
  videoContainer.classList.add('video-container');
  videoContainer.draggable = true;

  let embedUrl;
  if (type === 'youtube') {
    const videoId = extractYouTubeID(url);
    if (!videoId) return showError('Invalid YouTube link');
    embedUrl = `https://www.youtube.com/embed/${videoId}`;
  } else if (type === 'twitch') {
    const channel = extractTwitchChannel(url);
    if (!channel) return showError('Invalid Twitch channel');
    embedUrl = `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
  }

  const videoIframe = document.createElement('iframe');
  videoIframe.classList.add('video-iframe');
  videoIframe.src = embedUrl;
  videoIframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
  videoIframe.allowFullscreen = true;

  const controlButtons = document.createElement('div');
  controlButtons.classList.add('control-buttons');

  const playPauseButton = document.createElement('button');
  playPauseButton.classList.add('control-button');
  playPauseButton.innerHTML = '⏯️';
  playPauseButton.title = 'Play/Pause';
  playPauseButton.addEventListener('click', () => {
    videoIframe.contentWindow.postMessage('{"event":"command","func":"' + (videoIframe.src.includes('youtube') ? 'pauseVideo' : 'pause') + '","args":""}', '*');
  });

  const closeButton = document.createElement('button');
  closeButton.classList.add('close-button');
  closeButton.innerHTML = '×';
  closeButton.title = 'Close video';
  closeButton.addEventListener('click', () => {
    videoContainer.remove();
    videos = videos.filter((video) => video.url !== url);
    saveVideos();
  });

  videoContainer.append(videoIframe, controlButtons, closeButton);
  videoGrid.appendChild(videoContainer);

  // Drag-and-Drop functionality
  videoContainer.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', url);
  });

  videoContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  videoContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    const draggedUrl = e.dataTransfer.getData('text/plain');
    const draggedIndex = videos.findIndex((video) => video.url === draggedUrl);
    const targetIndex = videos.findIndex((video) => video.url === url);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      [videos[draggedIndex], videos[targetIndex]] = [videos[targetIndex], videos[draggedIndex]];
      saveVideos();
      videoGrid.innerHTML = '';
      loadVideos();
    }
  });
}

// Add video on submit
submitButton.addEventListener('click', () => {
  const link = input.value.trim();
  if (!link) return showError('Please enter a valid link');

  let type;
  if (link.includes('youtube') || link.includes('youtu.be')) {
    type = 'youtube';
  } else if (link.includes('twitch.tv')) {
    type = 'twitch';
  } else {
    return showError('Only YouTube and Twitch links are supported');
  }

  videos.push({ url: link, type });
  saveVideos();
  addVideoToGrid(link, type);
  input.value = '';
});

// Clear all videos
clearAllButton.addEventListener('click', () => {
  videoGrid.innerHTML = '';
  videos = [];
  saveVideos();
});

// Load saved videos on page load
loadVideos();