import SessionHeader from "../../components/sessionHeader/SessionHeader";

function Admin() {
    return (
        <div>
            <SessionHeader title="Panel administrativo" />

            <main
                style={{
                    padding: "32px"
                }}
            >
                <h2>Bienvenido al panel administrativo</h2>

                <p>
                    Desde aquí se administrarán las
                    sucursales, productos, reservas,
                    ventas, inventario y reportes.
                </p>
            </main>
        </div>
    );
}

export default Admin;