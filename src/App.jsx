//==================================
// IMPORTAMOS HOME
//==================================
import {BrowserRouter, Routes, Route} from "react-router-dom"
import Home from "./pages/home"
import Login from "./pages/login"
import Register from "./pages/register"
import Reservations from "./pages/reservations"
import Admin from "./pages/admin"

//==================================
// COMPONENTE PRINCIPAL
//==================================

function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;