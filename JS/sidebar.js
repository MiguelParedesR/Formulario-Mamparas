document.addEventListener("DOMContentLoaded", () => {
  const toggleBtns = document.querySelectorAll('.toggle-btn');
  const sidebar = document.querySelector('.sidebar');
  const mobileNav = document.querySelector('.mobile-nav');

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Si estamos en versión móvil y existe mobileNav
      if (window.innerWidth <= 768 && mobileNav) {
        mobileNav.classList.toggle('show');
      }

      // Para escritorio
      if (window.innerWidth > 768 && sidebar) {
        sidebar.classList.toggle('collapsed');

        // Ajustar el main-container si existe
        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) {
          if (sidebar.classList.contains('collapsed')) {
            mainContainer.style.marginLeft = '60px';
          } else {
            mainContainer.style.marginLeft = '220px';
          }
        }
      }
    });
  });
});
