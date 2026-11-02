import { useEffect, useRef, useState } from 'react'

/*
 * LiveBackground
 * A lightweight animated backdrop in the spirit of Vanta.js "NET": drifting
 * points joined by lines, slow-moving colored light, and a soft reaction to the
 * pointer. Plain canvas, no dependencies. It sits behind the whole app, never
 * takes clicks, pauses when the tab is hidden, and holds still when the user
 * asks for reduced motion.
 *
 * Two looks share this file: the drifting "net" for desktop and tablet, and a
 * soft moving "fog" (in the spirit of Vanta.js FOG) for phones and the Android
 * app, where it reads as a calm, atmospheric backdrop instead of a busy mesh.
 */

const PALETTE = {
  dark: {
    node: [134, 174, 245],
    link: [122, 162, 235],
    orbs: [
      [110, 150, 230, 0.3],
      [150, 130, 226, 0.22],
      [92, 200, 190, 0.16],
    ],
    nodeAlpha: 1,
    linkAlpha: 0.62,
    haloAlpha: 0.16,
  },
  light: {
    node: [37, 99, 235],
    link: [59, 110, 220],
    orbs: [
      [80, 130, 235, 0.28],
      [140, 110, 230, 0.2],
      [40, 170, 160, 0.15],
    ],
    nodeAlpha: 0.9,
    linkAlpha: 0.5,
    haloAlpha: 0.14,
  },
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function NetBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return undefined

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    let width = 0
    let height = 0
    let dpr = 1
    let points = []
    let raf = 0
    let last = 0
    let resizeFrame = 0
    const pointer = { x: 0, y: 0, active: false }

    const isLight = () => document.documentElement.dataset.theme === 'light'

    function makePoint() {
      const angle = Math.random() * Math.PI * 2
      const speed = 0.18 + Math.random() * 0.34
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        bx: Math.cos(angle) * speed,
        by: Math.sin(angle) * speed,
        vx: 0,
        vy: 0,
        r: 1.6 + Math.random() * 1.9,
      }
    }

    function resize() {
      resizeFrame = 0
      width = window.innerWidth
      height = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const small = width < 700
      const target = Math.round(clamp((width * height) / (small ? 9000 : 13000), 40, 130))

      if (points.length > target) {
        points.length = target
      }
      while (points.length < target) points.push(makePoint())
      points.forEach((p) => {
        p.x = Math.min(p.x, width)
        p.y = Math.min(p.y, height)
      })

      if (motionQuery.matches) draw(performance.now())
    }

    function onResize() {
      if (!resizeFrame) resizeFrame = requestAnimationFrame(resize)
    }

    function step(dt) {
      const reach = 190
      for (const p of points) {
        // Drift back toward the point's own heading after being disturbed.
        p.vx += (p.bx - p.vx) * 0.03 * dt
        p.vy += (p.by - p.vy) * 0.03 * dt

        if (pointer.active) {
          const dx = pointer.x - p.x
          const dy = pointer.y - p.y
          const dist = Math.hypot(dx, dy)
          if (dist < reach && dist > 1) {
            const pull = ((reach - dist) / reach) * 0.05 * dt
            p.vx += (dx / dist) * pull
            p.vy += (dy / dist) * pull
          }
        }

        p.x += p.vx * dt
        p.y += p.vy * dt

        if (p.x < -10) { p.x = -10; p.bx = Math.abs(p.bx); p.vx = Math.abs(p.vx) }
        if (p.x > width + 10) { p.x = width + 10; p.bx = -Math.abs(p.bx); p.vx = -Math.abs(p.vx) }
        if (p.y < -10) { p.y = -10; p.by = Math.abs(p.by); p.vy = Math.abs(p.vy) }
        if (p.y > height + 10) { p.y = height + 10; p.by = -Math.abs(p.by); p.vy = -Math.abs(p.vy) }
      }
    }

    function draw(now) {
      const theme = PALETTE[isLight() ? 'light' : 'dark']
      const t = now / 1000
      ctx.clearRect(0, 0, width, height)

      // Slow colored light.
      const size = Math.max(width, height) * 0.42
      theme.orbs.forEach(([r, g, b, a], i) => {
        const x = width * (0.5 + 0.4 * Math.sin(t * (0.07 + i * 0.03) + i * 2.1))
        const y = height * (0.5 + 0.36 * Math.cos(t * (0.06 + i * 0.025) + i * 1.3))
        const glow = ctx.createRadialGradient(x, y, 0, x, y, size)
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`)
        glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
        ctx.fillStyle = glow
        ctx.fillRect(0, 0, width, height)
      })

      // Lines between nearby points.
      const maxDist = width < 700 ? 110 : 150
      const maxSq = maxDist * maxDist
      const [lr, lg, lb] = theme.link
      ctx.lineWidth = 1
      for (let i = 0; i < points.length; i += 1) {
        const a = points[i]
        for (let j = i + 1; j < points.length; j += 1) {
          const b = points[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const sq = dx * dx + dy * dy
          if (sq < maxSq) {
            const alpha = (1 - Math.sqrt(sq) / maxDist) * theme.linkAlpha
            ctx.strokeStyle = `rgba(${lr}, ${lg}, ${lb}, ${alpha.toFixed(3)})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }

        // A brighter line from the pointer to nearby points.
        if (pointer.active) {
          const dx = a.x - pointer.x
          const dy = a.y - pointer.y
          const dist = Math.hypot(dx, dy)
          if (dist < 190) {
            const alpha = (1 - dist / 190) * Math.min(0.9, theme.linkAlpha * 1.9)
            ctx.strokeStyle = `rgba(${lr}, ${lg}, ${lb}, ${alpha.toFixed(3)})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(pointer.x, pointer.y)
            ctx.stroke()
          }
        }
      }

      // The points themselves.
      const [nr, ng, nb] = theme.node
      for (const p of points) {
        // soft halo, then the bright core
        ctx.fillStyle = `rgba(${nr}, ${ng}, ${nb}, ${theme.haloAlpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `rgba(${nr}, ${ng}, ${nb}, ${theme.nodeAlpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    function frame(now) {
      raf = requestAnimationFrame(frame)
      const dt = clamp((now - last) / 16.667, 0.2, 3)
      last = now
      step(dt)
      draw(now)
    }

    function start() {
      if (raf || motionQuery.matches || document.hidden) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    function onVisibility() {
      if (document.hidden) stop()
      else start()
    }

    function onMotionChange() {
      stop()
      if (motionQuery.matches) draw(performance.now())
      else start()
    }

    function onPointerMove(event) {
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.active = true
    }

    function onPointerLeave() {
      pointer.active = false
    }

    resize()
    start()

    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave)
    window.addEventListener('pointercancel', onPointerLeave)
    window.addEventListener('blur', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibility)
    motionQuery.addEventListener?.('change', onMotionChange)

    return () => {
      stop()
      if (resizeFrame) cancelAnimationFrame(resizeFrame)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('pointercancel', onPointerLeave)
      window.removeEventListener('blur', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      motionQuery.removeEventListener?.('change', onMotionChange)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="live-bg"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  )
}
/* ---------------------------------------------------------------------------
 * Fog (phones and the Android app)
 * Large soft colored clouds drifting and merging, drawn at a fraction of the
 * screen size and stretched up so the edges stay naturally blurred. Cheap
 * enough for phones: ~12 gradients on a tiny canvas, capped at 30 fps.
 * ------------------------------------------------------------------------- */

/* A deterministic set of smaller, faster clouds layered over the big ones.
 * They give the fog its billowy texture and let darker gaps show between. */
function detailClouds(palette, count, alpha) {
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  return Array.from({ length: count }, (_, i) => {
    const [r, g, b] = palette[i % palette.length]
    return [r, g, b, alpha * (0.7 + rand() * 0.6), 0.16 + rand() * 0.14, 0.25 + rand() * 0.3, 0.22 + rand() * 0.3, rand() * 6.28]
  })
}

const FOG = {
  dark: {
    composite: 'lighter',
    // [r, g, b, alpha, radius (share of the longer side), speedX, speedY, phase]
    clouds: [
      [108, 103, 255, 0.24, 0.62, 0.21, 0.17, 0.0],
      [173, 173, 255, 0.15, 0.50, 0.17, 0.26, 1.7],
      [180, 180, 255, 0.10, 0.42, 0.29, 0.19, 3.1],
      [96, 140, 255, 0.24, 0.56, 0.14, 0.23, 4.4],
      [140, 110, 255, 0.22, 0.48, 0.24, 0.15, 5.6],
      [108, 103, 255, 0.18, 0.40, 0.19, 0.31, 2.4],
      [173, 173, 255, 0.14, 0.36, 0.33, 0.21, 0.9],
      [92, 190, 230, 0.12, 0.44, 0.16, 0.28, 3.8],
      ...detailClouds([[180, 180, 255], [108, 103, 255], [173, 173, 255], [120, 170, 255]], 10, 0.1),
    ],
    // Deepen the lower part of the screen, like the reference, so forms stay readable.
    shade: [
      [0, 'rgba(6, 10, 18, 0)'],
      [0.45, 'rgba(6, 10, 18, 0.18)'],
      [1, 'rgba(6, 10, 18, 0.62)'],
    ],
  },
  light: {
    composite: 'source-over',
    clouds: [
      [120, 120, 255, 0.26, 0.62, 0.21, 0.17, 0.0],
      [170, 150, 255, 0.22, 0.50, 0.17, 0.26, 1.7],
      [150, 180, 255, 0.24, 0.46, 0.29, 0.19, 3.1],
      [110, 150, 255, 0.22, 0.56, 0.14, 0.23, 4.4],
      [190, 160, 255, 0.20, 0.48, 0.24, 0.15, 5.6],
      [130, 130, 255, 0.16, 0.40, 0.19, 0.31, 2.4],
      [160, 200, 255, 0.18, 0.44, 0.16, 0.28, 3.8],
      ...detailClouds([[120, 120, 255], [170, 150, 255], [140, 180, 255]], 10, 0.16),
    ],
    shade: [
      [0, 'rgba(255, 255, 255, 0)'],
      [1, 'rgba(240, 244, 255, 0.35)'],
    ],
  },
}

function FogBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return undefined

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const SCALE = 6 // canvas pixels are 6 css pixels wide; upscaling does the blurring
    const FRAME_MS = 1000 / 30

    let w = 0
    let h = 0
    let raf = 0
    let lastDraw = 0
    let resizeFrame = 0
    // Pointer/touch is a bright cloud that eases toward the finger.
    const touch = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, power: 0, target: 0 }

    const isLight = () => document.documentElement.dataset.theme === 'light'

    function resize() {
      resizeFrame = 0
      w = Math.max(24, Math.ceil(window.innerWidth / SCALE))
      h = Math.max(40, Math.ceil(window.innerHeight / SCALE))
      canvas.width = w
      canvas.height = h
      draw(performance.now())
    }

    function onResize() {
      if (!resizeFrame) resizeFrame = requestAnimationFrame(resize)
    }

    function cloud(x, y, radius, r, g, b, a) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius)
      glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`)
      glow.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${(a * 0.45).toFixed(3)})`)
      glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, w, h)
    }

    function draw(now) {
      const look = FOG[isLight() ? 'light' : 'dark']
      const t = now / 1000
      const side = Math.max(w, h)

      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = look.composite

      for (const [r, g, b, a, size, sx, sy, phase] of look.clouds) {
        // Two overlapping sine waves per axis make the path wander instead of loop neatly.
        const x = w * (0.5 + 0.34 * Math.sin(t * sx + phase) + 0.14 * Math.sin(t * sx * 2.3 + phase * 1.7))
        const y = h * (0.5 + 0.36 * Math.cos(t * sy + phase * 0.8) + 0.12 * Math.cos(t * sy * 1.9 + phase))
        const pulse = 1 + 0.12 * Math.sin(t * 0.4 + phase)
        cloud(x, y, side * size * pulse, r, g, b, a)
      }

      if (touch.power > 0.01) {
        cloud(touch.x * w, touch.y * h, side * 0.34, 190, 190, 255, 0.34 * touch.power)
      }

      ctx.globalCompositeOperation = 'source-over'
      const shade = ctx.createLinearGradient(0, 0, 0, h)
      look.shade.forEach(([stop, color]) => shade.addColorStop(stop, color))
      ctx.fillStyle = shade
      ctx.fillRect(0, 0, w, h)
    }

    function frame(now) {
      raf = requestAnimationFrame(frame)
      if (now - lastDraw < FRAME_MS) return
      lastDraw = now
      touch.x += (touch.tx - touch.x) * 0.12
      touch.y += (touch.ty - touch.y) * 0.12
      touch.power += (touch.target - touch.power) * 0.06
      draw(now)
    }

    function start() {
      if (raf || motionQuery.matches || document.hidden) return
      raf = requestAnimationFrame(frame)
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    function onVisibility() {
      if (document.hidden) stop()
      else start()
    }

    function onMotionChange() {
      stop()
      if (motionQuery.matches) draw(performance.now())
      else start()
    }

    function onPointer(event) {
      touch.tx = event.clientX / window.innerWidth
      touch.ty = event.clientY / window.innerHeight
      touch.target = 1
    }

    function onPointerEnd() {
      touch.target = 0
    }

    resize()
    start()

    window.addEventListener('resize', onResize)
    window.addEventListener('pointerdown', onPointer, { passive: true })
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerup', onPointerEnd)
    window.addEventListener('pointercancel', onPointerEnd)
    window.addEventListener('blur', onPointerEnd)
    document.addEventListener('visibilitychange', onVisibility)
    motionQuery.addEventListener?.('change', onMotionChange)

    return () => {
      stop()
      if (resizeFrame) cancelAnimationFrame(resizeFrame)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerEnd)
      window.removeEventListener('blur', onPointerEnd)
      document.removeEventListener('visibilitychange', onVisibility)
      motionQuery.removeEventListener?.('change', onMotionChange)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="live-bg live-bg-fog"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  )
}

/* Phones (and the Android app, whatever its screen size) get the fog;
 * everything else gets the net. */
const PHONE_QUERY = '(max-width: 700px)'

function useIsPhone() {
  const read = () =>
    Boolean(window.Capacitor?.isNativePlatform?.()) || window.matchMedia(PHONE_QUERY).matches

  const [phone, setPhone] = useState(read)

  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY)
    const update = () => setPhone(read())
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  return phone
}

export default function LiveBackground() {
  return useIsPhone() ? <FogBackground /> : <NetBackground />
}