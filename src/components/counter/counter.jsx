import { useState } from "react";

function Counter(){
    const[contador, setContador] = useState(0);
    return (
        <div>
            <h2>contador:{contador}</h2>
            <button onClick={()=> setContador(contador+1)}>
                Aumentar
            </button>
        </div>
    )
}

export default Counter;