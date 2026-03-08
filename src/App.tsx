import { lazy, Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGraphStore } from './store/useGraphStore'
import { palette } from './styles/palette'
import SeoContent from './components/SeoContent'

const Experience = lazy(() => import('./scenes/Experience'))

export default function App() {
  const language = useGraphStore((state) => state.language)
  const setLanguage = useGraphStore((state) => state.setLanguage)

  // Keep the <html lang> attribute in sync with the selected language so that
  // search engines and assistive technologies always see the correct language.
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Visually-hidden HTML content for search-engine indexing */}
      <SeoContent />
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
          display: 'flex',
          gap: 6,
          padding: 4,
          borderRadius: 8,
          border: `1px solid ${palette.ctaSecondary}`,
          backgroundColor: `${palette.fog}CC`,
        }}
      >
        <button
          type="button"
          onClick={() => setLanguage('en')}
          aria-label="Switch to English"
          style={{
            border: 'none',
            borderRadius: 6,
            padding: '5px 8px',
            cursor: 'pointer',
            fontSize: 12,
            color: language === 'en' ? palette.background : palette.textPrimary,
            backgroundColor: language === 'en' ? palette.textPrimary : 'transparent',
          }}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLanguage('fr')}
          aria-label="Basculer en français"
          style={{
            border: 'none',
            borderRadius: 6,
            padding: '5px 8px',
            cursor: 'pointer',
            fontSize: 12,
            color: language === 'fr' ? palette.background : palette.textPrimary,
            backgroundColor: language === 'fr' ? palette.textPrimary : 'transparent',
          }}
        >
          FR
        </button>
      </div>

      <Canvas
        camera={{ position: [0, 0, 8], fov: 75 }}
        dpr={[0.8, 1]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>
    </div>
  )
}
