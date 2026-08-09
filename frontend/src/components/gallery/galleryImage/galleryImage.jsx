import "./galleryImage.css";

function GalleryImage ({foto}){
    return(
        <div className="gallery-image">
            <img
                src={foto.imagen}
                alt={foto.nombre}
                loading="lazy"
                decoding="async"
            />
        </div>
    );
}

export default GalleryImage;
