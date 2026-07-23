/* ============================================================
   Hero "Elo de Luz" - Cuidadoras Conecta
   Cena Three.js leve e sutil: dois pontos de luz (família e
   cuidadora) conectados por um filamento que pulsa lentamente.
   - Inicialização tardia (lazy) e só se WebGL estiver disponível
   - Respeita prefers-reduced-motion (não inicializa; usa fallback)
   - Canvas transparente, desacoplado do conteúdo textual
   ============================================================ */
(function () {
  const mount = document.getElementById('hero-canvas-wrap');
  if (!mount) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    mount.classList.add('is-static-fallback');
    return; // CSS gradient + araucária layers já comunicam a cena; nada animado.
  }

  function supportsWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }
  if (!supportsWebGL()) return;

  function start() {
    import('https://unpkg.com/three@0.160.0/build/three.module.js').then((THREE) => {
      initScene(THREE, mount);
    }).catch(() => { /* falha de rede/CDN: mantém fundo estático, sem quebrar a página */ });
  }

  // Lazy: espera a página assentar antes de puxar o Three.js (não bloqueia LCP/hero-text)
  if ('requestIdleCallback' in window) {
    requestIdleCallback(start, { timeout: 2000 });
  } else {
    window.addEventListener('load', () => setTimeout(start, 250));
  }

  function initScene(THREE, mount) {
    let width = mount.clientWidth, height = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 9);

    const group = new THREE.Group();
    scene.add(group);

    // ---- Textura de brilho (glow) gerada via canvas 2D ----
    function glowTexture(hex) {
      const size = 128;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grd.addColorStop(0, hex + 'ff');
      grd.addColorStop(0.4, hex + '88');
      grd.addColorStop(1, hex + '00');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, size, size);
      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    }

    const amberGlow = glowTexture('#C9883E');
    const pineGlow = glowTexture('#3F6E5C');
    const softGlow = glowTexture('#F3E3C8');

    // ---- Dois pontos de luz: família (esquerda) e cuidadora (direita) ----
    const spriteMatA = new THREE.SpriteMaterial({ map: amberGlow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const spriteMatB = new THREE.SpriteMaterial({ map: pineGlow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

    const pointA = new THREE.Sprite(spriteMatA.clone());
    pointA.scale.set(1.6, 1.6, 1);
    pointA.position.set(-2.6, 0.4, 0);

    const pointB = new THREE.Sprite(spriteMatB.clone());
    pointB.scale.set(1.6, 1.6, 1);
    pointB.position.set(2.6, -0.3, 0);

    group.add(pointA, pointB);

    // núcleo sólido pequeno em cada ponto (dá "peso" ao brilho)
    function core(color) {
      const geo = new THREE.SphereGeometry(0.09, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
      return new THREE.Mesh(geo, mat);
    }
    const coreA = core(0xC9883E); coreA.position.copy(pointA.position);
    const coreB = core(0x3F6E5C); coreB.position.copy(pointB.position);
    group.add(coreA, coreB);

    // ---- Filamento (curva) conectando os dois pontos ----
    const curveMid = new THREE.Vector3(0, 0.6, 0.4);
    let curve = new THREE.QuadraticBezierCurve3(pointA.position.clone(), curveMid, pointB.position.clone());
    let tubeGeo = new THREE.TubeGeometry(curve, 64, 0.018, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0xE0B77A, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false
    });
    let tube = new THREE.Mesh(tubeGeo, tubeMat);
    group.add(tube);

    // partícula que percorre o filamento, como um "pulso de cuidado"
    const travelerMat = new THREE.SpriteMaterial({ map: softGlow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const traveler = new THREE.Sprite(travelerMat);
    traveler.scale.set(0.5, 0.5, 1);
    group.add(traveler);

    // ---- Partículas ambientes (profundidade, muito discretas) ----
    const PARTICLE_COUNT = 46;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const speeds = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      speeds[i] = 0.05 + Math.random() * 0.08;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      map: softGlow, size: 0.16, transparent: true, opacity: 0.35,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    group.add(particles);

    // ---- Interação: parallax sutil ao mouse (com damping) ----
    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    function onPointerMove(e) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetX = nx; targetY = ny;
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // ---- Resize ----
    function onResize() {
      width = mount.clientWidth; height = mount.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    window.addEventListener('resize', onResize);

    // ---- Visibilidade: pausa quando fora da viewport ou aba oculta (perf) ----
    let running = true;
    document.addEventListener('visibilitychange', () => { running = !document.hidden; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => { running = en.isIntersecting && !document.hidden; });
    }, { threshold: 0.05 });
    io.observe(mount);

    // ---- Loop de animação: lento e contínuo, transmitindo calma ----
    const clock = new THREE.Clock();
    let raf;
    function animate() {
      raf = requestAnimationFrame(animate);
      if (!running) return;
      const t = clock.getElapsedTime();

      // damping do parallax
      curX += (targetX - curX) * 0.03;
      curY += (targetY - curY) * 0.03;
      group.rotation.y = curX * 0.06;
      group.rotation.x = -curY * 0.04;
      camera.position.x += (curX * 0.5 - camera.position.x) * 0.02;
      camera.position.y += (-curY * 0.3 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      // filamento: control point reage muito suavemente ao mouse + oscilação lenta
      curveMid.set(
        Math.sin(t * 0.12) * 0.35,
        0.6 + Math.sin(t * 0.09) * 0.18 + curY * -0.3,
        0.4 + curX * 0.4
      );
      curve = new THREE.QuadraticBezierCurve3(pointA.position, curveMid, pointB.position);
      tubeGeo.dispose();
      tubeGeo = new THREE.TubeGeometry(curve, 64, 0.018, 8, false);
      tube.geometry = tubeGeo;

      // pulso lento de opacidade/escala no filamento e nos pontos (calma, não pisca)
      const pulse = (Math.sin(t * 0.55) + 1) / 2; // 0..1 muito lento
      tubeMat.opacity = 0.35 + pulse * 0.35;
      const s = 1.5 + pulse * 0.25;
      pointA.scale.set(s, s, 1);
      pointB.scale.set(s * 0.96, s * 0.96, 1);

      // partícula viajante percorre o filamento em loop suave
      const travelT = (t * 0.06) % 1;
      const travelPos = curve.getPoint(travelT);
      traveler.position.copy(travelPos);
      traveler.material.opacity = 0.5 + Math.sin(travelT * Math.PI) * 0.4;

      // partículas ambientes: deriva lenta para cima, com wrap
      const posAttr = particleGeo.attributes.position;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        let y = posAttr.getY(i) + speeds[i] * 0.01;
        if (y > 3.2) y = -3.2;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    }
    animate();

    // cleanup se o hero for removido do DOM (SPA-safe, mesmo não sendo necessário aqui)
    window.addEventListener('pagehide', () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      renderer.dispose();
    });
  }
})();
