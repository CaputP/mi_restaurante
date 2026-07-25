import "./galleryImage.css";

function GalleryImage ({foto}){
    return(
        <div className="gallery-image">
            <img src={foto.imagen} alt={foto.nombre} />
        </div>
    );
}

export default GalleryImage;    