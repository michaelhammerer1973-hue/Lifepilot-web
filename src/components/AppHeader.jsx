import { Link } from 'react-router-dom'
import BurgerMenu from './BurgerMenu'
import logo from '../assets/Logo_LifePilot-solo.png'

export default function AppHeader({ homeLink = '/trips' }) {
  return (
    <div className="header">
      <Link to={homeLink} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <img src={logo} alt="LifePilot" style={{ width: '96px', height: '96px', borderRadius: '8px', objectFit: 'cover', objectPosition: 'center', cursor: 'pointer', flexShrink: 0 }} />
        <div>
          <h1 style={{ fontSize: '24px', margin: '0' }}>Deine Reisen</h1>
        </div>
      </Link>
      <div style={{ flex: 1 }} />
      <BurgerMenu />
    </div>
  )
}
