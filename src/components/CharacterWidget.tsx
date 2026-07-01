'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const TOP_IMAGES = [
  'had_mini_pekka.png',
  'head_adan.png',
  'head_audrey.png',
  'head_black.png',
  'head_eve.png',
  'head_frida.png',
  'head_indian.png',
  'head_marylin.png',
  'head_nadal.png',
  'head_shakira.png',
  'head_van.png',
  'head_zombie.png',
]

const MIDDLE_IMAGES = [
  'body_adan.png',
  'body_audrey.png',
  'body_black.png',
  'body_eve.png',
  'body_frida.png',
  'body_marylin.png',
  'body_mini_pekka.png',
  'body_nadal.png',
  'body_shakira.png',
  'body_van.png',
  'body_zombie.png',
  'middle_indian.png',
]

const BOTTOM_IMAGES = [
  'bottom_indian.png',
  'legs_adan.png',
  'legs_audrey.png',
  'legs_black.png',
  'legs_eve.png',
  'legs_frida.png',
  'legs_marylin.png',
  'legs_mini_pekka.png',
  'legs_nadal.png',
  'legs_shakira.png',
  'legs_van.png',
  'legs_zombie.png',
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
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const restartAutoShuffle = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(cycle, 5000)
  }, [cycle])

  const scheduleResume = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(() => {
      restartAutoShuffle()
      resumeTimerRef.current = null
    }, 10000)
  }, [restartAutoShuffle])

  useEffect(() => {
    timerRef.current = setInterval(cycle, 5000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    }
  }, [cycle])

  const slotStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    flex: 1,
    maxWidth: '40%',
    margin: '0 auto',
    zIndex: 1,
  }

  const imgBaseStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
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
        position: 'relative',
      }}
    >
      <div style={{
        position: 'absolute',
        top: '0.5rem',
        left: 0,
        right: 0,
        textAlign: 'center',
        color: 'var(--color-accent)',
        opacity: 0.4,
        fontSize: '1rem',
        letterSpacing: '0.05em',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0,
        padding: '0 1rem',
        paddingLeft: '2rem',
      }}>
        esto no sirve para nada pero está entretenido
      </div>
      {/* TOP ROW â€” head, bottom-aligned */}
      <div style={{ display: 'flex', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', margin: '0 0.4rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          onClick={() => {
            stopAutoShuffle()
            scheduleResume()
            transitionSlot(setTop, TOP_IMAGES.length, -1, 'left')
          }}
        >
          <svg width="28" height="28" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <path transform="scale(-1,1) translate(-512,0)" d="M256 0C114.837 0 0 114.837 0 256s114.837 256 256 256 256-114.837 256-256S397.163 0 256 0zm79.083 271.083L228.416 377.749A21.275 21.275 0 0 1 213.333 384a21.277 21.277 0 0 1-15.083-6.251c-8.341-8.341-8.341-21.824 0-30.165L289.835 256l-91.584-91.584c-8.341-8.341-8.341-21.824 0-30.165s21.824-8.341 30.165 0l106.667 106.667c8.341 8.341 8.341 21.823 0 30.165z" fill="#7c3aed" />
          </svg>
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
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', margin: '0 0.4rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          onClick={() => {
            stopAutoShuffle()
            scheduleResume()
            transitionSlot(setTop, TOP_IMAGES.length, 1, 'right')
          }}
        >
          <svg width="28" height="28" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <path d="M256 0C114.837 0 0 114.837 0 256s114.837 256 256 256 256-114.837 256-256S397.163 0 256 0zm79.083 271.083L228.416 377.749A21.275 21.275 0 0 1 213.333 384a21.277 21.277 0 0 1-15.083-6.251c-8.341-8.341-8.341-21.824 0-30.165L289.835 256l-91.584-91.584c-8.341-8.341-8.341-21.824 0-30.165s21.824-8.341 30.165 0l106.667 106.667c8.341 8.341 8.341 21.823 0 30.165z" fill="#7c3aed" />
          </svg>
        </button>
      </div>

      {/* MIDDLE ROW â€” body, opposite direction */}
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', margin: '0 0.4rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          onClick={() => {
            stopAutoShuffle()
            scheduleResume()
            transitionSlot(setMiddle, MIDDLE_IMAGES.length, -1, 'right')
          }}
        >
          <svg width="28" height="28" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <path transform="scale(-1,1) translate(-512,0)" d="M256 0C114.837 0 0 114.837 0 256s114.837 256 256 256 256-114.837 256-256S397.163 0 256 0zm79.083 271.083L228.416 377.749A21.275 21.275 0 0 1 213.333 384a21.277 21.277 0 0 1-15.083-6.251c-8.341-8.341-8.341-21.824 0-30.165L289.835 256l-91.584-91.584c-8.341-8.341-8.341-21.824 0-30.165s21.824-8.341 30.165 0l106.667 106.667c8.341 8.341 8.341 21.823 0 30.165z" fill="#7c3aed" />
          </svg>
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
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', margin: '0 0.4rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          onClick={() => {
            stopAutoShuffle()
            scheduleResume()
            transitionSlot(setMiddle, MIDDLE_IMAGES.length, 1, 'left')
          }}
        >
          <svg width="28" height="28" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <path d="M256 0C114.837 0 0 114.837 0 256s114.837 256 256 256 256-114.837 256-256S397.163 0 256 0zm79.083 271.083L228.416 377.749A21.275 21.275 0 0 1 213.333 384a21.277 21.277 0 0 1-15.083-6.251c-8.341-8.341-8.341-21.824 0-30.165L289.835 256l-91.584-91.584c-8.341-8.341-8.341-21.824 0-30.165s21.824-8.341 30.165 0l106.667 106.667c8.341 8.341 8.341 21.823 0 30.165z" fill="#7c3aed" />
          </svg>
        </button>
      </div>

      {/* BOTTOM ROW â€” legs, top-aligned */}
      <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', margin: '0 0.4rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          onClick={() => {
            stopAutoShuffle()
            scheduleResume()
            transitionSlot(setBottom, BOTTOM_IMAGES.length, -1, 'left')
          }}
        >
          <svg width="28" height="28" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <path transform="scale(-1,1) translate(-512,0)" d="M256 0C114.837 0 0 114.837 0 256s114.837 256 256 256 256-114.837 256-256S397.163 0 256 0zm79.083 271.083L228.416 377.749A21.275 21.275 0 0 1 213.333 384a21.277 21.277 0 0 1-15.083-6.251c-8.341-8.341-8.341-21.824 0-30.165L289.835 256l-91.584-91.584c-8.341-8.341-8.341-21.824 0-30.165s21.824-8.341 30.165 0l106.667 106.667c8.341 8.341 8.341 21.823 0 30.165z" fill="#7c3aed" />
          </svg>
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
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', margin: '0 0.4rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          onClick={() => {
            stopAutoShuffle()
            scheduleResume()
            transitionSlot(setBottom, BOTTOM_IMAGES.length, 1, 'right')
          }}
        >
          <svg width="28" height="28" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <path d="M256 0C114.837 0 0 114.837 0 256s114.837 256 256 256 256-114.837 256-256S397.163 0 256 0zm79.083 271.083L228.416 377.749A21.275 21.275 0 0 1 213.333 384a21.277 21.277 0 0 1-15.083-6.251c-8.341-8.341-8.341-21.824 0-30.165L289.835 256l-91.584-91.584c-8.341-8.341-8.341-21.824 0-30.165s21.824-8.341 30.165 0l106.667 106.667c8.341 8.341 8.341 21.823 0 30.165z" fill="#7c3aed" />
          </svg>
        </button>
      </div>
    </div>
  )
}
