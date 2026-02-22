import { MainLayout } from './components/Layout/MainLayout'
import { KeyboardMap } from './components/Instrument/KeyboardMap'
import { VisualCanvas } from './components/Visual/VisualCanvas'
import './App.css'

function App() {
  return (
    <MainLayout
      canvasContent={<VisualCanvas />}
      bottomBarContent={<KeyboardMap />}
    />
  )
}

export default App
