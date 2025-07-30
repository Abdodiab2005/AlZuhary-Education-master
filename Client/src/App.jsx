import { Route, Routes } from 'react-router-dom'
import './App.css'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Error from './pages/Error'
import Index from './pages/Index'

function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<Login />} />
        <Route path='/login' element={<Login />} />
        <Route path='/signup' element={<Signup />} />
        <Route path='/index' element={<Index />} />
        <Route path='*' element={<Error />} />
      </Routes>
    </>
  )
}

export default App
