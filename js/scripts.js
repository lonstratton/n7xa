// Declare the variable outside the $(document).ready block	
var scrollPosition; 

// Function to save scroll position
function saveScrollPosition() {
    scrollPosition = $(window).scrollTop();
}


/* -- Image Gallery Modal
------------------------------------------------------------- */

let modalImages = [];
let modalIndex = 0;
let touchStartX = 0;
let touchStartY = 0;

let zoomScale = 1;
let zoomX = 0;
let zoomY = 0;
let dragging = false;
let dragStartX = 0;
let dragStartY = 0;
let pinchStartDistance = 0;
let pinchStartScale = 1;
let suppressZoomClick = false;
let pinching = false;
let mouseStartX = 0;
let mouseStartY = 0;

const modalImage = document.getElementById('modalImage');
const imageModal = document.getElementById('imageModal');

function updateZoom() {
  modalImage.style.transform =
    `translate(-50%, -50%) translate(${zoomX}px, ${zoomY}px) scale(${zoomScale})`;

  modalImage.classList.toggle('is-zoomed', zoomScale > 1);
}

function resetZoom() {
  zoomScale = 1;
  zoomX = 0;
  zoomY = 0;
  dragging = false;
  modalImage.classList.remove('is-dragging');
  updateZoom();
  suppressZoomClick = false;
}

function toggleZoom() {
  if (zoomScale > 1) {
    resetZoom();
  } else {
    zoomScale = 2;
    updateZoom();
  }
}

function touchDistance(touches) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  );
}

function openModal(imageSrc) {
  saveScrollPosition();

  // Find the clicked photograph and its gallery section.
  const links = Array.from(
    document.querySelectorAll('.gallery-item a[onclick^="openModal"]')
  );

  const clicked = links.find(link =>
    link.getAttribute('onclick').includes(imageSrc)
  );

  if (!clicked) return;

  const section = [];
  let element = clicked.closest('.gallery-item');

  // Collect photographs until the next section heading.
  while (element && !element.classList.contains('gallery-subheading')) {
    if (element.classList.contains('gallery-item')) {
      const link = element.querySelector('a[onclick^="openModal"]');
      if (link) section.unshift(link);
    }
    element = element.previousElementSibling;
  }

  element = clicked.closest('.gallery-item').nextElementSibling;

  while (element && !element.classList.contains('gallery-subheading')) {
    if (element.classList.contains('gallery-item')) {
      const link = element.querySelector('a[onclick^="openModal"]');
      if (link) section.push(link);
    }
    element = element.nextElementSibling;
  }

  modalImages = section.map(link => ({
    src: link.getAttribute('onclick').match(/openModal\(['"](.+?)['"]\)/)[1],
    caption: link.closest('figure')
      .querySelector('figcaption')?.textContent.trim() || ''
  }));

  modalIndex = modalImages.findIndex(item => item.src === imageSrc);

  if (modalIndex < 0) return;

  document.getElementById('imageModal').style.display = 'block';
  document.body.style.overflow = 'hidden';

  showModalImage();

  document.addEventListener('keydown', modalKeydown);
}

function showModalImage() {
  cancelSwipe();
  gesture = null;
  pinching = false;
  resetZoom();
  
  const image = modalImages[modalIndex];

  document.getElementById('modalImage').src = image.src;
  document.getElementById('modalImage').alt = image.caption;
  document.getElementById('modalCaption').textContent = image.caption;

  // Warm the two adjacent images without changing section boundaries.
  adjacentPreloads = modalImages.length > 1 ? [-1, 1].map(direction => {
    const preload = new Image();
    preload.src = modalImages[
      (modalIndex + direction + modalImages.length) % modalImages.length
    ].src;
    return preload;
  }) : [];

  const showArrows = modalImages.length > 1;

  document.querySelector('.modal-prev').style.display =
    showArrows ? 'block' : 'none';

  document.querySelector('.modal-next').style.display =
    showArrows ? 'block' : 'none';
}

function changeModalImage(direction) {
  if (!modalImages.length) return;

  modalIndex =
    (modalIndex + direction + modalImages.length) % modalImages.length;

  showModalImage();
}

function modalKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeModal();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    changeModalImage(-1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    changeModalImage(1);
  }
}

function closeModal() {
  cancelSwipe();
  gesture = null;
  resetZoom();
  
  document.getElementById('imageModal').style.display = 'none';
  document.body.style.overflow = '';
  document.removeEventListener('keydown', modalKeydown);
}

// Touch-following navigation. The preview never receives clicks or focus.
const swipeImage = document.getElementById('modalSwipeImage');
let gesture = null;
let swipeX = 0;
let swipeDirection = 0;
let swipeWidth = 0;
let settling = false;
let settleTimer = null;
let ignoreTouchClickUntil = 0;
let adjacentPreloads = [];
swipeImage.addEventListener('load', function() {
  if (swipeDirection) swipeImage.style.visibility = 'visible';
});
swipeImage.addEventListener('error', function() {
  swipeImage.style.visibility = 'hidden';
});

function blockTouchClick() {
  ignoreTouchClickUntil = Date.now() + 700;
}

function cancelSwipe() {
  clearTimeout(settleTimer);
  settleTimer = null;
  settling = false;
  swipeX = 0;
  swipeDirection = 0;
  modalImage.style.transition = 'none';
  swipeImage.style.transition = 'none';
  swipeImage.style.visibility = 'hidden';
  updateZoom();
}

function drawSwipe(x) {
  swipeX = Math.max(-swipeWidth, Math.min(swipeWidth, x));
  const direction = swipeX < 0 ? 1 : -1;
  if (direction !== swipeDirection) {
    swipeDirection = direction;
    const next = (modalIndex + direction + modalImages.length) % modalImages.length;
    swipeImage.src = modalImages[next].src;
  }
  swipeImage.style.visibility = swipeImage.complete && swipeImage.naturalWidth > 0
    ? 'visible' : 'hidden';
  modalImage.style.transform = `translate(-50%, -50%) translateX(${swipeX}px)`;
  swipeImage.style.transform =
    `translate(-50%, -50%) translateX(${swipeX + swipeDirection * swipeWidth}px)`;
}

function finishSwipe(commit) {
  if (!swipeDirection) return;
  const direction = swipeDirection;
  // Never replace the current photo with a preview that failed or is still loading.
  commit = commit && swipeImage.complete && swipeImage.naturalWidth > 0;
  settling = true;
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250;
  const transition = `transform ${duration}ms cubic-bezier(.22,.61,.36,1)`;
  modalImage.style.transition = transition;
  swipeImage.style.transition = transition;
  // Flush the finger-following position before setting the animation destination.
  void modalImage.offsetWidth;
  const destination = commit ? -direction * swipeWidth : 0;
  modalImage.style.transform = `translate(-50%, -50%) translateX(${destination}px)`;
  swipeImage.style.transform =
    `translate(-50%, -50%) translateX(${destination + direction * swipeWidth}px)`;
  settleTimer = setTimeout(() => {
    cancelSwipe();
    if (commit) changeModalImage(direction);
  }, duration);
}

imageModal.addEventListener('touchstart', function(event) {
  if (event.target.closest('button')) return;
  if (settling) {
    blockTouchClick();
    return;
  }
  if (event.touches.length >= 2) {
    cancelSwipe();
    blockTouchClick();
    pinching = true;
    gesture = { mode: 'pinch' };
    pinchStartDistance = touchDistance(event.touches);
    pinchStartScale = zoomScale;
  } else if (event.touches.length === 1) {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    dragStartX = touchStartX - zoomX;
    dragStartY = touchStartY - zoomY;
    swipeWidth = imageModal.clientWidth;
    gesture = { mode: zoomScale > 1 ? 'pan' : 'pending', id: touch.identifier };
  }
}, { passive: true });

imageModal.addEventListener('touchmove', function(event) {
  if (!gesture || settling) return;
  if (event.touches.length >= 2 && gesture.mode === 'pinch') {
    event.preventDefault();
    if (pinchStartDistance > 0) {
      zoomScale = Math.max(1, Math.min(4,
        pinchStartScale * touchDistance(event.touches) / pinchStartDistance));
    }
    if (zoomScale === 1) zoomX = zoomY = 0;
    updateZoom();
    blockTouchClick();
    return;
  }
  const touch = Array.from(event.touches).find(t => t.identifier === gesture.id);
  if (!touch) return;
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  if (Math.hypot(dx, dy) > 6) blockTouchClick();
  if (gesture.mode === 'pan') {
    event.preventDefault();
    zoomX = touch.clientX - dragStartX;
    zoomY = touch.clientY - dragStartY;
    updateZoom();
  } else {
    if (gesture.mode === 'pending' && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      gesture.mode = Math.abs(dx) > Math.abs(dy) && modalImages.length > 1
        ? 'swipe' : 'vertical';
    }
    if (gesture.mode === 'swipe') {
      event.preventDefault();
      drawSwipe(dx);
    }
  }
}, { passive: false });

imageModal.addEventListener('touchend', function(event) {
  if (!gesture) return;
  if (event.touches.length > 0) {
    // Rebase the remaining finger after a pinch; it may pan, never navigate.
    if (gesture.mode === 'pinch') {
      const touch = event.touches[0];
      gesture = { mode: 'pan', id: touch.identifier };
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      dragStartX = touch.clientX - zoomX;
      dragStartY = touch.clientY - zoomY;
    }
    return;
  }
  if (gesture.mode === 'swipe') {
    blockTouchClick();
    finishSwipe(Math.abs(swipeX) >= Math.min(100, swipeWidth * .2));
  }
  if (pinching) blockTouchClick();
  pinching = false;
  gesture = null;
}, { passive: true });

imageModal.addEventListener('touchcancel', function() {
  blockTouchClick();
  gesture = null;
  pinching = false;
  if (swipeDirection) finishSwipe(false);
}, { passive: true });

window.addEventListener('resize', function() {
  if (gesture || settling) blockTouchClick();
  gesture = null;
  pinching = false;
  cancelSwipe();
});

// Suppress compatibility clicks after a swipe, pan or pinch (including backdrop clicks).
imageModal.addEventListener('click', function(event) {
  if (Date.now() < ignoreTouchClickUntil || settling) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

// Click image to zoom; click background to close.
imageModal.addEventListener('click', function(event) {
  if (event.target === this) {
    closeModal();
  } else if (event.target === modalImage) {
  if (suppressZoomClick) {
    suppressZoomClick = false;
    return;
  }
  toggleZoom();
}
});

modalImage.addEventListener('mousedown', function(event) {
  if (zoomScale <= 1) return;

  event.preventDefault();
  dragging = true;

  mouseStartX = event.clientX;
  mouseStartY = event.clientY;

  dragStartX = event.clientX - zoomX;
  dragStartY = event.clientY - zoomY;

  modalImage.classList.add('is-dragging');
});

window.addEventListener('mousemove', function(event) {
  if (!dragging) return;

  if (Math.abs(event.clientX - mouseStartX) > 3 ||
      Math.abs(event.clientY - mouseStartY) > 3) {
    suppressZoomClick = true;
  }

  zoomX = event.clientX - dragStartX;
  zoomY = event.clientY - dragStartY;

  updateZoom();
});

window.addEventListener('mouseup', function() {
  dragging = false;
  modalImage.classList.remove('is-dragging');
});

modalImage.addEventListener('dragstart', function(event) {
  event.preventDefault();
});

// The Modal for Iframe
function openiframeModal(iframeSrc) {
    saveScrollPosition(); // Save scroll position before opening the modal
    $('body').css('overflow', 'hidden'); // Prevent scrolling on the body
    document.getElementById('iframeModal').style.display = 'block';
    document.getElementById('modaliframe').src = iframeSrc;

    // Close the modal when clicking on the iframe
    document.getElementById('modaliframe').onclick = function() {
        closeiframeModal();
    };

    // Close the modal on 'Escape' key press
    document.addEventListener('keydown', closeiframeModalOnEscape);
}

function closeiframeModalOnEscape(event) {
    if (event.key === 'Escape') {
        closeiframeModal();
    }
}

function closeiframeModal() {
    // Stop video playback before closing the modal
    var iframe = document.getElementById('modaliframe');
    iframe.src = '';
    document.getElementById('iframeModal').style.display = 'none';
    $('body').css('overflow', 'auto'); // Allow scrolling on the body
    document.removeEventListener('keydown', closeiframeModalOnEscape); // Remove the event listener
}

$(document).ready(function () {

// Set initial opacity for both .zoom and .play
$(".zoom, .play").css({"opacity": 0});

// Define a hover effect function
function setHoverEffect(selector) {
    $(selector).hover(
        function() {
            $(this).stop().animate({ "opacity": 0.9 }, 'slow');
            $(this).siblings('img').stop().animate({ "opacity": 0.7 }, 'fast');
        },
        function() {
            $(this).stop().animate({ "opacity": 0 }, 'fast');
            $(this).siblings('img').stop().animate({ "opacity": 1 }, 'fast');
        }
    );
}

// Apply hover effect to both .zoom and .play
setHoverEffect(".zoom");
setHoverEffect(".play");
	
// END
});