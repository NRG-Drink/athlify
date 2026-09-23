'use client'

import { Link, Route, Routes } from 'react-router-dom'
import App from './App'
import BodyStats from './app/BodyStats'
import ColorModeToggle from './components/DarkModeToggle'
import { Provider } from './components/ui/provider'
import LanguageSwitcher from './components/LanguageSwitcher'

function MyApp() {
  console.log('Rendering MyApp component')
  return (
    <>
      <Provider>
        <ColorModeToggle />
        <LanguageSwitcher />
        <nav>
          <Link to="/">Home</Link>
          <Link to="/bodystats">Body Stats</Link>
        </nav>

        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/bodystats" element={<BodyStats />} />
        </Routes>
      </Provider>
    </>
  )
}

export default MyApp
