'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const TOP_IMAGES = [
  'had_mini_pekka.png',
  'head_adan.png',
  'head_black.png',
  'head_eve.png',
  'head_frida.png',
  'head_indian.png',
  'head_marylin.png',
  'head_nadal.png',
  'head_shakira.png',
  'head_van.png',
  'head_zombie.jpg',
]

const MIDDLE_IMAGES = [
  'body_adan.png',
  'body_eve.png',
  'body_frida.png',
  'body_marylin.png',
  'body_mini_pekka.png',
  'body_nadal.png',
  'body_shakira.png',
  'body_van.png',
  'body_zombie.jpg',
  'head_black.png',
  'middle_indian.png',
]

const BOTTOM_IMAGES = [
  'legs_adan.png',
  'legs_black.png',
  'legs_eve.png',
  'legs_frida.png',
  'legs_marylin.png',
  'legs_mini_pekka.png',
  'legs_nadal.png',
  'legs_shakira.png',
  'legs_van.png',
  'legs_zombie.jpg',
]

function pickRandom<T>(arr: T[], exclude?: T): T {
  const pool = exclude !== undefined ? arr.filter(x => x !== exclude) : arr
  return pool[Math.floor(Math.random() * pool.length)]
}

interface SlotState {
  current: string
  next: string
}

const ANIM_DURATION = 400 // ms

export default function CharacterWidget() {
  const [top, setTop] = useState<SlotState>(() => {
    const img = pickRandom(TOP_IMAGES)
    return { current: img, next: img }
  })
  const [middle, setMiddle] = useState<SlotState>(() => {
    const img = pickRandom(MIDDLE_IMAGES)
    return { current: img, next: img }
  })
  const [bottom, setBottom] = useState<SlotState>(() => {
    const img = pickRandom(BOTTOM_IMAGES)
    return { current: img, next: img }
  })

  const [isTransitioning, setIsTransitioning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cycle = useCallback(() => {
    setTop(prev => ({ ...prev, next: pickRandom(TOP_IMAGES, prev.current) }))
    setMiddle(prev => ({ ...prev, next: pickRandom(MIDDLE_IMAGES, prev.current) }))
    setBottom(prev => ({ ...prev, next: pickRandom(BOTTOM_IMAGES, prev.current) }))
    setIsTransitioning(true)

    setTimeout(() => {
      setTop(prev => ({ current: prev.next, next: prev.next }))
      setMiddle(prev => ({ current: prev.next, next: prev.next }))
      setBottom(prev => ({ current: prev.next, next: prev.next }))
      setIsTransitioning(false)
    }, ANIM_DURATION + 100)
  }, [])

  useEffect(() => {
    timerRef.current = setInterval(cycle, 5000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [cycle])

  // Slot style helpers
  const slotStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    // width: '100%' removed — margins now set width implicitly
  }

  const imgBaseStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  }

  return (
    <div
      style={{
        backgroundColor: '#1a1a2e',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
    >
      {/* TOP ROW — head, bottom-aligned */}
      <div
        style={{
          ...slotStyle,
          height: '130px',
          display: 'flex',
          alignItems: 'flex-end',
          marginLeft: '30%',
          marginRight: '30%',
        }}
      >
        {/* current */}
        <img
          key={`top-cur-${top.current}`}
          src={`/characters/top/${top.current}`}
          alt=""
          style={{
            ...imgBaseStyle,
            objectFit: 'contain',
            objectPosition: 'bottom',
            animation: isTransitioning
              ? `slideOutLeft ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1) 0ms forwards`
              : undefined,
          }}
        />
        {/* next — only visible while transitioning */}
        {isTransitioning && (
          <img
            key={`top-next-${top.next}`}
            src={`/characters/top/${top.next}`}
            alt=""
            style={{
              ...imgBaseStyle,
              objectFit: 'contain',
              objectPosition: 'bottom',
              animation: `slideInRight ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1) 0ms both`,
            }}
          />
        )}
      </div>

      {/* MIDDLE ROW — body, fixed height, opposite direction */}
      <div
        style={{
          ...slotStyle,
          height: '150px',
          flexShrink: 0,
          marginLeft: '30%',
          marginRight: '30%',
        }}
      >
        <img
          key={`mid-cur-${middle.current}`}
          src={`/characters/middle/${middle.current}`}
          alt=""
          style={{
            ...imgBaseStyle,
            objectFit: 'contain',
            objectPosition: 'center',
            animation: isTransitioning
              ? `slideOutRight ${ANIM_DURATION}ms cubic-bezier(0.2,0,0.4,1) 80ms forwards`
              : undefined,
          }}
        />
        {isTransitioning && (
          <img
            key={`mid-next-${middle.next}`}
            src={`/characters/middle/${middle.next}`}
            alt=""
            style={{
              ...imgBaseStyle,
              objectFit: 'contain',
              objectPosition: 'center',
              animation: `slideInLeft ${ANIM_DURATION}ms cubic-bezier(0.2,0,0.4,1) 80ms both`,
            }}
          />
        )}
      </div>

      {/* BOTTOM ROW — legs, top-aligned */}
      <div
        style={{
          ...slotStyle,
          height: '110px',
          display: 'flex',
          alignItems: 'flex-start',
          marginLeft: '30%',
          marginRight: '30%',
        }}
      >
        <img
          key={`bot-cur-${bottom.current}`}
          src={`/characters/bottom/${bottom.current}`}
          alt=""
          style={{
            ...imgBaseStyle,
            objectFit: 'contain',
            objectPosition: 'top',
            animation: isTransitioning
              ? `slideOutLeft ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1) 40ms forwards`
              : undefined,
          }}
        />
        {isTransitioning && (
          <img
            key={`bot-next-${bottom.next}`}
            src={`/characters/bottom/${bottom.next}`}
            alt=""
            style={{
              ...imgBaseStyle,
              objectFit: 'contain',
              objectPosition: 'top',
              animation: `slideInRight ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1) 40ms both`,
            }}
          />
        )}
      </div>
    </div>
  )
}
