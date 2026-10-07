import { AppProvider, useApp } from './lib/state'
import Splash from './screens/Splash'
import Profiles from './screens/Profiles'
import Home from './screens/Home'
import Session from './screens/Session'
import Album from './screens/Album'
import ParentGate from './screens/ParentGate'
import Parent from './screens/Parent'
import Learn from './screens/Learn'

function Router() {
  const { screen, profile } = useApp()
  switch (screen.name) {
    case 'splash': return <Splash />
    case 'profiles': return <Profiles />
    case 'home': return profile ? <Home /> : <Profiles />
    case 'session': return profile ? <Session key={Date.now()} game={screen.game} learn={screen.learn} /> : <Profiles />
    case 'learn': return profile ? <Learn /> : <Profiles />
    case 'album': return profile ? <Album /> : <Profiles />
    case 'gate': return <ParentGate />
    case 'parent': return <Parent />
  }
}

export default function App() {
  return <AppProvider><Router /></AppProvider>
}
