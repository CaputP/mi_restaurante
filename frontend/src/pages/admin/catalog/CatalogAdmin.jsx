import {
    useState
} from "react";

import {
    FaFolderOpen,
    FaUtensils
} from "react-icons/fa";

import CategoriesAdmin from "./CategoriesAdmin";
import ProductsAdmin from "./ProductsAdmin";

import "./catalogAdmin.css";

function CatalogAdmin() {
    const [
        activeTab,
        setActiveTab
    ] = useState("PRODUCTOS");

    const [
        headerAction,
        setHeaderAction
    ] = useState(null);

    const ActionIcon =
        headerAction?.icon;

    return (
        <section className="catalog-admin admin-page">

            <header className="catalog-heading admin-page-header">
                <div>
                    <span className="admin-eyebrow">
                        CATÁLOGO
                    </span>

                    <h2>
                        Productos y categorías
                    </h2>

                    <p>
                        Administra platos,
                        bebidas, insumos y categorías
                        disponibles en el restaurante.
                    </p>
                </div>

                {headerAction?.onClick && (
                    <button
                        type="button"
                        className="catalog-primary-button"
                        disabled={
                            headerAction.disabled
                        }
                        onClick={
                            headerAction.onClick
                        }
                    >
                        {ActionIcon && (
                            <ActionIcon />
                        )}

                        <span>
                            {headerAction.label}
                        </span>
                    </button>
                )}
            </header>

            <nav
                className="catalog-tabs admin-tabs"
                role="tablist"
                aria-label="Secciones del catálogo"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={
                        activeTab ===
                        "PRODUCTOS"
                    }
                    className={
                        activeTab ===
                        "PRODUCTOS"
                            ? "admin-tab active"
                            : "admin-tab"
                    }
                    onClick={() =>
                        setActiveTab(
                            "PRODUCTOS"
                        )
                    }
                >
                    <FaUtensils />
                    Productos
                </button>

                <button
                    type="button"
                    role="tab"
                    aria-selected={
                        activeTab ===
                        "CATEGORIAS"
                    }
                    className={
                        activeTab ===
                        "CATEGORIAS"
                            ? "admin-tab active"
                            : "admin-tab"
                    }
                    onClick={() =>
                        setActiveTab(
                            "CATEGORIAS"
                        )
                    }
                >
                    <FaFolderOpen />
                    Categorías
                </button>
            </nav>

            {activeTab ===
            "PRODUCTOS" ? (
                <ProductsAdmin
                    setHeaderAction={
                        setHeaderAction
                    }
                />
            ) : (
                <CategoriesAdmin
                    setHeaderAction={
                        setHeaderAction
                    }
                />
            )}

        </section>
    );
}

export default CatalogAdmin;