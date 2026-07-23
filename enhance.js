/* ============================================================
   Cuidadoras Conecta — comportamentos compartilhados de UI
   (não contém nenhuma lógica de negócio / integração)
   ============================================================ */
(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Navbar: estado "scrolled" para o efeito de vidro ----
  const nav = document.querySelector('.glass-nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---- AOS (scroll reveal) ----
  if (window.AOS) {
    AOS.init({
      duration: 640,
      easing: 'ease-out-quart',
      once: true,
      offset: 60,
      disable: prefersReduced
    });
  }

  // ---- Parallax sutil das camadas de araucária no hero ----
  const layers = document.querySelectorAll('.hero-connect .araucaria-layer');
  if (layers.length && !prefersReduced) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    window.addEventListener('pointermove', (e) => {
      tx = (e.clientX / window.innerWidth - 0.5);
      ty = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });

    function raf() {
      cx += (tx - cx) * 0.04;
      cy += (ty - cy) * 0.04;
      layers.forEach((layer) => {
        const depth = parseFloat(layer.dataset.depth || '1');
        layer.style.transform = `translate3d(${cx * 14 * depth}px, ${cy * 10 * depth}px, 0)`;
      });
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // leve resposta ao scroll também
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      layers.forEach((layer) => {
        const depth = parseFloat(layer.dataset.depth || '1');
        layer.style.marginTop = `${y * 0.05 * depth}px`;
      });
    }, { passive: true });
  }
})();
