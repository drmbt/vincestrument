import { MainLayout } from './components/Layout/MainLayout'
import { KeyboardMap } from './components/Instrument/KeyboardMap'
import { VisualCanvas } from './components/Visual/VisualCanvas'
import { MiddleBarLooper } from './components/Looper/MiddleBarLooper'
import './index.css'

function App() {
  return (
    <MainLayout
      canvasContent={<VisualCanvas />}
      middleBarContent={<MiddleBarLooper />}
      bottomBarContent={<KeyboardMap />}
    />
  )
}

export default App
