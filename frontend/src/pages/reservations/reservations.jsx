import SessionHeader from "../../components/sessionHeader/SessionHeader";
import ClientNav from "../../components/clientNav/ClientNav";



function Reservations() {
    return (
        <div>
            <SessionHeader title="Mis reservas" />
            <ClientNav />

            <main
                style={{
                    padding: "32px"
                }}
            >
                <h2>Gestión de reservas</h2>

                <p>
                    Aquí el cliente podrá registrar,
                    consultar y cancelar sus reservas.
                </p>
            </main>
        </div>
    );
}

export default Reservations;