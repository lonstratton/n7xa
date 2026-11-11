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
  resetZoom();
  
  const image = modalImages[modalIndex];

  document.getElementById('modalImage').src = image.src;
  document.getElementById('modalImage').alt = image.caption;
  document.getElementById('modalCaption').textContent = image.caption;

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
  resetZoom();
  
  document.getElementById('imageModal').style.display = 'none';
  document.body.style.overflow = '';
  document.removeEventListener('keydown', modalKeydown);
}

// Swipe navigation, touch panning and pinch zoom.
let touchMoved = false;

imageModal.addEventListener('touchstart', function(event) {
  touchMoved = false;

  if (event.touches.length === 2) {
    pinching = true;
	pinchStartDistance = touchDistance(event.touches);
	pinchStartScale = zoomScale;
	touchMoved = true;
  } else if (event.touches.length === 1) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;

    dragStartX = touchStartX - zoomX;
    dragStartY = touchStartY - zoomY;
  }
}, { passive: true });

imageModal.addEventListener('touchmove', function(event) {
  if (event.touches.length === 2) {
    event.preventDefault();

    zoomScale = Math.max(1, Math.min(4,
      pinchStartScale *
      touchDistance(event.touches) / pinchStartDistance
    ));

    if (zoomScale === 1) {
      zoomX = 0;
      zoomY = 0;
    }

    touchMoved = true;
    updateZoom();

  } else if (event.touches.length === 1 && zoomScale > 1) {
    event.preventDefault();

    zoomX = event.touches[0].clientX - dragStartX;
    zoomY = event.touches[0].clientY - dragStartY;

    touchMoved = true;
    updateZoom();
  }
}, { passive: false });

imageModal.addEventListener('touchend', function(event) {
  if (event.touches.length > 0) return;

  const deltaX = event.changedTouches[0].clientX - touchStartX;
  const deltaY = event.changedTouches[0].clientY - touchStartY;

  if (!pinching && zoomScale === 1 &&
      Math.abs(deltaX) > 50 &&
      Math.abs(deltaX) > Math.abs(deltaY)) {
    changeModalImage(deltaX < 0 ? 1 : -1);
  }

  pinching = false;
}, { passive: true });

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