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
  document.getElementById('imageModal').style.display = 'none';
  document.body.style.overflow = '';
  document.removeEventListener('keydown', modalKeydown);
}

// Close when clicking the image or modal background.
document.getElementById('imageModal').addEventListener('click', function(event) {
  if (event.target === this || event.target.id === 'modalImage') {
    closeModal();
  }
});

// Swipe navigation.
const imageModal = document.getElementById('imageModal');

imageModal.addEventListener('touchstart', function(event) {
  touchStartX = event.changedTouches[0].screenX;
  touchStartY = event.changedTouches[0].screenY;
}, { passive: true });

imageModal.addEventListener('touchend', function(event) {
  const deltaX = event.changedTouches[0].screenX - touchStartX;
  const deltaY = event.changedTouches[0].screenY - touchStartY;

  if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
    changeModalImage(deltaX < 0 ? 1 : -1);
  }
}, { passive: true });

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