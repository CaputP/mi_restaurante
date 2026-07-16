//==================================
// IMPORTAMOS LOS COMPONENTES
//==================================

import Navbar from "../components/navbar/navbar"
import Hero from "../components/hero/hero"
import FeaturedDishes from "../components/featuredDishes/featuredDishes";
import Parallax from "../components/parallax/parallax"
import About from "../components/about/about"
import Gallery from "../components/gallery/gallery"
import Testimonials from "../components/testimonials/testimonials";
import Events from "../components/events/events";
import Location from "../components/location/location";
import Footer from "../components/footer/footer";

function Home(){
    return(
        <>
            <Navbar 
                titulo="El Vallecito de Chocco"
            />
            <Hero 
                titulo="EL VALLECITO DE CHOCCO"
                subtitulo="Sabores tradicionales del cusco en un ambiente campestre"
            />
            <FeaturedDishes
                titulo="Platos Destacados"
            />
            <Parallax/> 
            <About
                titulo="Nuestra Historia"
            />
            <Gallery
                titulo="Galeria"
            />
            <Testimonials
                titulo="Testimonios"
            />
            <Events
                titulo="Eventos disponibles"
            />
            <Location
                titulo="Ubicación"
            />
            <Footer
            />
        </>
    )
};

export default Home;