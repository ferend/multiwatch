const videoGrid = document.getElementById('video-grid');
const input = document.getElementById('input');
const submitButton = document.getElementById('submit-button');
var currentDomain = window.location.hostname;

submitButton.addEventListener('click', () => {
  const link = input.value;
  if (!link) {
    alert('Please enter a valid link');
    return;
  }

  const videoContainer = document.createElement('div');
  videoContainer.classList.add('video-container');

  let videoIframe;
  if (link.includes('youtube.com')) {
    videoIframe = document.createElement('iframe');
    videoIframe.src = `https://www.youtube.com/embed/${link.split('v=')[1].split('&')[0]}`;
  } else if (link.includes('twitch.tv')) {
    videoIframe = document.createElement('iframe');
    videoIframe.src = `https://player.twitch.tv/?channel=${link.split('.tv/')[1]}&parent=${currentDomain}&muted=true`;
  } else {
    alert('Please enter a valid YouTube or Twitch link');
    return;
  }

  videoIframe.classList.add('video-iframe');
  videoContainer.appendChild(videoIframe);

  const closeButton = document.createElement('div');
  closeButton.classList.add('close-button');
  closeButton.innerHTML = 'X';
  closeButton.addEventListener('click', () => {
    videoContainer.remove();
  });
  videoContainer.appendChild(closeButton);
  videoGrid.appendChild(videoContainer);
  //input.value = '';
});