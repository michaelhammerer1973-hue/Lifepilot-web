import { Link } from 'react-router-dom'
import logo from '../assets/Logo_LifePilot-solo.png'

export default function AppHeader() {
  return (
    <div className="header">
      <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <img src={logo} alt="LifePilot" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'contain', objectPosition: 'center', cursor: 'pointer' }} />
        <div>
          <h1 style={{ fontSize: '24px', margin: '0' }}>Deine Reisen</h1>
        </div>
      </Link>
    </div>
  )
}
