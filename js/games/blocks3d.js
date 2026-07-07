/**
 * games/blocks3d.js — the classic "stack the tower" game rendered with a
 * LOCALLY-VENDORED three.js (assets/vendor/three.min.js, r128 — NO CDN at
 * runtime), reproducing the original Effects-library/games/blocks camera:
 * an OrthographicCamera looking from a (1,1,1) corner toward the tower so the
 * blocks stack upward in true isometric 3D. Re-skinned to the terminal palette
 * (green↔cyan). Runs IN-PLACE on the Proyectos section via PF.embed (no modal,
 * no window chrome). GSAP tweens from the original are replaced with plain
 * rAF lerps to keep the zero-runtime-dependency rule (Google Fonts only).
 *
 * Embed contract: { preview(stage), play(stage, onOver), pause(), resume(), stop() }.
 */
window.PF = window.PF || {};
PF.games = PF.games || {};

(function () {
  'use strict';

  function sfx(n) { if (window.PF && PF.audio && PF.audio.play) PF.audio.play(n); }

  var SIZE = 10;         // base block footprint (world units)
  var BLOCK_H = 2.4;     // block height
  var MOVE = 11;         // travel amplitude of the sliding block
  // Checkpoint 5: noticeably slower / more playable oscillation.
  var BASE_SPEED = 0.05;
  var SPEED_STEP = 0.003;
  var MAX_SPEED = 0.16;

  var THREE = window.THREE;
  var renderer, scene, camera, dirLight, ambLight, stageEl, scoreEl;
  var raf = null;
  var running = false;
  var blocks = [];       // { mesh, dim:{x,y,z}, pos:{x,y,z}, axis }
  var chopped = [];      // falling debris meshes
  var current = null;    // active sliding block
  var speed = BASE_SPEED;
  var dir = 1;
  var score = 0;
  var camY = 0, camTargetY = 0;
  var onOverCb = null;
  var inputHandler = null, keyHandler = null;

  function sizeOf() {
    var r = stageEl.getBoundingClientRect();
    return { w: Math.max(1, Math.floor(r.width)), h: Math.max(1, Math.floor(r.height)) };
  }

  function ensure() {
    if (renderer) return;
    if (!THREE) THREE = window.THREE;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var s = sizeOf();
    renderer.setSize(s.w, s.h);
    renderer.domElement.className = 'pf-blocks3d-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stageEl.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    var d = 18;
    var aspect = s.w / s.h;
    camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, -400, 800);
    camera.position.set(24, 24, 24);
    camera.lookAt(0, 0, 0);

    dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(6, 20, 8);
    scene.add(dirLight);
    ambLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambLight);

    // Live HTML score chip (shown at game over, inside the stage).
    scoreEl = document.createElement('div');
    scoreEl.className = 'pf-blocks3d-score mono';
    scoreEl.setAttribute('aria-hidden', 'true');
    stageEl.appendChild(scoreEl);
  }

  function resize() {
    if (!renderer) return;
    var s = sizeOf();
    renderer.setSize(s.w, s.h);
    var d = 18;
    var aspect = s.w / s.h;
    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.top = d;
    camera.bottom = -d;
    camera.updateProjectionMatrix();
  }

  function colorFor(i) {
    if (i === 0) return new THREE.Color().setHSL(150 / 360, 0.35, 0.28);
    // Checkpoint 5: strictly ALTERNATE green and cyan per block (not all-cyan).
    return (i % 2)
      ? new THREE.Color().setHSL(180 / 360, 1, 0.55)   // cyan
      : new THREE.Color().setHSL(120 / 360, 1, 0.50);  // green
  }

  // Checkpoint 6 (T2): every block gets a crisp complementary EDGE outline via
  // EdgesGeometry + LineSegments (r128), added as a CHILD so it inherits the
  // block's position/rotation. Edge color = a darker shade of the block color
  // so it reads as a neon rim without changing the green↔cyan alternation.
  function addEdges(mesh, color) {
    var edgeGeo = new THREE.EdgesGeometry(mesh.geometry);
    var edgeColor = (color && color.clone) ? color.clone() : new THREE.Color(color);
    edgeColor.offsetHSL(0, 0.08, -0.26);
    var lines = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: edgeColor }));
    lines.name = 'pf-edges';
    mesh.add(lines);
    return lines;
  }

  function disposeMesh(mesh) {
    if (!mesh) return;
    for (var i = mesh.children.length - 1; i >= 0; i--) {
      var c = mesh.children[i];
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
      mesh.remove(c);
    }
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
  }

  function makeBlock(dim, pos, color) {
    var geo = new THREE.BoxGeometry(dim.x, dim.y, dim.z);
    var mat = new THREE.MeshToonMaterial({ color: color });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, pos.y, pos.z);
    addEdges(mesh, mat.color);
    scene.add(mesh);
    return mesh;
  }

  function clearScene() {
    blocks.forEach(function (b) { scene.remove(b.mesh); disposeMesh(b.mesh); });
    chopped.forEach(function (m) { scene.remove(m); disposeMesh(m); });
    blocks = [];
    chopped = [];
    current = null;
  }

  function addBase() {
    var dim = { x: SIZE, y: BLOCK_H, z: SIZE };
    var pos = { x: 0, y: 0, z: 0 };
    blocks.push({ mesh: makeBlock(dim, pos, colorFor(0)), dim: dim, pos: pos, axis: 'x' });
  }

  function spawnMoving() {
    var base = blocks[blocks.length - 1];
    var axis = blocks.length % 2 ? 'z' : 'x';
    var dim = { x: base.dim.x, y: BLOCK_H, z: base.dim.z };
    var pos = { x: base.pos.x, y: base.pos.y + BLOCK_H, z: base.pos.z };
    pos[axis] = base.pos[axis] - MOVE;
    dir = 1;
    current = { mesh: makeBlock(dim, pos, colorFor(blocks.length)), dim: dim, pos: pos, axis: axis };
  }

  function buildStaticTower() {
    clearScene();
    addBase();
    var widths = [10, 9, 7.4, 6, 4.6];
    var px = 0, pz = 0;
    for (var i = 1; i < widths.length; i++) {
      var axis = i % 2 ? 'z' : 'x';
      var dim = { x: i % 2 ? widths[i] : widths[i], y: BLOCK_H, z: widths[i] };
      // gentle stagger so the idle tower reads as a real stack
      if (axis === 'x') px += (Math.random() - 0.5) * 1.6; else pz += (Math.random() - 0.5) * 1.6;
      var pos = { x: px, y: i * BLOCK_H, z: pz };
      blocks.push({ mesh: makeBlock(dim, pos, colorFor(i)), dim: dim, pos: pos, axis: axis });
    }
    camTargetY = camY = (blocks.length - 1) * BLOCK_H * 0.5;
    updateCamera();
    renderer.render(scene, camera);
  }

  function updateCamera() {
    camera.position.set(24, 24 + camY, 24);
    camera.lookAt(0, camY, 0);
  }

  function place() {
    var base = blocks[blocks.length - 1];
    var axis = current.axis;
    var offset = current.pos[axis] - base.pos[axis];
    var overlap = base.dim[axis === 'x' ? 'x' : 'z'] - Math.abs(offset);
    var dimKey = axis; // 'x' or 'z'

    if (overlap <= 0.6) {
      // total miss → the block topples and the round ends
      current.mesh.material.color.offsetHSL(0, -0.4, -0.1);
      chopped.push(current.mesh);
      current = null;
      return endGame();
    }

    // trim the placed block to the overlap, spawn the chopped remainder falling
    var choppedSize = current.dim[dimKey] - overlap;
    var placedCenter = base.pos[axis] + offset / 2;

    scene.remove(current.mesh);
    // dispose the old edge outline (geometry + material) but KEEP the shared box
    // material — the trimmed placed block reuses current.mesh.material below.
    for (var ci = current.mesh.children.length - 1; ci >= 0; ci--) {
      var cc = current.mesh.children[ci];
      if (cc.geometry) cc.geometry.dispose();
      if (cc.material) cc.material.dispose();
      current.mesh.remove(cc);
    }
    current.mesh.geometry.dispose();
    var newDim = { x: current.dim.x, y: BLOCK_H, z: current.dim.z };
    newDim[dimKey] = overlap;
    var newPos = { x: current.pos.x, y: current.pos.y, z: current.pos.z };
    newPos[axis] = placedCenter;
    var placedMesh = new THREE.Mesh(new THREE.BoxGeometry(newDim.x, newDim.y, newDim.z), current.mesh.material);
    placedMesh.position.set(newPos.x, newPos.y, newPos.z);
    addEdges(placedMesh, placedMesh.material.color);
    scene.add(placedMesh);
    blocks.push({ mesh: placedMesh, dim: newDim, pos: newPos, axis: axis });

    if (choppedSize > 0.2) {
      var chDim = { x: current.dim.x, y: BLOCK_H, z: current.dim.z };
      chDim[dimKey] = choppedSize;
      var chPos = { x: current.pos.x, y: current.pos.y, z: current.pos.z };
      chPos[axis] = offset > 0 ? placedCenter + overlap / 2 + choppedSize / 2 : placedCenter - overlap / 2 - choppedSize / 2;
      var chMesh = new THREE.Mesh(new THREE.BoxGeometry(chDim.x, chDim.y, chDim.z), current.mesh.material.clone());
      chMesh.position.set(chPos.x, chPos.y, chPos.z);
      chMesh.userData.vy = -0.05;
      chMesh.userData.side = offset > 0 ? 1 : -1;
      addEdges(chMesh, chMesh.material.color);
      scene.add(chMesh);
      chopped.push(chMesh);
    }

    score++;
    // near-full overlap = a "perfect" stack → brighter blip.
    sfx(choppedSize <= 0.6 ? 'perfect' : 'place');
    if (scoreEl) scoreEl.textContent = '';
    speed = Math.min(MAX_SPEED, speed + SPEED_STEP);
    camTargetY = (blocks.length - 1) * BLOCK_H;
    spawnMoving();
  }

  function endGame() {
    running = false;
    sfx('over');
    if (scoreEl) scoreEl.textContent = 'BLOQUES: ' + score;
    if (onOverCb) onOverCb(score);
  }

  function tick() {
    if (running && current) {
      current.pos[current.axis] += dir * speed * SIZE * 0.4;
      if (current.pos[current.axis] > MOVE) { current.pos[current.axis] = MOVE; dir = -1; }
      else if (current.pos[current.axis] < -MOVE) { current.pos[current.axis] = -MOVE; dir = 1; }
      current.mesh.position[current.axis] = current.pos[current.axis];
    }
    // animate chopped debris falling + spinning
    for (var i = chopped.length - 1; i >= 0; i--) {
      var m = chopped[i];
      m.userData.vy = (m.userData.vy || -0.05) - 0.03;
      m.position.y += m.userData.vy;
      m.rotation.x += 0.04;
      m.rotation.z += 0.03 * (m.userData.side || 1);
      if (m.position.y < camY - 40) { scene.remove(m); disposeMesh(m); chopped.splice(i, 1); }
    }
    camY += (camTargetY - camY) * 0.12;
    updateCamera();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  function onAction(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (running && current) place();
  }
  function onKey(e) {
    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') onAction(e);
  }

  // ---- embed contract ----------------------------------------------------

  function preview(stage) {
    stageEl = stage;
    ensure();
    resize();
    running = false;
    speed = BASE_SPEED;
    buildStaticTower();
  }

  function play(stage, onOver) {
    stageEl = stage;
    ensure();
    resize();
    onOverCb = onOver;
    if (scoreEl) scoreEl.textContent = '';
    clearScene();
    score = 0;
    speed = BASE_SPEED;
    addBase();
    camTargetY = camY = 0;
    updateCamera();
    spawnMoving();
    running = true;

    inputHandler = onAction;
    keyHandler = onKey;
    renderer.domElement.addEventListener('pointerdown', inputHandler);
    stageEl.addEventListener('keydown', keyHandler);
    window.addEventListener('resize', resize);

    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function pause() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  function resume() {
    if (raf) return;
    running = true;
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (renderer && inputHandler) renderer.domElement.removeEventListener('pointerdown', inputHandler);
    if (stageEl && keyHandler) stageEl.removeEventListener('keydown', keyHandler);
    window.removeEventListener('resize', resize);
    inputHandler = null;
    keyHandler = null;
    onOverCb = null;
  }

  PF.games.blocks3d = {
    preview: preview,
    play: play,
    pause: pause,
    resume: resume,
    stop: stop,
    available: function () { return !!(window.THREE); }
  };

  // ---- modal adapter (T6) -------------------------------------------------
  // On mobile the inline preview is hidden and Blocks opens in the shared game
  // modal (init/start/stop contract). Reuses the embed play/stop; adds a retry
  // button on game over so the round is replayable without closing the modal.
  var modalStage = null, modalOverEl = null;

  function showModalRetry() {
    if (!modalStage) return;
    if (modalOverEl) { modalOverEl.parentNode && modalOverEl.parentNode.removeChild(modalOverEl); }
    modalOverEl = document.createElement('div');
    modalOverEl.className = 'pf-blocks-modal-over';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pf-game-retry mono';
    btn.textContent = 'Reintentar';
    btn.addEventListener('click', function () {
      if (modalOverEl && modalOverEl.parentNode) modalOverEl.parentNode.removeChild(modalOverEl);
      modalOverEl = null;
      play(modalStage, showModalRetry);
      try { modalStage.focus({ preventScroll: true }); } catch (e) { /* no-op */ }
    });
    modalOverEl.appendChild(btn);
    modalStage.appendChild(modalOverEl);
    btn.focus();
  }

  PF.games.blocks = {
    init: function (mountEl) {
      mountEl.innerHTML = '';
      modalStage = document.createElement('div');
      modalStage.className = 'pf-blocks-modal-stage';
      modalStage.setAttribute('tabindex', '0');
      mountEl.appendChild(modalStage);
      modalOverEl = null;
    },
    start: function () {
      if (!modalStage) return;
      play(modalStage, showModalRetry);
      try { modalStage.focus({ preventScroll: true }); } catch (e) { /* no-op */ }
    },
    stop: function () {
      stop();
      if (modalOverEl && modalOverEl.parentNode) modalOverEl.parentNode.removeChild(modalOverEl);
      modalOverEl = null;
      modalStage = null;
    },
    available: function () { return !!(window.THREE); }
  };
})();
