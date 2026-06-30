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

function wrapIndex(i: number, len: number): number {
  return ((i % len) + len) % len
}

interface SlotState {
  index: number
  nextIndex: number
  transitioning: boolean
  enterFrom: 'left' | 'right'
}

const ANIM_DURATION = 400 // ms

function randomNextIndex(currentIndex: number, len: number): number {
  return wrapIndex(
    Math.floor(Math.random() * (len - 1)) + currentIndex + 1,
    len
  )
}

export default function CharacterWidget() {
  const [top, setTop] = useState<SlotState>(() => {
    const index = Math.floor(Math.random() * TOP_IMAGES.length)
    return { index, nextIndex: index, transitioning: false, enterFrom: 'right' }
  })
  const [middle, setMiddle] = useState<SlotState>(() => {
    const index = Math.floor(Math.random() * MIDDLE_IMAGES.length)
    return { index, nextIndex: index, transitioning: false, enterFrom: 'left' }
  })
  const [bottom, setBottom] = useState<SlotState>(() => {
    const index = Math.floor(Math.random() * BOTTOM_IMAGES.length)
    return { index, nextIndex: index, transitioning: false, enterFrom: 'right' }
  })

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopAutoShuffle = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const transitionSlot = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<SlotState>>,
      len: number,
      delta: number,
      enterFrom: 'left' | 'right'
    ) => {
      setter(prev => {
        if (prev.transitioning) return prev
        const nextIndex = wrapIndex(prev.index + delta, len)
        return { ...prev, nextIndex, transitioning: true, enterFrom }
      })
      setTimeout(() => {
        setter(prev => {
          if (!prev.transitioning) return prev
          return { ...prev, index: prev.nextIndex, transitioning: false }
        })
      }, ANIM_DURATION + 100)
    },
    []
  )

  const cycle = useCallback(() => {
    setTop(prev => ({
      ...prev,
      nextIndex: randomNextIndex(prev.index, TOP_IMAGES.length),
      transitioning: true,
      enterFrom: 'right',
    }))
    setMiddle(prev => ({
      ...prev,
      nextIndex: randomNextIndex(prev.index, MIDDLE_IMAGES.length),
      transitioning: true,
      enterFrom: 'left',
    }))
    setBottom(prev => ({
      ...prev,
      nextIndex: randomNextIndex(prev.index, BOTTOM_IMAGES.length),
      transitioning: true,
      enterFrom: 'right',
    }))

    setTimeout(() => {
      setTop(prev => ({ ...prev, index: prev.nextIndex, transitioning: false }))
      setMiddle(prev => ({ ...prev, index: prev.nextIndex, transitioning: false }))
      setBottom(prev => ({ ...prev, index: prev.nextIndex, transitioning: false }))
    }, ANIM_DURATION + 100)
  }, [])

  useEffect(() => {
    timerRef.current = setInterval(cycle, 5000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [cycle])

  const slotStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    flex: 1,
    maxWidth: '40%',
    margin: '0 auto',
  }

  const imgBaseStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  }

  const btnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: '#7c3aed',
    fontSize: '1.4rem',
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
    lineHeight: 1,
  }

  const getExitAnim = (enterFrom: 'left' | 'right', delayMs: number): string =>
    enterFrom === 'right'
      ? `slideOutLeft ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1) ${delayMs}ms forwards`
      : `slideOutRight ${ANIM_DURATION}ms cubic-bezier(0.2,0,0.4,1) ${delayMs}ms forwards`

  const getEnterAnim = (enterFrom: 'left' | 'right', delayMs: number): string =>
    enterFrom === 'right'
      ? `slideInRight ${ANIM_DURATION}ms cubic-bezier(0.4,0,0.2,1) ${delayMs}ms both`
      : `slideInLeft ${ANIM_DURATION}ms cubic-bezier(0.2,0,0.4,1) ${delayMs}ms both`

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
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          style={btnStyle}
          onClick={() => {
            stopAutoShuffle()
            transitionSlot(setTop, TOP_IMAGES.length, -1, 'left')
          }}
        >
          ‹
        </button>
        <div
          style={{
            ...slotStyle,
            height: '173px',
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <img
            key={`top-cur-${top.index}`}
            src={`/characters/top/${TOP_IMAGES[top.index]}`}
            alt=""
            style={{
              ...imgBaseStyle,
              objectFit: 'contain',
              objectPosition: 'bottom',
              animation: top.transitioning ? getExitAnim(top.enterFrom, 0) : undefined,
            }}
          />
          {top.transitioning && (
            <img
              key={`top-next-${top.nextIndex}`}
              src={`/characters/top/${TOP_IMAGES[top.nextIndex]}`}
              alt=""
              style={{
                ...imgBaseStyle,
                objectFit: 'contain',
                objectPosition: 'bottom',
                animation: getEnterAnim(top.enterFrom, 0),
              }}
            />
          )}
        </div>
        <button
          style={btnStyle}
          onClick={() => {
            stopAutoShuffle()
            transitionSlot(setTop, TOP_IMAGES.length, 1, 'right')
          }}
        >
          ›
        </button>
      </div>

      {/* MIDDLE ROW — body, opposite direction */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          style={btnStyle}
          onClick={() => {
            stopAutoShuffle()
            transitionSlot(setMiddle, MIDDLE_IMAGES.length, -1, 'right')
          }}
        >
          ‹
        </button>
        <div
          style={{
            ...slotStyle,
            height: '150px',
          }}
        >
          <img
            key={`mid-cur-${middle.index}`}
            src={`/characters/middle/${MIDDLE_IMAGES[middle.index]}`}
            alt=""
            style={{
              ...imgBaseStyle,
              objectFit: 'contain',
              objectPosition: 'center',
              animation: middle.transitioning ? getExitAnim(middle.enterFrom, 80) : undefined,
            }}
          />
          {middle.transitioning && (
            <img
              key={`mid-next-${middle.nextIndex}`}
              src={`/characters/middle/${MIDDLE_IMAGES[middle.nextIndex]}`}
              alt=""
              style={{
                ...imgBaseStyle,
                objectFit: 'contain',
                objectPosition: 'center',
                animation: getEnterAnim(middle.enterFrom, 80),
              }}
            />
          )}
        </div>
        <button
          style={btnStyle}
          onClick={() => {
            stopAutoShuffle()
            transitionSlot(setMiddle, MIDDLE_IMAGES.length, 1, 'left')
          }}
        >
          ›
        </button>
      </div>

      {/* BOTTOM ROW — legs, top-aligned */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          style={btnStyle}
          onClick={() => {
            stopAutoShuffle()
            transitionSlot(setBottom, BOTTOM_IMAGES.length, -1, 'left')
          }}
        >
          ‹
        </button>
        <div
          style={{
            ...slotStyle,
            height: '225px',
            display: 'flex',
            alignItems: 'flex-start',
            paddingBottom: '1rem',
          }}
        >
          <img
            key={`bot-cur-${bottom.index}`}
            src={`/characters/bottom/${BOTTOM_IMAGES[bottom.index]}`}
            alt=""
            style={{
              ...imgBaseStyle,
              objectFit: 'contain',
              objectPosition: 'top',
              animation: bottom.transitioning ? getExitAnim(bottom.enterFrom, 40) : undefined,
            }}
          />
          {bottom.transitioning && (
            <img
              key={`bot-next-${bottom.nextIndex}`}
              src={`/characters/bottom/${BOTTOM_IMAGES[bottom.nextIndex]}`}
              alt=""
              style={{
                ...imgBaseStyle,
                objectFit: 'contain',
                objectPosition: 'top',
                animation: getEnterAnim(bottom.enterFrom, 40),
              }}
            />
          )}
        </div>
        <button
          style={btnStyle}
          onClick={() => {
            stopAutoShuffle()
            transitionSlot(setBottom, BOTTOM_IMAGES.length, 1, 'right')
          }}
        >
          ›
        </button>
      </div>
    </div>
  )
}
