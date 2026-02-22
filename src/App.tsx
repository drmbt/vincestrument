import { MainLayout } from './components/Layout/MainLayout'
import { KeyboardMap } from './components/Instrument/KeyboardMap'
import './App.css'

function App() {
  return (
    <MainLayout
      bottomBarContent={<KeyboardMap />}
    />
  )
}

export default App
