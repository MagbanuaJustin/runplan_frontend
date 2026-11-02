import { useEffect, useRef } from 'react'

/*
 * LiveBackground
 * A lightweight animated backdrop in the spirit of Vanta.js "NET": drifting
 * points joined by lines, slow-moving colored light, and a soft reaction to the
 * pointer. Plain canvas, no dependencies. It sits behind the whole app, never
 * takes clicks, pauses when the tab is hidden, and holds still when the user
 * asks for reduced motion.
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

export default function LiveBackground() {
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