import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import SignIn from './auth/login/signIn/signIn'


function App() {
  return (
    <BrowserRouter>
      <nav style={{padding:16, display:'flex', gap:12}}>
        <Link to="/login">.</Link>
      </nav>
      <Routes>
       
        <Route path="/login" element={<SignIn />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
