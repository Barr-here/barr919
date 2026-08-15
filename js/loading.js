// PAGE LOADER - Global untuk semua halaman
(function() {
  const pageLoader = document.getElementById('pageLoader');
  if (!pageLoader) return;

  const MIN_LOADING_TIME = 3000;
  const startTime = Date.now();

  function hideLoader() {
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

    setTimeout(() => {
      pageLoader.style.opacity = '0';
      
      setTimeout(() => {
        pageLoader.classList.add('hidden');
      }, 400);
    }, remainingTime);
  }

  if (document.readyState === 'complete') {
    hideLoader();
  } else {
    window.addEventListener('load', hideLoader);
  }
  
  setTimeout(() => {
    if (!pageLoader.classList.contains('hidden')) {
      pageLoader.style.opacity = '0';
      setTimeout(() => {
        pageLoader.classList.add('hidden');
      }, 400);
    }
  }, 5000);
})();