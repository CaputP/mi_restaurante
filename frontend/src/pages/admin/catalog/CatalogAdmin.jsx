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
        <section className="catalog-admin">
            <div
                className="catalog-tabs"
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
                            ? "active"
                            : ""
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
                            ? "active"
                            : ""
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