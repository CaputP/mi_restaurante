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
    const [activeTab, setActiveTab] =
        useState("PRODUCTOS");

    return (
        <section className="catalog-admin admin-page">
            <div
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
                    <span>Productos</span>
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
                    <span>Categorías</span>
                </button>
            </div>

            {activeTab === "PRODUCTOS"
                ? <ProductsAdmin />
                : <CategoriesAdmin />}
        </section>
    );
}

export default CatalogAdmin;
