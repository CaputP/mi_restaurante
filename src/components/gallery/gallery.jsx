// =====================
// IMPORTAMOS EL CSS
//======================

import "./gallery.css";
import galleryImages from "../../data/galleryImages";
import GalleryImage from "./galleryImage/galleryImage";

// =====================
// COMPONENTE GALLERY
//======================    
function Gallery({titulo}){
    return(
        <section id="galeria" className="gallery">
            <div className="gallery-container">
                <h2>
                    {titulo}
                </h2>
                <div className="gallery-grid">
                    {
                        galleryImages.map((foto) => (
                            <GalleryImage
                                key={foto.id}
                                foto={foto}
                            />
                        ))
                    }
                </div>

            </div>
        </section>
    )
}



export default Gallery;